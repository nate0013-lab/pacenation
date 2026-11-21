import {
  EmailAuthProvider,
  GoogleAuthProvider,
  OAuthProvider,
  reauthenticateWithPopup,
  createUserWithEmailAndPassword,
  deleteUser,
  reauthenticateWithCredential,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
} from 'firebase/auth';
import { collection, deleteDoc, doc, getDocs, query, where, writeBatch } from 'firebase/firestore';

import { deleteActivity } from './activities-service';
import { BOARD_PERIODS, BOARD_SPORTS, boardId } from './leaderboards-service';
import { Platform } from 'react-native';

import { auth, db } from './firebase';

/** True when the account signs in with an email and password (not only Google or Apple). */
export function hasPassword(): boolean {
  return !!auth.currentUser?.providerData.some((p) => p.providerId === 'password');
}

export async function signUpWithEmail(email: string, password: string) {
  const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
  // Verification is encouraged but not required to use the app.
  sendEmailVerification(cred.user).catch(() => undefined);
  return cred.user;
}

export async function signInWithEmail(email: string, password: string) {
  const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
  return cred.user;
}

export function sendPasswordReset(email: string) {
  return sendPasswordResetEmail(auth, email.trim());
}

export function signOut() {
  return fbSignOut(auth);
}

/**
 * Deletes the signed-in account after confirming the password. Profile
 * documents (including the photo, which lives in the profile) are removed here.
 */
export async function deleteAccount(password: string | null, usernameLower: string | null) {
  const user = auth.currentUser;
  if (!user) throw new Error('PN:You need to be signed in.');
  if (hasPassword()) {
    if (!user.email || !password) throw new Error('PN:Enter your password to confirm.');
    await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, password));
  } else if (Platform.OS === 'web') {
    const google = user.providerData.some((p) => p.providerId === 'google.com');
    await reauthenticateWithPopup(user, google ? new GoogleAuthProvider() : new OAuthProvider('apple.com'));
  } else if (Date.now() - Date.parse(user.metadata.lastSignInTime ?? '0') > 5 * 60_000) {
    // Google and Apple accounts confirm by signing in again; Firebase needs a recent sign-in to delete.
    throw new Error('PN:For your security, sign out and sign in again, then delete your account within 5 minutes.');
  }
  const uid = user.uid;
  // Activities and their routes go first, while the account can still prove it owns them.
  const mine = await getDocs(query(collection(db, 'activities'), where('ownerId', '==', uid)));
  for (const a of mine.docs) await deleteActivity(a.id);
  // Follow edges and requests, so nobody keeps a link to a deleted account.
  const [following, followers, requests] = await Promise.all([
    getDocs(collection(db, 'users', uid, 'following')),
    getDocs(collection(db, 'users', uid, 'followers')),
    getDocs(collection(db, 'users', uid, 'followRequests')),
  ]);
  const edges = writeBatch(db);
  following.docs.forEach((d) => {
    edges.delete(d.ref);
    edges.delete(doc(db, 'users', d.id, 'followers', uid));
  });
  followers.docs.forEach((d) => {
    edges.delete(d.ref);
    edges.delete(doc(db, 'users', d.id, 'following', uid));
  });
  requests.docs.forEach((d) => edges.delete(d.ref));
  if (following.size + followers.size + requests.size > 0) await edges.commit();
  // Challenge entries and leaderboard places.
  const joined = await getDocs(collection(db, 'users', uid, 'challenges'));
  const cleanup = writeBatch(db);
  joined.docs.forEach((d) => {
    cleanup.delete(d.ref);
    cleanup.delete(doc(db, 'challenges', d.id, 'participants', uid));
  });
  for (const p of BOARD_PERIODS) for (const s of BOARD_SPORTS) cleanup.delete(doc(db, 'leaderboards', boardId(p, s), 'entries', uid));
  await cleanup.commit();
  // Events: places I took at other people's events, then the events I host
  // (attendee entries first, while the event still names me as host).
  const myEvents = await getDocs(collection(db, 'users', uid, 'events'));
  for (const d of myEvents.docs) {
    await deleteDoc(doc(db, 'events', d.id, 'attendees', uid)).catch(() => undefined);
    await deleteDoc(d.ref);
  }
  const hosted = await getDocs(query(collection(db, 'events'), where('ownerId', '==', uid)));
  for (const e of hosted.docs) {
    const people = await getDocs(collection(db, 'events', e.id, 'attendees'));
    const b = writeBatch(db);
    people.docs.forEach((p) => b.delete(p.ref));
    b.delete(e.ref);
    await b.commit();
  }
  // My notifications inbox.
  const inbox = await getDocs(collection(db, 'users', uid, 'notifications'));
  for (let i = 0; i < inbox.docs.length; i += 400) {
    const b = writeBatch(db);
    inbox.docs.slice(i, i + 400).forEach((n) => b.delete(n.ref));
    await b.commit();
  }
  // One batch, so the username is released in the same write that removes the profile.
  const batch = writeBatch(db);
  batch.delete(doc(db, 'stats', uid));
  batch.delete(doc(db, 'users', uid, 'private', 'settings'));
  if (usernameLower) batch.delete(doc(db, 'usernames', usernameLower));
  batch.delete(doc(db, 'users', uid));
  await batch.commit();
  await deleteUser(user);
}
