/** Keeps the public `stats/{uid}` summary and the profile's XP and level in step with the activity history. */
import { doc, serverTimestamp, writeBatch } from 'firebase/firestore';

import { db } from '../firebase';
import type { UserStats } from '../types';
import type { Progress } from './summary';

export interface StatsSummary extends UserStats {
  xp: number;
  level: number;
  /** Badge id to the epoch ms it was earned. */
  badges: Record<string, number>;
  /** Record key (such as `run-5k`) to its value: seconds for times, metres for distance and climb. */
  records: Record<string, number>;
  currentStreak: number;
  bestStreak: number;
}

/**
 * The shared summary. XP, level and badges cover everything; distance totals,
 * streaks and records leave out "Only me" activities, so a private activity
 * never shows up on someone else's screen, not even as a number in a total.
 */
export function summaryDoc(p: Progress, shared: Progress = p): StatsSummary {
  return {
    ...shared.stats,
    xp: p.xp,
    level: p.level,
    badges: Object.fromEntries(p.earned.map((b) => [b.badge.id, b.earnedAt!])),
    records: Object.fromEntries(shared.records.map((r) => [r.key, Math.round(r.value)])),
    currentStreak: shared.currentStreak,
    bestStreak: shared.bestStreak,
  };
}

export async function syncSummary(uid: string, s: StatsSummary, updateProfileXp: boolean): Promise<void> {
  const batch = writeBatch(db);
  batch.set(doc(db, 'stats', uid), { ...s, updatedAt: serverTimestamp() });
  if (updateProfileXp) batch.update(doc(db, 'users', uid), { xp: s.xp, level: s.level, updatedAt: serverTimestamp() });
  await batch.commit();
}
