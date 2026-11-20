import {
  EmailAuthProvider,
  createUserWithEmailAndPassword,
  deleteUser,
  reauthenticateWithCredential,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
} from 'firebase/auth';
import { doc, writeBatch } from 'firebase/firestore';

import { auth, db } from './firebase';

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
export async function deleteAccount(password: string, usernameLower: string | null) {
  const user = auth.currentUser;
  if (!user || !user.email) throw new Error('PN:You need to be signed in.');
  await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, password));
  const uid = user.uid;
  // One batch, so the username is released in the same write that removes the profile.
  const batch = writeBatch(db);
  batch.delete(doc(db, 'users', uid, 'private', 'settings'));
  if (usernameLower) batch.delete(doc(db, 'usernames', usernameLower));
  batch.delete(doc(db, 'users', uid));
  await batch.commit();
  await deleteUser(user);
}
