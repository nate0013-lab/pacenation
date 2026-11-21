/**
 * One pass over the activity history gives stats, XP, level, badges,
 * personal records, streaks and the charts for the dashboard and profile.
 */
import { isoWeekKey, monthKey } from '../format';
import { EMPTY_TOTALS, type Sport, type UserStats } from '../types';
import { BADGES, TIER_XP, isEarned, type BadgeState, type Tally } from './badges';
import { EFFORT_LABEL, SPORT_EFFORTS, type BestEfforts, type EffortKey } from './best-efforts';
import { levelForXp, xpForActivity } from './xp';

export interface ProgressActivity {
  id: string;
  sport: Sport;
  title: string;
  distanceM: number;
  movingTimeS: number;
  elevationGainM: number | null;
  startedAt: { toMillis(): number };
  bestEfforts?: BestEfforts | null;
}

export interface PersonalRecord {
  key: string;
  sport: Sport;
  label: string;
  kind: 'time' | 'distance' | 'climb';
  value: number;
  activityId: string;
  activityTitle: string;
  at: number;
}

export interface DayBar {
  key: string;
  label: string;
  distanceM: number;
  isToday: boolean;
}

export interface Progress {
  stats: UserStats;
  xp: number;
  activityXp: number;
  badgeXp: number;
  level: number;
  badges: BadgeState[];
  earned: BadgeState[];
  records: PersonalRecord[];
  currentStreak: number;
  bestStreak: number;
  last7Days: DayBar[];
  /** Distance per ISO week, oldest first, for the last 8 weeks. */
  last8Weeks: { key: string; label: string; distanceM: number }[];
}

export function dayKey(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function addDays(d: Date, n: number): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() + n);
  return x;
}

const DAY_LETTER = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function computeProgress(list: ProgressActivity[], now: Date = new Date()): Progress {
  const acts = [...list].sort((a, b) => a.startedAt.toMillis() - b.startedAt.toMillis());
  const stats: UserStats = {
    totals: { ...EMPTY_TOTALS },
    bySport: { walk: { ...EMPTY_TOTALS }, run: { ...EMPTY_TOTALS }, ride: { ...EMPTY_TOTALS } },
    week: { key: isoWeekKey(now), distanceM: 0, count: 0 },
    month: { key: monthKey(now), distanceM: 0, count: 0 },
  };
  const tally: Tally = {
    count: 0, distanceM: 0, climbM: 0, sports: new Set(), bestStreak: 0,
    last: { sport: 'walk', distanceM: 0, climbM: 0, hour: 12 },
    longest: { walk: 0, run: 0, ride: 0 }, biggestClimb: 0, early: 0, late: 0,
  };
  const badgeState = new Map<string, { earnedAt: number; activityId: string }>();
  const days = new Map<string, number>();
  const records = new Map<string, PersonalRecord>();
  let activityXp = 0;
  let runStreak = 0;
  let prevDay: string | null = null;

  const consider = (r: PersonalRecord, better: (a: number, b: number) => boolean) => {
    const cur = records.get(r.key);
    if (!cur || better(r.value, cur.value)) records.set(r.key, r);
  };

  for (const a of acts) {
    const ms = a.startedAt.toMillis();
    const started = new Date(ms);
    const climb = Math.max(0, a.elevationGainM ?? 0);
    activityXp += xpForActivity(a);

    stats.totals.distanceM += a.distanceM;
    stats.totals.movingTimeS += a.movingTimeS;
    stats.totals.count += 1;
    const sp = stats.bySport[a.sport];
    sp.distanceM += a.distanceM;
    sp.movingTimeS += a.movingTimeS;
    sp.count += 1;
    if (isoWeekKey(started) === stats.week.key) {
      stats.week.distanceM += a.distanceM;
      stats.week.count += 1;
    }
    if (monthKey(started) === stats.month.key) {
      stats.month.distanceM += a.distanceM;
      stats.month.count += 1;
    }

    // Streaks by calendar day.
    const dk = dayKey(ms);
    days.set(dk, (days.get(dk) ?? 0) + a.distanceM);
    if (dk !== prevDay) {
      runStreak = prevDay !== null && dayKey(addDays(started, -1).getTime()) === prevDay ? runStreak + 1 : 1;
      prevDay = dk;
    }

    tally.count += 1;
    tally.distanceM += a.distanceM;
    tally.climbM += climb;
    tally.sports.add(a.sport);
    tally.bestStreak = Math.max(tally.bestStreak, runStreak);
    tally.longest[a.sport] = Math.max(tally.longest[a.sport], a.distanceM);
    tally.biggestClimb = Math.max(tally.biggestClimb, climb);
    const hour = started.getHours();
    if (hour < 7) tally.early += 1;
    if (hour >= 21) tally.late += 1;
    tally.last = { sport: a.sport, distanceM: a.distanceM, climbM: climb, hour };

    for (const b of BADGES) {
      if (!badgeState.has(b.id) && isEarned(b, tally)) badgeState.set(b.id, { earnedAt: ms, activityId: a.id });
    }

    // Personal records.
    const base = { sport: a.sport, activityId: a.id, activityTitle: a.title, at: ms };
    if (a.distanceM > 0) {
      consider({ ...base, key: `${a.sport}-longest`, label: `Longest ${a.sport}`, kind: 'distance', value: a.distanceM }, (x, y) => x > y);
    }
    if (climb > 0) consider({ ...base, key: 'climb', label: 'Biggest climb', kind: 'climb', value: climb }, (x, y) => x > y);
    for (const k of SPORT_EFFORTS[a.sport]) {
      const s = a.bestEfforts?.[k as EffortKey];
      if (typeof s === 'number' && s > 0) {
        consider({ ...base, key: `${a.sport}-${k}`, label: `${EFFORT_LABEL[k]}`, kind: 'time', value: s }, (x, y) => x < y);
      }
    }
  }

  // Current streak: counts back from today, or from yesterday if today is still empty.
  let currentStreak = 0;
  let cursor = days.has(dayKey(now.getTime())) ? new Date(now) : addDays(now, -1);
  while (days.has(dayKey(cursor.getTime()))) {
    currentStreak++;
    cursor = addDays(cursor, -1);
  }

  const badges: BadgeState[] = BADGES.map((b) => {
    const p = b.progress(tally);
    const got = badgeState.get(b.id);
    return {
      badge: b,
      earnedAt: got?.earnedAt ?? null,
      activityId: got?.activityId ?? null,
      current: p.current,
      target: p.target,
      ratio: Math.max(0, Math.min(1, p.target ? p.current / p.target : 0)),
    };
  });
  const earned = badges.filter((b) => b.earnedAt !== null).sort((a, b) => b.earnedAt! - a.earnedAt!);
  const badgeXp = earned.reduce((s, b) => s + TIER_XP[b.badge.tier], 0);
  const xp = activityXp + badgeXp;

  const last7Days: DayBar[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = addDays(now, -i);
    const k = dayKey(d.getTime());
    last7Days.push({ key: k, label: DAY_LETTER[d.getDay()], distanceM: days.get(k) ?? 0, isToday: i === 0 });
  }

  const weekTotals = new Map<string, number>();
  for (const a of acts) {
    const k = isoWeekKey(new Date(a.startedAt.toMillis()));
    weekTotals.set(k, (weekTotals.get(k) ?? 0) + a.distanceM);
  }
  const last8Weeks = [];
  for (let i = 7; i >= 0; i--) {
    const d = addDays(now, -7 * i);
    const k = isoWeekKey(d);
    const monday = addDays(d, -((d.getDay() + 6) % 7));
    last8Weeks.push({ key: k, label: `${monday.getDate()} ${MONTH_SHORT[monday.getMonth()]}`, distanceM: weekTotals.get(k) ?? 0 });
  }

  const order = ['run-1k', 'run-5k', 'run-10k', 'run-half', 'run-marathon', 'run-longest', 'walk-1k', 'walk-5k', 'walk-10k', 'walk-longest', 'ride-10k', 'ride-20k', 'ride-40k', 'ride-100k', 'ride-longest', 'climb'];
  const recs = [...records.values()].sort((a, b) => order.indexOf(a.key) - order.indexOf(b.key));

  return {
    stats, xp, activityXp, badgeXp, level: levelForXp(xp).level, badges, earned, records: recs,
    currentStreak, bestStreak: tally.bestStreak, last7Days, last8Weeks,
  };
}

