import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

import { watchMyActivities } from './activities-service';
import { useAuth } from './auth-context';
import { summaryDoc, syncSummary } from './progress/sync';
import { computeProgress, type Progress } from './progress/summary';
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

interface MyActivitiesState {
  activities: Activity[];
  stats: UserStats;
  progress: Progress;
  loading: boolean;
  error: boolean;
}

const initial = (): MyActivitiesState => {
  const progress = computeProgress([]);
  return { activities: [], stats: progress.stats, progress, loading: true, error: false };
};

const MyActivitiesContext = createContext<MyActivitiesState | null>(null);

/**
 * Watches the signed-in user's activities once for the whole app, works out
 * stats, XP, badges and records from them, and keeps the public summary in
 * `stats/{uid}` (and XP and level on the profile) up to date.
 */
export function MyActivitiesProvider({ children }: { children: ReactNode }) {
  const { status, user, profile } = useAuth();
  const uid = status === 'ready' ? user?.uid : undefined;
  const [state, setState] = useState<MyActivitiesState>(initial);
  const lastSynced = useRef<string | null>(null);

  useEffect(() => {
    setState(initial());
    lastSynced.current = null;
    if (!uid) return;
    return watchMyActivities(
      uid,
      (activities) => {
        const progress = computeProgress(activities);
        setState({ activities, stats: progress.stats, progress, loading: false, error: false });
      },
      () => setState((s) => ({ ...s, loading: false, error: true })),
    );
  }, [uid]);

  useEffect(() => {
    if (!uid || !profile || state.loading || state.error) return;
    const summary = summaryDoc(state.progress);
    const key = JSON.stringify(summary);
    if (key === lastSynced.current && profile.xp === summary.xp && profile.level === summary.level) return;
    lastSynced.current = key;
    syncSummary(uid, summary, profile.xp !== summary.xp || profile.level !== summary.level).catch(() => {
      lastSynced.current = null;
    });
  }, [uid, profile, state]);

  return <MyActivitiesContext.Provider value={state}>{children}</MyActivitiesContext.Provider>;
}

/** The signed-in user's activities (newest first), stats and progress, kept live. */
export function useMyActivities(): MyActivitiesState {
  const ctx = useContext(MyActivitiesContext);
  if (!ctx) throw new Error('useMyActivities must be used inside MyActivitiesProvider');
  return ctx;
}

export function useStats(): { stats: UserStats; loading: boolean } {
  const { stats, loading } = useMyActivities();
  return { stats, loading };
}

export function useProgress(): Progress {
  return useMyActivities().progress;
}
