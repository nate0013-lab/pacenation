/**
 * Follows, follow requests, feed, likes and comments. Free-plan friendly:
 * no Cloud Functions and no composite indexes. Counts use count() queries,
 * and the feed is merged on the device from one equality query per person.
 */
import {
  Timestamp,
  collection,
  deleteDoc,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
} from 'firebase/firestore';

import { db } from './firebase';
import type { StatsSummary } from './progress/sync';
import type { Activity, UserProfile, Visibility } from './types';

// ---------- profiles ----------
const cardCache = new Map<string, { at: number; card: UserProfile | null }>();

export async function getUserCard(uid: string, fresh = false): Promise<UserProfile | null> {
  const hit = cardCache.get(uid);
  if (!fresh && hit && Date.now() - hit.at < 60_000) return hit.card;
  const snap = await getDoc(doc(db, 'users', uid));
  const card = snap.exists() ? ({ uid: snap.id, ...(snap.data() as Omit<UserProfile, 'uid'>) } as UserProfile) : null;
  cardCache.set(uid, { at: Date.now(), card });
  return card;
}

export async function getUserCards(uids: string[]): Promise<Map<string, UserProfile>> {
  const out = new Map<string, UserProfile>();
  const cards = await Promise.all([...new Set(uids)].map((u) => getUserCard(u).catch(() => null)));
  for (const c of cards) if (c) out.set(c.uid, c);
  return out;
}

export function watchUserCard(uid: string, cb: (p: UserProfile | null) => void): () => void {
  return onSnapshot(
    doc(db, 'users', uid),
    (snap) => {
      const card = snap.exists() ? ({ uid: snap.id, ...(snap.data() as Omit<UserProfile, 'uid'>) } as UserProfile) : null;
      cardCache.set(uid, { at: Date.now(), card });
      cb(card);
    },
    () => cb(null),
  );
}

/** Newest members, for the Discover list. */
export async function newestMembers(max = 12): Promise<UserProfile[]> {
  const snap = await getDocs(query(collection(db, 'users'), orderBy('createdAt', 'desc'), limit(max)));
  return snap.docs.map((d) => ({ uid: d.id, ...(d.data() as Omit<UserProfile, 'uid'>) }) as UserProfile);
}

/** Someone else's public summary, or null when their privacy settings hide it. */
export async function getStatsSummary(uid: string): Promise<StatsSummary | null> {
  try {
    const snap = await getDoc(doc(db, 'stats', uid));
    return snap.exists() ? (snap.data() as StatsSummary) : null;
  } catch {
    return null;
  }
}

// ---------- follows ----------
export type FollowState = 'self' | 'following' | 'requested' | 'none';

export async function getFollowState(me: string, target: string): Promise<FollowState> {
  if (me === target) return 'self';
  const edge = await getDoc(doc(db, 'users', target, 'followers', me));
  if (edge.exists()) return 'following';
  const req = await getDoc(doc(db, 'users', target, 'followRequests', me));
  return req.exists() ? 'requested' : 'none';
}

/** Follows a public profile straight away; sends a request to any other. Returns the new state. */
export async function follow(me: string, target: UserProfile): Promise<FollowState> {
  if (target.privacy.profileVisibility === 'public') {
    const b = writeBatch(db);
    b.set(doc(db, 'users', me, 'following', target.uid), { createdAt: serverTimestamp() });
    b.set(doc(db, 'users', target.uid, 'followers', me), { createdAt: serverTimestamp() });
    await b.commit();
    return 'following';
  }
  await setDoc(doc(db, 'users', target.uid, 'followRequests', me), { createdAt: serverTimestamp() });
  return 'requested';
}

export async function unfollow(me: string, target: string): Promise<void> {
  const b = writeBatch(db);
  b.delete(doc(db, 'users', me, 'following', target));
  b.delete(doc(db, 'users', target, 'followers', me));
  await b.commit();
}

export async function cancelRequest(me: string, target: string): Promise<void> {
  await deleteDoc(doc(db, 'users', target, 'followRequests', me));
}

export async function removeFollower(me: string, follower: string): Promise<void> {
  const b = writeBatch(db);
  b.delete(doc(db, 'users', me, 'followers', follower));
  b.delete(doc(db, 'users', follower, 'following', me));
  await b.commit();
}

export function watchFollowRequests(me: string, cb: (requesters: { uid: string; at: number }[]) => void): () => void {
  return onSnapshot(
    collection(db, 'users', me, 'followRequests'),
    (snap) => cb(snap.docs.map((d) => ({ uid: d.id, at: (d.data().createdAt as Timestamp | null)?.toMillis() ?? Date.now() })).sort((a, b) => b.at - a.at)),
    () => cb([]),
  );
}

export async function approveRequest(me: string, requester: string): Promise<void> {
  const b = writeBatch(db);
  b.set(doc(db, 'users', requester, 'following', me), { createdAt: serverTimestamp() });
  b.set(doc(db, 'users', me, 'followers', requester), { createdAt: serverTimestamp() });
  b.delete(doc(db, 'users', me, 'followRequests', requester));
  await b.commit();
}

export async function declineRequest(me: string, requester: string): Promise<void> {
  await deleteDoc(doc(db, 'users', me, 'followRequests', requester));
}

export function watchFollowing(me: string, cb: (uids: string[]) => void): () => void {
  return onSnapshot(
    collection(db, 'users', me, 'following'),
    (snap) => cb(snap.docs.map((d) => d.id)),
    () => cb([]),
  );
}

export async function connectionCounts(uid: string): Promise<{ followers: number; following: number }> {
  const [a, b] = await Promise.all([
    getCountFromServer(collection(db, 'users', uid, 'followers')),
    getCountFromServer(collection(db, 'users', uid, 'following')),
  ]);
  return { followers: a.data().count, following: b.data().count };
}

