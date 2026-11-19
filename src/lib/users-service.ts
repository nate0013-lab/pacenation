import { collection, endAt, getDocs, limit, orderBy, query, startAt } from 'firebase/firestore';

import { db } from './firebase';
import type { UserProfile } from './types';
import { normalizeUsername } from './validation';

/** Prefix search on usernames. Returns at most 20 profile cards. */
export async function searchUsers(raw: string): Promise<UserProfile[]> {
  const q = normalizeUsername(raw);
  if (q.length < 2) return [];
  const snap = await getDocs(
    query(collection(db, 'users'), orderBy('usernameLower'), startAt(q), endAt(q + ''), limit(20)),
  );
  return snap.docs.map((d) => ({ uid: d.id, ...(d.data() as Omit<UserProfile, 'uid'>) }));
}
