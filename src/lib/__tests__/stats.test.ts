import { describe, expect, jest, test } from '@jest/globals';
jest.mock('../firebase', () => ({ db: {} }));
import { normaliseStats } from '../use-stats';

describe('normaliseStats', () => {
  const now = new Date(2026, 10, 19);

  test('missing document reads as zeros for the current period', () => {
    const s = normaliseStats(undefined, now);
    expect(s.totals.distanceM).toBe(0);
    expect(s.week.key).toBe('2026-W47');
    expect(s.month.key).toBe('2026-11');
  });

  test('last week counters are not shown this week', () => {
    const s = normaliseStats(
      {
        totals: { distanceM: 50000, movingTimeS: 15000, count: 9 },
        week: { key: '2026-W46', distanceM: 12000, count: 3 },
        month: { key: '2026-11', distanceM: 30000, count: 6 },
      },
      now,
    );
    expect(s.week.distanceM).toBe(0);
    expect(s.month.distanceM).toBe(30000);
    expect(s.totals.count).toBe(9);
    expect(s.bySport.run.distanceM).toBe(0);
  });
});
