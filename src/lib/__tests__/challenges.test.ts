import { describe, expect, test } from '@jest/globals';

import { challengeById, challengeFor, currentChallenges, formatGoal, progressFor, TEMPLATES } from '../challenges/catalogue';

const at = (d: Date) => ({ toMillis: () => d.getTime() });

describe('challenge catalogue', () => {
  const now = new Date(2026, 10, 20, 12); // Friday 20 Nov 2026, ISO week 47

  test('ids carry the period and round-trip', () => {
    const list = currentChallenges(now);
    expect(list.find((c) => c.key === 'run-25')!.id).toBe('run-25-2026-W47');
    expect(list.find((c) => c.key === 'run-100')!.id).toBe('run-100-2026-11');
    for (const c of list) expect(challengeById(c.id)).toEqual(c);
    expect(challengeById('run-25-2026-11')).toBeNull();
    expect(challengeById('nope-2026-W47')).toBeNull();
    expect(challengeById('run-25-2027-W01')!.startsAt).toBe(new Date(2027, 0, 4).getTime());
  });

  test('week runs Monday to Monday', () => {
    const c = challengeFor(TEMPLATES[0], now);
    expect(new Date(c.startsAt)).toEqual(new Date(2026, 10, 16));
    expect(new Date(c.endsAt)).toEqual(new Date(2026, 10, 23));
  });

  test('progress counts only the right sport inside the window', () => {
    const c = challengeFor(TEMPLATES.find((t) => t.key === 'run-25')!, now);
    const acts = [
      { sport: 'run' as const, distanceM: 12000, elevationGainM: 50, startedAt: at(new Date(2026, 10, 17, 7)) },
      { sport: 'walk' as const, distanceM: 9000, elevationGainM: 10, startedAt: at(new Date(2026, 10, 18, 7)) },
      { sport: 'run' as const, distanceM: 14000, elevationGainM: 80, startedAt: at(new Date(2026, 10, 19, 7)) },
      { sport: 'run' as const, distanceM: 30000, elevationGainM: 80, startedAt: at(new Date(2026, 10, 14, 7)) },
    ];
    expect(progressFor(c, acts)).toEqual({ value: 26000, completedAt: new Date(2026, 10, 19, 7).getTime() });
    const count = challengeFor(TEMPLATES.find((t) => t.key === 'any-5x')!, now);
    expect(progressFor(count, acts)).toEqual({ value: 3, completedAt: null });
  });

  test('goal formatting', () => {
    expect(formatGoal({ metric: 'distance', goal: 25000 })).toBe('25 km');
    expect(formatGoal({ metric: 'distance', goal: 2_000_000 })).toBe('2,000 km');
    expect(formatGoal({ metric: 'count', goal: 5 })).toBe('5 activities');
    expect(formatGoal({ metric: 'climb', goal: 2000 })).toBe('2,000 m');
  });
});
