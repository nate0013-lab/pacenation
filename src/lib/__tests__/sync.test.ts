import { describe, expect, jest, test } from '@jest/globals';
jest.mock('../firebase', () => ({ db: {} }));
import { computeProgress, type ProgressActivity } from '../progress/summary';
import { summaryDoc } from '../progress/sync';

const at = (d: Date) => ({ toMillis: () => d.getTime() });
const a = (id: string, km: number, vis: string): ProgressActivity & { visibility: string } => ({
  id, sport: 'run', title: id, distanceM: km * 1000, movingTimeS: km * 300, elevationGainM: null, startedAt: at(new Date(2026, 10, 18)), visibility: vis,
});

describe('summaryDoc', () => {
  test('private activities stay out of shared totals and records but count for XP', () => {
    const list = [a('pub', 5, 'public'), a('secret', 12, 'private')];
    const all = computeProgress(list, new Date(2026, 10, 20));
    const shared = computeProgress(list.filter((x) => x.visibility !== 'private'), new Date(2026, 10, 20));
    const s = summaryDoc(all, shared);
    expect(s.totals.distanceM).toBe(5000);
    expect(s.totals.count).toBe(1);
    expect(s.records['run-longest']).toBe(5000);
    expect(s.xp).toBe(all.xp);
    expect(s.badges['run-10k']).toBeDefined();
  });
});
