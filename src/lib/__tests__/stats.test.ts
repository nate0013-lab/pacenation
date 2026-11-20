import { describe, expect, jest, test } from '@jest/globals';
jest.mock('../firebase', () => ({ db: {} }));
jest.mock('@react-native-async-storage/async-storage', () => ({ getItem: jest.fn(), setItem: jest.fn(), removeItem: jest.fn() }));
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

import { Timestamp } from 'firebase/firestore';
import { computeStats } from '../use-stats';

describe('computeStats', () => {
  test('sums totals, sports, this week and this month', () => {
    const now = new Date(2026, 10, 19, 12);
    const at = (d: Date) => Timestamp.fromDate(d);
    const s = computeStats(
      [
        { sport: 'run', distanceM: 5000, movingTimeS: 1500, startedAt: at(new Date(2026, 10, 18)) },
        { sport: 'ride', distanceM: 20000, movingTimeS: 3600, startedAt: at(new Date(2026, 10, 3)) },
        { sport: 'walk', distanceM: 3000, movingTimeS: 2400, startedAt: at(new Date(2026, 9, 30)) },
      ],
      now,
    );
    expect(s.totals).toEqual({ distanceM: 28000, movingTimeS: 7500, count: 3 });
    expect(s.week).toEqual({ key: '2026-W47', distanceM: 5000, count: 1 });
    expect(s.month).toEqual({ key: '2026-11', distanceM: 25000, count: 2 });
    expect(s.bySport.ride.distanceM).toBe(20000);
  });
});
