import { describe, expect, jest, test } from '@jest/globals';
jest.mock('../firebase', () => ({ db: {} }));
import { boardId, myBoardRows } from '../leaderboards-service';

const at = (d: Date) => ({ toMillis: () => d.getTime() });

describe('leaderboard rows', () => {
  const now = new Date(2026, 10, 20, 12);
  test('board ids', () => {
    expect(boardId('week', 'run', now)).toBe('week-2026-W47-run');
    expect(boardId('month', 'any', now)).toBe('month-2026-11-any');
    expect(boardId('all', 'ride', now)).toBe('all-time-ride');
  });
  test('each activity counts for its sport and for all sports, in every period it falls in', () => {
    const rows = myBoardRows(
      [
        { sport: 'run', distanceM: 5000, startedAt: at(new Date(2026, 10, 18)) },
        { sport: 'ride', distanceM: 30000, startedAt: at(new Date(2026, 10, 3)) },
        { sport: 'walk', distanceM: 4000, startedAt: at(new Date(2026, 9, 30)) },
      ],
      now,
    );
    const get = (b: string) => rows.find((r) => r.board === b)!;
    expect(rows).toHaveLength(12);
    expect(get('week-2026-W47-any')).toEqual({ board: 'week-2026-W47-any', distanceM: 5000, count: 1 });
    expect(get('month-2026-11-any').distanceM).toBe(35000);
    expect(get('month-2026-11-walk').distanceM).toBe(0);
    expect(get('all-time-any')).toEqual({ board: 'all-time-any', distanceM: 39000, count: 3 });
    expect(get('all-time-ride').distanceM).toBe(30000);
  });
});