/** Badges unlocked by one activity: those earned with it that were not earned without it. */
export function badgesUnlockedBy(list: ProgressActivity[], activityId: string): BadgeState[] {
  return computeProgress(list).earned.filter((b) => b.activityId === activityId);
}

/** Rebuilds records from someone's public summary (no activity links). */
export function recordsFromSummary(records: Record<string, number> | undefined): PersonalRecord[] {
  if (!records) return [];
  const order = ['run-1k', 'run-5k', 'run-10k', 'run-half', 'run-marathon', 'run-longest', 'walk-1k', 'walk-5k', 'walk-10k', 'walk-longest', 'ride-10k', 'ride-20k', 'ride-40k', 'ride-100k', 'ride-longest', 'climb'];
  const out: PersonalRecord[] = [];
  for (const [key, value] of Object.entries(records)) {
    if (!order.includes(key) || typeof value !== 'number') continue;
    const base = { key, value, activityId: '', activityTitle: '', at: 0 };
    if (key === 'climb') out.push({ ...base, sport: 'ride', label: 'Biggest climb', kind: 'climb' });
    else {
      const [sport, what] = key.split('-') as [Sport, string];
      if (what === 'longest') out.push({ ...base, sport, label: `Longest ${sport}`, kind: 'distance' });
      else out.push({ ...base, sport, label: EFFORT_LABEL[what as EffortKey], kind: 'time' });
    }
  }
  return out.sort((a, b) => order.indexOf(a.key) - order.indexOf(b.key));
}

/** Badge states from someone's public summary. */
export function badgesFromSummary(badges: Record<string, number> | undefined): BadgeState[] {
  if (!badges) return [];
  return BADGES.filter((b) => typeof badges[b.id] === 'number')
    .map((b) => ({ badge: b, earnedAt: badges[b.id], activityId: null, current: 1, target: 1, ratio: 1 }))
    .sort((a, b) => b.earnedAt! - a.earnedAt!);
}
