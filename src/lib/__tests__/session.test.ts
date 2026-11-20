import { describe, expect, test } from '@jest/globals';

import { initialSession, liveMetrics, movingTimeS, sessionReducer, type SessionAction, type SessionState } from '../tracking/session';

const run = (actions: SessionAction[], s: SessionState = initialSession) => actions.reduce(sessionReducer, s);
const fix = (i: number, t: number, extra = {}) => ({ type: 'fix' as const, fix: { lat: i * 0.00003, lng: 0, alt: null, acc: 5, t, ...extra } });

describe('tracker session', () => {
  test('start, pause, resume and finish keep moving time right', () => {
    let s = run([{ type: 'prepare', sport: 'run', weightKg: 70 }, { type: 'start', now: 0 }]);
    expect(s.status).toBe('running');
    s = run([{ type: 'pause', now: 60_000 }], s);
    expect(movingTimeS(s, 120_000)).toBe(60);
    s = run([{ type: 'resume', now: 120_000 }, { type: 'finish', now: 150_000 }], s);
    expect(s.status).toBe('finished');
    expect(movingTimeS(s, 999_999)).toBe(90);
    const m = liveMetrics(s, 999_999);
    expect(m.elapsedTimeS).toBe(150);
  });

  test('distance only grows while running and never across a pause', () => {
    let s = run([{ type: 'prepare', sport: 'run', weightKg: null }]);
    s = run([fix(0, 0), fix(1, 1000)], s); // ready: ignored
    expect(s.points).toHaveLength(0);
    s = run([{ type: 'start', now: 0 }, fix(0, 0), fix(1, 1000), fix(2, 2000)], s);
    expect(s.distanceM).toBeCloseTo(6.67, 1);
    s = run([{ type: 'pause', now: 2500 }, fix(50, 3000), { type: 'resume', now: 10_000 }, fix(100, 11_000), fix(101, 12_000)], s);
    // the jump from point 2 to 100 while paused adds nothing
    expect(s.distanceM).toBeCloseTo(10, 0);
    expect(s.points.map((p) => p.seg)).toEqual([0, 0, 0, 1, 1]);
  });

  test('bad fixes are counted but not used', () => {
    const s = run([{ type: 'prepare', sport: 'walk', weightKg: null }, { type: 'start', now: 0 }, fix(0, 0), fix(1, 1000, { acc: 80 })]);
    expect(s.points).toHaveLength(1);
    expect(s.rejected).toBe(1);
    expect(s.lastFix?.acc).toBe(80);
  });

  test('restoring a running session comes back paused', () => {
    const s = run([{ type: 'prepare', sport: 'run', weightKg: null }, { type: 'start', now: 0 }, fix(0, 0), fix(1, 10_000)]);
    const r = sessionReducer(initialSession, { type: 'restore', state: s, now: 500_000 });
    expect(r.status).toBe('paused');
    expect(movingTimeS(r, 600_000)).toBe(10);
  });

  test('prepare does not wipe an activity in progress', () => {
    const s = run([{ type: 'prepare', sport: 'run', weightKg: null }, { type: 'start', now: 0 }]);
    expect(sessionReducer(s, { type: 'prepare', sport: 'walk', weightKg: null }).status).toBe('running');
  });
});
