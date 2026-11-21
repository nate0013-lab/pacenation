import { describe, expect, test } from '@jest/globals';

import { bestEfforts, bestTimeFor } from '../progress/best-efforts';
import { computeProgress, type ProgressActivity } from '../progress/summary';
import { levelForXp, levelTitle, xpForActivity, xpToReach } from '../progress/xp';
import type { TrackPoint } from '../tracking/geo';

const ts = (d: Date) => ({ toMillis: () => d.getTime() });
let n = 0;
function act(sport: ProgressActivity['sport'], km: number, when: Date, extra: Partial<ProgressActivity> = {}): ProgressActivity {
  return { id: `a${++n}`, sport, title: `${sport} ${km}`, distanceM: km * 1000, movingTimeS: km * 300, elevationGainM: null, startedAt: ts(when), ...extra };
}

describe('xp and levels', () => {
  test('xp per activity', () => {
    expect(xpForActivity({ sport: 'run', distanceM: 5000 })).toBe(175);
    expect(xpForActivity({ sport: 'ride', distanceM: 20000, elevationGainM: 205 })).toBe(25 + 200 + 20);
    expect(xpForActivity({ sport: 'walk', distanceM: 0 })).toBe(25);
  });

  test('level thresholds match the rules formula', () => {
    expect([1, 2, 3, 4, 10].map(xpToReach)).toEqual([0, 500, 1250, 2250, 13500]);
    for (let xp = 0; xp < 40000; xp += 37) {
      const { level } = levelForXp(xp);
      expect(xpToReach(level) <= xp && xp < xpToReach(level + 1)).toBe(true);
    }
    expect(levelTitle(1)).toBe('Trailhead');
    expect(levelTitle(9)).toBe('Summit Seeker');
  });
});

describe('best efforts', () => {
  test('finds the fastest window and interpolates', () => {
    // 0-1000 m in 400 s, then 1000-2000 m in 300 s.
    const d = [0, 500, 1000, 1500, 2000];
    const t = [0, 200, 400, 550, 700];
    expect(bestTimeFor(d, t, 1000)).toBe(300);
    expect(bestTimeFor(d, t, 2000)).toBe(700);
    expect(bestTimeFor(d, t, 2500)).toBeNull();
  });

  test('from a route, ignoring time spent paused', () => {
    // Straight north, ~111 m per 0.001 deg, 30 s per point, with a 10 minute pause in the middle.
    const pts: TrackPoint[] = [];
    let t = 0;
    for (let i = 0; i <= 20; i++) {
      if (i === 10) t += 600_000;
      pts.push({ lat: 46 + i * 0.001, lng: 6, alt: null, t, acc: 5, seg: i < 10 ? 0 : 1 });
      t += 30_000;
    }
    const e = bestEfforts(pts, 'run');
    // 18 moving steps of 111 m; 1 km takes about 9 steps of 30 s, with no pause counted.
    expect(e['1k']).toBeGreaterThan(260);
    expect(e['1k']).toBeLessThan(280);
    expect(e['5k']).toBeUndefined();
  });
});

describe('progress', () => {
  const now = new Date(2026, 10, 20, 18, 0);

  test('empty history', () => {
    const p = computeProgress([], now);
    expect(p.xp).toBe(0);
    expect(p.level).toBe(1);
    expect(p.earned).toHaveLength(0);
    expect(p.last7Days).toHaveLength(7);
    expect(p.last7Days[6].isToday).toBe(true);
    expect(p.currentStreak).toBe(0);
  });

  test('badges, streaks, records and xp', () => {
    const list = [
      act('walk', 3, new Date(2026, 10, 17, 6, 30)),
      act('run', 5.2, new Date(2026, 10, 18, 18, 0), { bestEfforts: { '1k': 280, '5k': 1490 } }),
      act('ride', 22, new Date(2026, 10, 19, 22, 0), { elevationGainM: 310 }),
      act('run', 10.1, new Date(2026, 10, 20, 7, 30), { bestEfforts: { '1k': 270, '5k': 1520, '10k': 3100 } }),
    ];
    const p = computeProgress(list, now);
    const ids = p.earned.map((b) => b.badge.id).sort();
    expect(ids).toEqual(['all-rounder', 'early-riser', 'first-steps', 'night-owl', 'run-10k', 'run-5k', 'streak-3'].sort());
    expect(p.badges.find((b) => b.badge.id === 'first-steps')!.activityId).toBe(list[0].id);
    expect(p.badges.find((b) => b.badge.id === 'run-5k')!.activityId).toBe(list[1].id);
    expect(p.badges.find((b) => b.badge.id === 'total-50')!.ratio).toBeCloseTo(40.3 / 50);
    expect(p.currentStreak).toBe(4);
    expect(p.bestStreak).toBe(4);
    const rec = Object.fromEntries(p.records.map((r) => [r.key, r.value]));
    expect(rec['run-1k']).toBe(270);
    expect(rec['run-5k']).toBe(1490);
    expect(rec['run-10k']).toBe(3100);
    expect(rec['ride-longest']).toBe(22000);
    expect(rec['climb']).toBe(310);
    const activityXp = list.reduce((s, a) => s + xpForActivity(a), 0);
    expect(p.activityXp).toBe(activityXp);
    // all-rounder and run-10k are silver (250), the other five bronze (100).
    expect(p.badgeXp).toBe(2 * 250 + 5 * 100);
    expect(p.xp).toBe(activityXp + p.badgeXp);
    expect(p.level).toBe(levelForXp(p.xp).level);
    expect(p.stats.week.count).toBe(4);
    expect(p.last7Days.slice(3).map((d) => d.distanceM)).toEqual([3000, 5200, 22000, 10100]);
  });

  test('a streak broken for two days ends', () => {
    const p = computeProgress([act('run', 5, new Date(2026, 10, 17)), act('run', 5, new Date(2026, 10, 18))], now);
    expect(p.currentStreak).toBe(0);
    expect(p.bestStreak).toBe(2);
  });

  test('yesterday keeps the streak alive until today ends', () => {
    const p = computeProgress([act('run', 5, new Date(2026, 10, 18)), act('run', 5, new Date(2026, 10, 19))], now);
    expect(p.currentStreak).toBe(2);
  });
});

