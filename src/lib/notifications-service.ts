/**
 * In-app notifications. With no server, the person who causes a notification
 * writes it into the other person's inbox; the security rules check that the
 * follow, cheer, comment or event it describes really exists. Sending is
 * best effort: a failed notification never blocks the action itself.
 */
import { Timestamp, collection, doc, limit, onSnapshot, orderBy, query, serverTimestamp, setDoc, updateDoc, writeBatch } from 'firebase/firestore';

import { db } from './firebase';

export type NotificationType = 'follow' | 'follow_request' | 'follow_approved' | 'cheer' | 'comment' | 'event_join' | 'event_cancelled' | 'event_updated';

export interface AppNotification {
  id: string;
  type: NotificationType;
  fromUid: string;
  fromName: string;
  activityId?: string;
  eventId?: string;
  text?: string;
  read: boolean;
  createdAt: number;
}

/** Which notification setting each type belongs to. */
export const SETTING_FOR: Record<NotificationType, 'followers' | 'likesAndComments' | 'events'> = {
  follow: 'followers',
  follow_request: 'followers',
  follow_approved: 'followers',
  cheer: 'likesAndComments',
  comment: 'likesAndComments',
  event_join: 'events',
  event_cancelled: 'events',
  event_updated: 'events',
};

let senderName = '';
/** Set once the profile loads, so notifications carry the sender's name. */
export function setNotificationSender(name: string) {
  senderName = name.slice(0, 40);
}

export async function notify(
  to: string,
  from: string,
  type: NotificationType,
  extra: { activityId?: string; eventId?: string; text?: string } = {},
  id?: string,
): Promise<void> {
  if (to === from) return;
  const ref = id ? doc(db, 'users', to, 'notifications', id) : doc(collection(db, 'users', to, 'notifications'));
  const data: Record<string, unknown> = { type, fromUid: from, fromName: senderName || 'Someone', read: false, createdAt: serverTimestamp() };
  if (extra.activityId) data.activityId = extra.activityId;
  if (extra.eventId) data.eventId = extra.eventId;
  if (extra.text) data.text = extra.text.slice(0, 140);
  try {
    await setDoc(ref, data);
  } catch {
    // Already sent (fixed ids stop repeats) or not allowed: nothing to do.
  }
}

export function watchNotifications(uid: string, cb: (list: AppNotification[]) => void): () => void {
  return onSnapshot(
    query(collection(db, 'users', uid, 'notifications'), orderBy('createdAt', 'desc'), limit(60)),
    (snap) =>
      cb(
        snap.docs.map((d) => {
          const x = d.data({ serverTimestamps: 'estimate' });
          return { id: d.id, ...(x as Omit<AppNotification, 'id' | 'createdAt'>), createdAt: (x.createdAt as Timestamp | null)?.toMillis() ?? Date.now() };
        }),
      ),
    () => cb([]),
  );
}

export async function markRead(uid: string, ids: string[]): Promise<void> {
  if (!ids.length) return;
  const b = writeBatch(db);
  for (const id of ids.slice(0, 450)) b.update(doc(db, 'users', uid, 'notifications', id), { read: true });
  await b.commit();
}

export async function markOneRead(uid: string, id: string): Promise<void> {
  await updateDoc(doc(db, 'users', uid, 'notifications', id), { read: true });
}
