/**
 * Joining challenges and keeping my progress up to date. My device writes
 * my own participant entry; leaderboards read the entries sorted by progress
 * (a single-field index, so nothing has to be deployed).
 */
import {
  Timestamp,
  collection,
  deleteDoc,
  doc,
  getAggregateFromServer,
  getCountFromServer,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  sum,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';

import { challengeById, type Challenge } from './challenges/catalogue';
import { db } from './firebase';
import type { UserProfile } from './types';

export type { Challenge, ChallengePeriod } from './challenges/catalogue';

/** `users/{uid}/challenges/{id}`: the challenges I joined. */
export interface JoinedChallenge {
  id: string;
  joinedAt: number;
  endsAt: number;
}

export interface Participant {
  uid: string;
  displayName: string;
  username: string;
  progress: number;
}

export function watchJoined(uid: string, cb: (list: JoinedChallenge[]) => void): () => void {
  return onSnapshot(
    collection(db, 'users', uid, 'challenges'),
    (snap) =>
      cb(
        snap.docs
          .map((d) => ({ id: d.id, joinedAt: (d.data().joinedAt as Timestamp | null)?.toMillis() ?? Date.now(), endsAt: (d.data().endsAt as Timestamp).toMillis() }))
          .filter((j) => challengeById(j.id) !== null),
      ),
    () => cb([]),
  );
}

export async function joinChallenge(me: UserProfile, c: Challenge, progress: number): Promise<void> {
  const b = writeBatch(db);
  const endsAt = Timestamp.fromMillis(c.endsAt);
  b.set(doc(db, 'challenges', c.id, 'participants', me.uid), {
    displayName: me.displayName,
    username: me.username,
    progress: 0,
    endsAt,
    joinedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  b.set(doc(db, 'users', me.uid, 'challenges', c.id), { joinedAt: serverTimestamp(), endsAt });
  await b.commit();
  if (progress > 0) await setProgress(me, c.id, progress);
}

export async function leaveChallenge(uid: string, id: string): Promise<void> {
  const b = writeBatch(db);
  b.delete(doc(db, 'challenges', id, 'participants', uid));
  b.delete(doc(db, 'users', uid, 'challenges', id));
  await b.commit();
}

export async function setProgress(me: UserProfile, id: string, progress: number): Promise<void> {
  await updateDoc(doc(db, 'challenges', id, 'participants', me.uid), {
    progress: Math.max(0, Math.round(progress)),
    displayName: me.displayName,
    username: me.username,
    updatedAt: serverTimestamp(),
  });
}

/** Top participants by progress. */
export function watchParticipants(id: string, cb: (list: Participant[]) => void, max = 50): () => void {
  return onSnapshot(
    query(collection(db, 'challenges', id, 'participants'), orderBy('progress', 'desc'), limit(max)),
    (snap) => cb(snap.docs.map((d) => ({ uid: d.id, displayName: d.data().displayName, username: d.data().username, progress: d.data().progress ?? 0 }))),
    () => cb([]),
  );
}

/** How many joined, and the shared total for community challenges. */
export async function challengeTotals(id: string): Promise<{ participants: number; total: number }> {
  const agg = await getAggregateFromServer(collection(db, 'challenges', id, 'participants'), { total: sum('progress') });
  const count = await getCountFromServer(collection(db, 'challenges', id, 'participants'));
  return { participants: count.data().count, total: agg.data().total ?? 0 };
}

/** My position among participants: 1 + how many are ahead of me. */
export async function rankIn(id: string, progress: number): Promise<number> {
  const ahead = await getCountFromServer(query(collection(db, 'challenges', id, 'participants'), where('progress', '>', progress)));
  return ahead.data().count + 1;
}

export async function participantIds(id: string): Promise<string[]> {
  const snap = await getDocs(collection(db, 'challenges', id, 'participants'));
  return snap.docs.map((d) => d.id);
}

export async function removeMyEntry(uid: string, id: string): Promise<void> {
  await deleteDoc(doc(db, 'challenges', id, 'participants', uid));
}
