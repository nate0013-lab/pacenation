import { Timestamp, collection, onSnapshot, orderBy, query, where } from 'firebase/firestore';

import { db } from './firebase';
import type { Sport } from './types';

export type ChallengePeriod = 'weekly' | 'monthly';

export interface Challenge {
  id: string;
  title: string;
  description: string;
  sport: Sport | 'any';
  kind: 'individual' | 'community';
  period: ChallengePeriod;
  startsAt: Timestamp;
  endsAt: Timestamp;
  goalM: number;
  participantCount: number;
  communityProgressM: number;
  badgeId: string | null;
}

/** Live list of challenges in a period that have not ended yet, soonest ending first. */
export function watchOpenChallenges(period: ChallengePeriod, cb: (list: Challenge[]) => void, onError: (e: Error) => void) {
  const q = query(
    collection(db, 'challenges'),
    where('period', '==', period),
    where('endsAt', '>', Timestamp.now()),
    orderBy('endsAt', 'asc'),
  );
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Challenge, 'id'>) }))),
    onError,
  );
}
