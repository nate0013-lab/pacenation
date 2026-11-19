import { doc, onSnapshot } from 'firebase/firestore';
import { useEffect, useState } from 'react';

import { db } from './firebase';
import { isoWeekKey, monthKey } from './format';
import { EMPTY_TOTALS, type UserStats } from './types';

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

export function useStats(uid: string | undefined): { stats: UserStats; loading: boolean } {
  const [state, setState] = useState<{ stats: UserStats; loading: boolean }>({ stats: emptyStats(), loading: true });
  useEffect(() => {
    if (!uid) return;
    return onSnapshot(
      doc(db, 'stats', uid),
      (snap) => setState({ stats: normaliseStats(snap.data() as Partial<UserStats> | undefined), loading: false }),
      () => setState({ stats: emptyStats(), loading: false }),
    );
  }, [uid]);
  return state;
}
