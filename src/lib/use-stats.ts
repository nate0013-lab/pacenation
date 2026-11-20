import { useEffect, useState } from 'react';

import { watchMyActivities } from './activities-service';
import { isoWeekKey, monthKey } from './format';
import { EMPTY_TOTALS, type Activity, type UserStats } from './types';

export function emptyStats(now: Date = new Date()): UserStats {
  return {
    totals: { ...EMPTY_TOTALS },
    bySport: { walk: { ...EMPTY_TOTALS }, run: { ...EMPTY_TOTALS }, ride: { ...EMPTY_TOTALS } },
    week: { key: isoWeekKey(now), distanceM: 0, count: 0 },
    month: { key: monthKey(now), distanceM: 0, count: 0 },
  };
}

/**
 * Normalises a stats document: week and month counters from an earlier
 * period read as zero, so the dashboard never shows last week's distance.
 */
export function normaliseStats(raw: Partial<UserStats> | undefined, now: Date = new Date()): UserStats {
  const base = emptyStats(now);
  if (!raw) return base;
  return {
    totals: { ...base.totals, ...raw.totals },
    bySport: {
      walk: { ...EMPTY_TOTALS, ...raw.bySport?.walk },
      run: { ...EMPTY_TOTALS, ...raw.bySport?.run },
      ride: { ...EMPTY_TOTALS, ...raw.bySport?.ride },
    },
    week: raw.week?.key === base.week.key ? raw.week : base.week,
    month: raw.month?.key === base.month.key ? raw.month : base.month,
  };
}

/** Totals for the signed-in user, summed from their activities on the device. */
export function computeStats(list: Pick<Activity, 'sport' | 'distanceM' | 'movingTimeS' | 'startedAt'>[], now: Date = new Date()): UserStats {
  const s = emptyStats(now);
  for (const a of list) {
    const started = a.startedAt.toDate();
    s.totals.distanceM += a.distanceM;
    s.totals.movingTimeS += a.movingTimeS;
    s.totals.count += 1;
    const sp = s.bySport[a.sport];
    sp.distanceM += a.distanceM;
    sp.movingTimeS += a.movingTimeS;
    sp.count += 1;
    if (isoWeekKey(started) === s.week.key) {
      s.week.distanceM += a.distanceM;
      s.week.count += 1;
    }
    if (monthKey(started) === s.month.key) {
      s.month.distanceM += a.distanceM;
      s.month.count += 1;
    }
  }
  return s;
}

/** The signed-in user's activities (newest first) and their stats, kept live. */
export function useMyActivities(uid: string | undefined) {
  const [state, setState] = useState<{ activities: Activity[]; stats: UserStats; loading: boolean; error: boolean }>({
    activities: [],
    stats: emptyStats(),
    loading: true,
    error: false,
  });
  useEffect(() => {
    if (!uid) return;
    return watchMyActivities(
      uid,
      (activities) => setState({ activities, stats: computeStats(activities), loading: false, error: false }),
      () => setState((s) => ({ ...s, loading: false, error: true })),
    );
  }, [uid]);
  return state;
}

export function useStats(uid: string | undefined): { stats: UserStats; loading: boolean } {
  const { stats, loading } = useMyActivities(uid);
  return { stats, loading };
}
