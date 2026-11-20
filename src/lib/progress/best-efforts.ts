/** Fastest time over set distances inside one activity, from its GPS route. */
import type { Sport } from '../types';
import type { TrackPoint } from '../tracking/geo';
import { cumulative } from '../tracking/route-tools';

export type EffortKey = '1k' | '5k' | '10k' | 'half' | 'marathon' | '20k' | '40k' | '100k';

export const EFFORT_DISTANCE: Record<EffortKey, number> = {
  '1k': 1000,
  '5k': 5000,
  '10k': 10000,
  half: 21097.5,
  marathon: 42195,
  '20k': 20000,
  '40k': 40000,
  '100k': 100000,
};

export const EFFORT_LABEL: Record<EffortKey, string> = {
  '1k': '1 km',
  '5k': '5 km',
  '10k': '10 km',
  half: 'Half marathon',
  marathon: 'Marathon',
  '20k': '20 km',
  '40k': '40 km',
  '100k': '100 km',
};

export const SPORT_EFFORTS: Record<Sport, EffortKey[]> = {
  walk: ['1k', '5k', '10k'],
  run: ['1k', '5k', '10k', 'half', 'marathon'],
  ride: ['10k', '20k', '40k', '100k'],
};

export type BestEfforts = Partial<Record<EffortKey, number>>;

/** Shortest moving time (s) to cover `distance` anywhere in the route, or null if the route is shorter. */
export function bestTimeFor(d: number[], t: number[], distance: number): number | null {
  const n = d.length;
  if (n < 2 || d[n - 1] < distance) return null;
  let best = Infinity;
  let j = 0;
  for (let i = 0; i < n; i++) {
    const target = d[i] + distance;
    if (target > d[n - 1]) break;
    if (j < i) j = i;
    while (d[j] < target) j++;
    // Interpolate the time at exactly `target` between j-1 and j.
    const span = d[j] - d[j - 1];
    const frac = span > 0 ? (target - d[j - 1]) / span : 1;
    const tAt = t[j - 1] + frac * (t[j] - t[j - 1]);
    best = Math.min(best, tAt - t[i]);
  }
  return Number.isFinite(best) && best > 0 ? Math.round(best) : null;
}

export function bestEfforts(points: TrackPoint[], sport: Sport): BestEfforts {
  const { d, t } = cumulative(points);
  const out: BestEfforts = {};
  for (const key of SPORT_EFFORTS[sport]) {
    const s = bestTimeFor(d, t, EFFORT_DISTANCE[key]);
    if (s !== null) out[key] = s;
  }
  return out;
}
