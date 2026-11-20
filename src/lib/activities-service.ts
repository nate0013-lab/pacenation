import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Timestamp,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  where,
  writeBatch,
} from 'firebase/firestore';

import { db } from './firebase';
import { encodePolyline, simplify, type TrackPoint } from './tracking/geo';
import { liveMetrics, type SessionState } from './tracking/session';
import type { Activity, StoredPoint, Visibility } from './types';

const CHUNK = 500;
const PENDING_KEY = 'pacenation.pendingUploads.v1';

/** Everything needed to write an activity, built while still offline-safe. */
export interface ActivityDraft {
  id: string;
  ownerId: string;
  title: string;
  visibility: Visibility;
  session: SessionState;
}

export function newActivityId(): string {
  return doc(collection(db, 'activities')).id;
}

export function toStored(p: TrackPoint): StoredPoint {
  return {
    la: Math.round(p.lat * 1e6) / 1e6,
    ln: Math.round(p.lng * 1e6) / 1e6,
    al: p.alt === null ? null : Math.round(p.alt * 10) / 10,
    t: p.t,
    ac: Math.round(p.acc * 10) / 10,
    sg: p.seg,
  };
}

export function fromStored(p: StoredPoint): TrackPoint {
  return { lat: p.la, lng: p.ln, alt: p.al, t: p.t, acc: p.ac, seg: p.sg };
}

/** Builds the activity document from a finished session. Pure, so it is unit-tested. */
export function buildActivityDoc(d: ActivityDraft) {
  const s = d.session;
  const m = liveMetrics(s, s.endedAt ?? Date.now());
  const first = s.points[0];
  const last = s.points[s.points.length - 1];
  const preview = simplify(s.points, 8).slice(0, 1500);
  return {
    ownerId: d.ownerId,
    sport: s.sport,
    title: d.title.trim().slice(0, 80) || 'Activity',
    visibility: d.visibility,
    startedAt: Timestamp.fromMillis(s.startedAt ?? Date.now()),
    endedAt: Timestamp.fromMillis(s.endedAt ?? Date.now()),
    distanceM: Math.round(m.distanceM),
    movingTimeS: Math.round(m.movingTimeS),
    elapsedTimeS: Math.max(Math.round(m.movingTimeS), Math.round(m.elapsedTimeS)),
    avgSpeedMps: Math.round(m.avgSpeedMps * 100) / 100,
    maxSpeedMps: Math.round(m.maxSpeedMps * 100) / 100,
    avgPaceSPerKm: m.avgPaceSPerKm === null ? null : Math.round(m.avgPaceSPerKm),
    elevationGainM: m.elevationGainM,
    calories: m.calories,
    start: first ? { lat: first.lat, lng: first.lng } : null,
    end: last ? { lat: last.lat, lng: last.lng } : null,
    polyline: encodePolyline(preview),
    pointCount: s.points.length,
    likeCount: 0,
    commentCount: 0,
  };
}

/** Writes the activity and its GPS points in one atomic batch. */
export async function uploadActivity(d: ActivityDraft): Promise<void> {
  const batch = writeBatch(db);
  const ref = doc(db, 'activities', d.id);
  batch.set(ref, { ...buildActivityDoc(d), createdAt: serverTimestamp() });
  const pts = d.session.points;
  for (let i = 0, n = 0; i < pts.length; i += CHUNK, n++) {
    batch.set(doc(ref, 'routeChunks', String(n).padStart(4, '0')), { index: n, points: pts.slice(i, i + CHUNK).map(toStored) });
  }
  await batch.commit();
}

// ---- pending uploads: a finished activity is kept on the device until the server has it ----
export async function getPending(): Promise<ActivityDraft[]> {
  try {
    return JSON.parse((await AsyncStorage.getItem(PENDING_KEY)) ?? '[]') as ActivityDraft[];
  } catch {
    return [];
  }
}

async function setPending(list: ActivityDraft[]) {
  await AsyncStorage.setItem(PENDING_KEY, JSON.stringify(list));
}

export async function addPending(d: ActivityDraft) {
  const list = (await getPending()).filter((p) => p.id !== d.id);
  await setPending([...list, d]);
}

export async function removePending(id: string) {
  await setPending((await getPending()).filter((p) => p.id !== id));
}

/** Saves a draft: stored locally first, removed once the upload succeeds. */
export async function saveActivity(d: ActivityDraft, timeoutMs = 20000): Promise<'saved' | 'queued'> {
  await addPending(d);
  const timeout = new Promise<'queued'>((resolve) => setTimeout(() => resolve('queued'), timeoutMs));
  const upload = uploadActivity(d).then(async () => {
    await removePending(d.id);
    return 'saved' as const;
  });
  return Promise.race([upload, timeout]);
}

/** Retries uploads left over from earlier sessions. Returns how many are still waiting. */
export async function retryPending(uid: string): Promise<number> {
  const list = (await getPending()).filter((p) => p.ownerId === uid);
  for (const d of list) {
    try {
      await uploadActivity(d);
      await removePending(d.id);
    } catch {
      // stays queued
    }
  }
  return (await getPending()).filter((p) => p.ownerId === uid).length;
}

// ---- reads ----
export function watchMyActivities(uid: string, cb: (list: Activity[]) => void, onError: (e: Error) => void, max = 500) {
  return onSnapshot(
    // Equality-only query, sorted on the device, so no composite index has to be deployed.
    query(collection(db, 'activities'), where('ownerId', '==', uid), limit(max)),
    (snap) =>
      cb(
        snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as Omit<Activity, 'id'>) }))
          .sort((a, b) => b.startedAt.toMillis() - a.startedAt.toMillis()),
      ),
    onError,
  );
}

export async function getActivity(id: string): Promise<Activity | null> {
  const snap = await getDoc(doc(db, 'activities', id));
  return snap.exists() ? ({ id: snap.id, ...(snap.data() as Omit<Activity, 'id'>) } as Activity) : null;
}

export async function getRoute(id: string): Promise<TrackPoint[]> {
  const snap = await getDocs(query(collection(db, 'activities', id, 'routeChunks'), orderBy('index')));
  return snap.docs.flatMap((d) => (d.data().points as StoredPoint[]).map(fromStored));
}

export async function deleteActivity(id: string): Promise<void> {
  const chunks = await getDocs(collection(db, 'activities', id, 'routeChunks'));
  const batch = writeBatch(db);
  chunks.docs.forEach((c) => batch.delete(c.ref));
  batch.delete(doc(db, 'activities', id));
  await batch.commit();
}
