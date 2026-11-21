/** Community events: group walks, runs and rides anyone can host. */
import {
  Timestamp,
  collection,
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
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';

import { db } from './firebase';
import { notify } from './notifications-service';
import type { Sport, UserProfile } from './types';

export interface PaceEvent {
  id: string;
  ownerId: string;
  ownerName: string;
  title: string;
  description: string;
  sport: Sport;
  startsAt: number;
  durationMin: number;
  distanceM: number | null;
  meetingPoint: string;
  location: { lat: number; lng: number } | null;
  capacity: number | null;
  cancelled: boolean;
}

export interface EventDraft {
  title: string;
  description: string;
  sport: Sport;
  startsAt: number;
  durationMin: number;
  distanceM: number | null;
  meetingPoint: string;
  location: { lat: number; lng: number } | null;
  capacity: number | null;
}

export interface Attendee {
  uid: string;
  displayName: string;
  username: string;
  joinedAt: number;
}

function fromDoc(id: string, x: Record<string, unknown>): PaceEvent {
  return {
    id,
    ownerId: x.ownerId as string,
    ownerName: (x.ownerName as string) ?? '',
    title: x.title as string,
    description: (x.description as string) ?? '',
    sport: x.sport as Sport,
    startsAt: (x.startsAt as Timestamp).toMillis(),
    durationMin: (x.durationMin as number) ?? 60,
    distanceM: (x.distanceM as number | null) ?? null,
    meetingPoint: x.meetingPoint as string,
    location: (x.location as PaceEvent['location']) ?? null,
    capacity: (x.capacity as number | null) ?? null,
    cancelled: !!x.cancelled,
  };
}

/** Problems with a draft, in plain words, or null when it can be saved. */
export function validateEvent(d: EventDraft, now = Date.now()): string | null {
  if (d.title.trim().length < 3) return 'Give the event a title of at least 3 characters.';
  if (d.title.trim().length > 60) return 'Keep the title under 60 characters.';
  if (d.meetingPoint.trim().length < 3) return 'Say where people should meet.';
  if (d.startsAt <= now + 5 * 60_000) return 'Pick a start time in the future.';
  if (d.startsAt > now + 365 * 86_400_000) return 'Events can be up to a year ahead.';
  if (d.capacity !== null && (d.capacity < 2 || d.capacity > 500)) return 'Spaces must be between 2 and 500.';
  if (d.distanceM !== null && (d.distanceM <= 0 || d.distanceM > 300_000)) return 'Distance must be between 0 and 300 km.';
  return null;
}

function payload(d: EventDraft) {
  return {
    title: d.title.trim(),
    description: d.description.trim().slice(0, 1000),
    sport: d.sport,
    startsAt: Timestamp.fromMillis(d.startsAt),
    durationMin: Math.round(d.durationMin),
    distanceM: d.distanceM === null ? null : Math.round(d.distanceM),
    meetingPoint: d.meetingPoint.trim(),
    location: d.location,
    capacity: d.capacity,
  };
}

/** Creates the event, and signs the host up as the first attendee. */
export async function createEvent(me: UserProfile, d: EventDraft): Promise<string> {
  const ref = doc(collection(db, 'events'));
  await setDoc(ref, { ...payload(d), ownerId: me.uid, ownerName: me.displayName.slice(0, 40), cancelled: false, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  await joinEvent(me, { id: ref.id, startsAt: d.startsAt, ownerId: me.uid });
  return ref.id;
}

export async function updateEvent(me: string, id: string, d: EventDraft): Promise<void> {
  await updateDoc(doc(db, 'events', id), { ...payload(d), updatedAt: serverTimestamp() });
  void notifyAttendees(id, me, 'event_updated', d.title);
}

export async function cancelEvent(me: string, ev: PaceEvent): Promise<void> {
  await updateDoc(doc(db, 'events', ev.id), { cancelled: true, updatedAt: serverTimestamp() });
  void notifyAttendees(ev.id, me, 'event_cancelled', ev.title);
}

async function notifyAttendees(id: string, me: string, type: 'event_cancelled' | 'event_updated', title: string) {
  const snap = await getDocs(collection(db, 'events', id, 'attendees'));
  await Promise.all(snap.docs.filter((d) => d.id !== me).map((d) => notify(d.id, me, type, { eventId: id, text: title })));
}

export async function joinEvent(me: UserProfile, ev: Pick<PaceEvent, 'id' | 'startsAt' | 'ownerId'>): Promise<void> {
  const b = writeBatch(db);
  b.set(doc(db, 'events', ev.id, 'attendees', me.uid), { displayName: me.displayName.slice(0, 40), username: me.username, joinedAt: serverTimestamp() });
  b.set(doc(db, 'users', me.uid, 'events', ev.id), { joinedAt: serverTimestamp(), startsAt: Timestamp.fromMillis(ev.startsAt) });
  await b.commit();
  if (ev.ownerId !== me.uid) void notify(ev.ownerId, me.uid, 'event_join', { eventId: ev.id }, `join-${ev.id}-${me.uid}`);
}

export async function leaveEvent(me: string, id: string): Promise<void> {
  const b = writeBatch(db);
  b.delete(doc(db, 'events', id, 'attendees', me));
  b.delete(doc(db, 'users', me, 'events', id));
  await b.commit();
}

export function watchEvent(id: string, cb: (e: PaceEvent | null) => void): () => void {
  return onSnapshot(
    doc(db, 'events', id),
    (snap) => cb(snap.exists() ? fromDoc(snap.id, snap.data()) : null),
    () => cb(null),
  );
}

export function watchAttendees(id: string, cb: (list: Attendee[]) => void): () => void {
  return onSnapshot(
    query(collection(db, 'events', id, 'attendees'), orderBy('joinedAt', 'asc'), limit(200)),
    (snap) =>
      cb(
        snap.docs.map((d) => {
          const x = d.data({ serverTimestamps: 'estimate' });
          return { uid: d.id, displayName: x.displayName, username: x.username, joinedAt: (x.joinedAt as Timestamp | null)?.toMillis() ?? Date.now() };
        }),
      ),
    () => cb([]),
  );
}

/** Upcoming events, soonest first (single-field query). Cancelled ones are left out. */
export function watchUpcoming(cb: (list: PaceEvent[]) => void, max = 50): () => void {
  return onSnapshot(
    query(collection(db, 'events'), where('startsAt', '>', Timestamp.fromMillis(Date.now() - 3 * 3600_000)), orderBy('startsAt', 'asc'), limit(max)),
    (snap) => cb(snap.docs.map((d) => fromDoc(d.id, d.data())).filter((e) => !e.cancelled && e.startsAt + e.durationMin * 60_000 > Date.now())),
    () => cb([]),
  );
}

/** Ids of events I am going to. */
export function watchMyEventIds(uid: string, cb: (ids: string[]) => void): () => void {
  return onSnapshot(
    collection(db, 'users', uid, 'events'),
    (snap) => cb(snap.docs.map((d) => d.id)),
    () => cb([]),
  );
}

export async function getEvent(id: string): Promise<PaceEvent | null> {
  const snap = await getDoc(doc(db, 'events', id));
  return snap.exists() ? fromDoc(snap.id, snap.data()) : null;
}

export async function attendeeCount(id: string): Promise<number> {
  return (await getCountFromServer(collection(db, 'events', id, 'attendees'))).data().count;
}

export function formatEventTime(ms: number): string {
  const d = new Date(ms);
  return `${d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })} · ${d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`;
}
