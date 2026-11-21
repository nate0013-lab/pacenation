/**
 * Built-in challenges. They repeat every week or month, so nobody has to
 * create them by hand and the app needs no server. A challenge's id is its
 * template plus the period, such as `run-25-2026-W47` or `any-200-2026-11`.
 */
import { isoWeekKey, monthKey } from '../format';
import type { Sport } from '../types';

export type ChallengePeriod = 'weekly' | 'monthly';
export type ChallengeMetric = 'distance' | 'count' | 'climb';

export interface ChallengeTemplate {
  key: string;
  title: string;
  description: string;
  sport: Sport | 'any';
  kind: 'individual' | 'community';
  period: ChallengePeriod;
  metric: ChallengeMetric;
  /** Metres for distance and climb, activities for count. */
  goal: number;
}

export interface Challenge extends ChallengeTemplate {
  id: string;
  periodKey: string;
  startsAt: number;
  endsAt: number;
}

export const TEMPLATES: ChallengeTemplate[] = [
  { key: 'run-25', title: 'Run 25 km', description: 'Run 25 km before Sunday night. Any pace, any route.', sport: 'run', kind: 'individual', period: 'weekly', metric: 'distance', goal: 25_000 },
  { key: 'walk-30', title: 'Walk 30 km', description: 'Clock 30 km on foot this week, one stroll at a time.', sport: 'walk', kind: 'individual', period: 'weekly', metric: 'distance', goal: 30_000 },
  { key: 'ride-100', title: 'Ride 100 km', description: 'Put 100 km on the bike this week.', sport: 'ride', kind: 'individual', period: 'weekly', metric: 'distance', goal: 100_000 },
  { key: 'any-5x', title: 'Five-day mover', description: 'Save 5 activities this week, in any sport.', sport: 'any', kind: 'individual', period: 'weekly', metric: 'count', goal: 5 },
  { key: 'together-2000', title: 'Together 2,000 km', description: 'Everyone who joins adds to one shared total. Can the community reach 2,000 km this week?', sport: 'any', kind: 'community', period: 'weekly', metric: 'distance', goal: 2_000_000 },
  { key: 'run-100', title: 'Run 100 km', description: 'A big month: 100 km of running before the month ends.', sport: 'run', kind: 'individual', period: 'monthly', metric: 'distance', goal: 100_000 },
  { key: 'walk-120', title: 'Walk 120 km', description: 'Walk 120 km this month, about 4 km a day.', sport: 'walk', kind: 'individual', period: 'monthly', metric: 'distance', goal: 120_000 },
  { key: 'ride-400', title: 'Ride 400 km', description: 'Ride 400 km this month.', sport: 'ride', kind: 'individual', period: 'monthly', metric: 'distance', goal: 400_000 },
  { key: 'climb-2000', title: 'Climb 2,000 m', description: 'Gain 2,000 m of elevation this month, in any sport.', sport: 'any', kind: 'individual', period: 'monthly', metric: 'climb', goal: 2_000 },
  { key: 'together-10000', title: 'Together 10,000 km', description: 'One shared goal for the whole PaceNation community this month.', sport: 'any', kind: 'community', period: 'monthly', metric: 'distance', goal: 10_000_000 },
];

export function weekBounds(now: Date): { start: number; end: number } {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  const end = new Date(d);
  end.setDate(end.getDate() + 7);
  return { start: d.getTime(), end: end.getTime() };
}

export function monthBounds(now: Date): { start: number; end: number } {
  return { start: new Date(now.getFullYear(), now.getMonth(), 1).getTime(), end: new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime() };
}

export function challengeFor(t: ChallengeTemplate, now: Date = new Date()): Challenge {
  const periodKey = t.period === 'weekly' ? isoWeekKey(now) : monthKey(now);
  const b = t.period === 'weekly' ? weekBounds(now) : monthBounds(now);
  return { ...t, id: `${t.key}-${periodKey}`, periodKey, startsAt: b.start, endsAt: b.end };
}

export function currentChallenges(now: Date = new Date()): Challenge[] {
  return TEMPLATES.map((t) => challengeFor(t, now));
}

/** Rebuilds a challenge from its id, for links and past challenges. */
export function challengeById(id: string): Challenge | null {
  const m = /^([a-z0-9-]+?)-(\d{4})-(W(\d{2})|(\d{2}))$/.exec(id);
  if (!m) return null;
  const t = TEMPLATES.find((x) => x.key === m[1]);
  if (!t) return null;
  const year = Number(m[2]);
  let anchor: Date;
  if (m[4]) {
    if (t.period !== 'weekly') return null;
    // ISO week: the week with 4 January in it is week 1.
    const jan4 = new Date(year, 0, 4);
    const monday = new Date(year, 0, 4 - ((jan4.getDay() + 6) % 7));
    anchor = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + (Number(m[4]) - 1) * 7 + 3);
  } else {
    if (t.period !== 'monthly') return null;
    anchor = new Date(year, Number(m[5]) - 1, 15);
  }
  const c = challengeFor(t, anchor);
  return c.id === id ? c : null;
}

export interface ChallengeActivity {
  sport: Sport;
  distanceM: number;
  elevationGainM: number | null;
  startedAt: { toMillis(): number };
}

/** My progress in a challenge from my activities, and when I reached the goal. */
export function progressFor(c: Challenge, acts: ChallengeActivity[]): { value: number; completedAt: number | null } {
  const inWindow = acts
    .filter((a) => (c.sport === 'any' || a.sport === c.sport) && a.startedAt.toMillis() >= c.startsAt && a.startedAt.toMillis() < c.endsAt)
    .sort((a, b) => a.startedAt.toMillis() - b.startedAt.toMillis());
  let value = 0;
  let completedAt: number | null = null;
  for (const a of inWindow) {
    value += c.metric === 'distance' ? a.distanceM : c.metric === 'count' ? 1 : Math.max(0, a.elevationGainM ?? 0);
    if (completedAt === null && c.kind === 'individual' && value >= c.goal) completedAt = a.startedAt.toMillis();
  }
  return { value: Math.round(value), completedAt };
}

export function formatGoal(c: Pick<ChallengeTemplate, 'metric' | 'goal'>, value = c.goal): string {
  if (c.metric === 'count') return `${Math.floor(value)} ${Math.floor(value) === 1 ? 'activity' : 'activities'}`;
  if (c.metric === 'climb') return `${Math.round(value).toLocaleString('en')} m`;
  const km = value / 1000;
  return `${km >= 100 || Number.isInteger(km) ? Math.round(km).toLocaleString('en') : km.toFixed(1)} km`;
}
