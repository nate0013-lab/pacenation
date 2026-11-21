import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { challengeById, progressFor, type Challenge } from './challenges/catalogue';
import { setProgress, watchJoined, type JoinedChallenge } from './challenges-service';
import { myBoardRows, syncBoards } from './leaderboards-service';

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

export interface JoinedProgress {
  challenge: Challenge;
  joinedAt: number;
  value: number;
  completedAt: number | null;
  active: boolean;
}

interface MyActivitiesState {
  activities: Activity[];
  stats: UserStats;
  progress: Progress;
  /** Challenges I joined, newest period first, with my progress in each. */
  joined: JoinedProgress[];
  loading: boolean;
  error: boolean;
}

const MyActivitiesContext = createContext<MyActivitiesState | null>(null);

/** "Only me" activities count for my own stats and XP but never for anything other people see. */
const shareable = (list: Activity[]) => list.filter((a) => a.visibility !== 'private');

/**
 * Watches the signed-in user's activities and joined challenges once for the
 * whole app, works out stats, XP, badges, records and challenge progress, and
 * keeps everything other people see up to date: the public summary in
 * `stats/{uid}`, XP and level on the profile, challenge entries and leaderboards.
 */
export function MyActivitiesProvider({ children }: { children: ReactNode }) {
  const { status, user, profile } = useAuth();
  const uid = status === 'ready' ? user?.uid : undefined;
  const [raw, setRaw] = useState<{ activities: Activity[]; loading: boolean; error: boolean }>({ activities: [], loading: true, error: false });
  const [joinedRaw, setJoinedRaw] = useState<JoinedChallenge[]>([]);
  const synced = useRef<{ summary: string | null; boards: string | null; challenges: Record<string, number> }>({ summary: null, boards: null, challenges: {} });

  useEffect(() => {
    setRaw({ activities: [], loading: true, error: false });
    setJoinedRaw([]);
    synced.current = { summary: null, boards: null, challenges: {} };
    if (!uid) return;
    const a = watchMyActivities(
      uid,
      (activities) => setRaw({ activities, loading: false, error: false }),
      () => setRaw((s) => ({ ...s, loading: false, error: true })),
    );
    const b = watchJoined(uid, setJoinedRaw);
    return () => {
      a();
      b();
    };
  }, [uid]);

  const state = useMemo<MyActivitiesState>(() => {
    const shared = shareable(raw.activities);
    const now = Date.now();
    const joined = joinedRaw
      .map((j) => {
        const challenge = challengeById(j.id)!;
        const p = progressFor(challenge, shared);
        return { challenge, joinedAt: j.joinedAt, value: p.value, completedAt: p.completedAt, active: challenge.endsAt > now };
      })
      .sort((x, y) => y.challenge.endsAt - x.challenge.endsAt || x.challenge.title.localeCompare(y.challenge.title));
    const completions = joined.filter((j) => j.completedAt !== null).map((j) => j.completedAt!);
    const progress = computeProgress(raw.activities, new Date(), completions);
    return { activities: raw.activities, stats: progress.stats, progress, joined, loading: raw.loading, error: raw.error };
  }, [raw, joinedRaw]);

  useEffect(() => {
    if (!uid || !profile || state.loading || state.error) return;
    const shared = shareable(state.activities);
    const summary = summaryDoc(state.progress, computeProgress(shared, new Date(), state.joined.filter((j) => j.completedAt).map((j) => j.completedAt!)));
    const key = JSON.stringify(summary);
    if (key !== synced.current.summary || profile.xp !== summary.xp || profile.level !== summary.level) {
      synced.current.summary = key;
      syncSummary(uid, summary, profile.xp !== summary.xp || profile.level !== summary.level).catch(() => {
        synced.current.summary = null;
      });
    }

    // Leaderboards: my entry on every current board, or none if I opted out.
    const show = profile.privacy.showOnLeaderboards;
    const rows = myBoardRows(shared);
    const boardsKey = JSON.stringify({ rows, show, n: profile.displayName, u: profile.username, l: profile.level });
    if (boardsKey !== synced.current.boards) {
      synced.current.boards = boardsKey;
      syncBoards(profile, rows, show).catch(() => {
        synced.current.boards = null;
      });
    }

    // Challenge entries: my progress in challenges that are live (or ended in the last 3 days).
    for (const j of state.joined) {
      if (j.challenge.endsAt + 3 * 86_400_000 < Date.now()) continue;
      if (synced.current.challenges[j.challenge.id] === j.value) continue;
      synced.current.challenges[j.challenge.id] = j.value;
      setProgress(profile, j.challenge.id, j.value).catch(() => {
        delete synced.current.challenges[j.challenge.id];
      });
    }
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