export async function listConnections(uid: string, kind: 'followers' | 'following', max = 200): Promise<string[]> {
  const snap = await getDocs(query(collection(db, 'users', uid, kind), limit(max)));
  return snap.docs.map((d) => d.id);
}

// ---------- activities of other people ----------
/** Which activity visibilities a viewer may list for an owner. */
export function visibleTo(viewer: string, owner: string, isFollower: boolean): Visibility[] {
  if (viewer === owner) return ['public', 'followers', 'private'];
  return isFollower ? ['public', 'followers'] : ['public'];
}

export async function listActivitiesOf(viewer: string, owner: string, isFollower: boolean, max = 200): Promise<Activity[]> {
  const snap = await getDocs(
    query(collection(db, 'activities'), where('ownerId', '==', owner), where('visibility', 'in', visibleTo(viewer, owner, isFollower)), limit(max)),
  );
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Activity, 'id'>) }) as Activity).sort((a, b) => b.startedAt.toMillis() - a.startedAt.toMillis());
}

export interface FeedItem {
  activity: Activity;
  owner: UserProfile;
}

/** Recent activities from the people I follow and me, newest first. */
export async function loadFeed(me: string, following: string[], opts: { days?: number; max?: number } = {}): Promise<FeedItem[]> {
  const since = Date.now() - (opts.days ?? 60) * 86_400_000;
  const owners = [me, ...following.filter((u) => u !== me)];
  const lists: Activity[][] = [];
  // A few people at a time keeps the number of open requests modest.
  for (let i = 0; i < owners.length; i += 8) {
    const part = await Promise.all(owners.slice(i, i + 8).map((o) => listActivitiesOf(me, o, o !== me, 60).catch(() => [] as Activity[])));
    lists.push(...part);
  }
  const acts = lists
    .flat()
    .filter((a) => a.startedAt.toMillis() >= since)
    .sort((a, b) => b.startedAt.toMillis() - a.startedAt.toMillis())
    .slice(0, opts.max ?? 40);
  const cards = await getUserCards(acts.map((a) => a.ownerId));
  return acts.filter((a) => cards.has(a.ownerId)).map((a) => ({ activity: a, owner: cards.get(a.ownerId)! }));
}

// ---------- likes and comments ----------
export interface Reactions {
  likes: number;
  comments: number;
  likedByMe: boolean;
}

export async function getReactions(activityId: string, me: string): Promise<Reactions> {
  const [likes, comments, mine] = await Promise.all([
    getCountFromServer(collection(db, 'activities', activityId, 'likes')),
    getCountFromServer(collection(db, 'activities', activityId, 'comments')),
    getDoc(doc(db, 'activities', activityId, 'likes', me)),
  ]);
  return { likes: likes.data().count, comments: comments.data().count, likedByMe: mine.exists() };
}

export async function setLike(activityId: string, me: string, liked: boolean): Promise<void> {
  const ref = doc(db, 'activities', activityId, 'likes', me);
  if (liked) await setDoc(ref, { createdAt: serverTimestamp() });
  else await deleteDoc(ref);
}

export async function listLikers(activityId: string, max = 100): Promise<string[]> {
  const snap = await getDocs(query(collection(db, 'activities', activityId, 'likes'), limit(max)));
  return snap.docs.map((d) => d.id);
}

export interface Comment {
  id: string;
  authorId: string;
  text: string;
  createdAt: number;
}

export const MAX_COMMENT = 500;

export function watchComments(activityId: string, cb: (list: Comment[]) => void, onError?: () => void): () => void {
  return onSnapshot(
    query(collection(db, 'activities', activityId, 'comments'), orderBy('createdAt', 'asc'), limit(200)),
    (snap) =>
      cb(
        snap.docs.map((d) => {
          const data = d.data({ serverTimestamps: 'estimate' });
          return { id: d.id, authorId: data.authorId, text: data.text, createdAt: (data.createdAt as Timestamp | null)?.toMillis() ?? Date.now() };
        }),
      ),
    () => onError?.(),
  );
}

export async function addComment(activityId: string, me: string, text: string): Promise<void> {
  const clean = text.trim().slice(0, MAX_COMMENT);
  if (!clean) throw new Error('PN:Write something first.');
  await setDoc(doc(collection(db, 'activities', activityId, 'comments')), { authorId: me, text: clean, createdAt: serverTimestamp() });
}

export async function deleteComment(activityId: string, commentId: string): Promise<void> {
  await deleteDoc(doc(db, 'activities', activityId, 'comments', commentId));
}

// ---------- rankings ----------
export interface RankRow {
  user: UserProfile;
  distanceM: number;
  count: number;
}

/** This week's distance for me and the people I follow, from their public summaries. */
export async function weeklyRanking(me: string, following: string[], weekKey: string): Promise<RankRow[]> {
  const uids = [me, ...following.filter((u) => u !== me)].slice(0, 100);
  const [cards, sums] = await Promise.all([getUserCards(uids), Promise.all(uids.map((u) => getStatsSummary(u)))]);
  const rows: RankRow[] = [];
  uids.forEach((u, i) => {
    const card = cards.get(u);
    const s = sums[i];
    if (!card) return;
    if (u !== me && card.privacy.showOnLeaderboards === false) return;
    const week = s?.week?.key === weekKey ? s.week : { distanceM: 0, count: 0 };
    rows.push({ user: card, distanceM: week.distanceM, count: week.count });
  });
  return rows.sort((a, b) => b.distanceM - a.distanceM || a.user.displayName.localeCompare(b.user.displayName));
}
