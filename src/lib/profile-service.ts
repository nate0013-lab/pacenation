import {
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';

import { db, storage } from './firebase';
import { DEFAULT_PRIVACY, type PrivacySettings, type PrivateSettings, type UserProfile } from './types';
import { normalizeUsername } from './validation';

export async function isUsernameAvailable(raw: string, myUid?: string): Promise<boolean> {
  const snap = await getDoc(doc(db, 'usernames', normalizeUsername(raw)));
  return !snap.exists() || snap.data()?.uid === myUid;
}

/** Uploads a picked image to `avatars/{uid}/avatar.jpg` and returns its URL. */
export async function uploadAvatar(uid: string, localUri: string): Promise<string> {
  const blob = await (await fetch(localUri)).blob();
  const avatarRef = ref(storage, `avatars/${uid}/avatar.jpg`);
  await uploadBytes(avatarRef, blob, { contentType: 'image/jpeg' });
  return getDownloadURL(avatarRef);
}

export interface NewProfileInput {
  uid: string;
  email: string;
  username: string;
  displayName: string;
  bio: string;
  weightKg: number | null;
  photoUri: string | null;
}

/**
 * Creates the profile card, reserves the username and stores private
 * settings. The username reservation and profile share one transaction so two
 * people can never claim the same name.
 */
export async function createProfile(input: NewProfileInput): Promise<void> {
  const usernameLower = normalizeUsername(input.username);
  const photoURL = input.photoUri ? await uploadAvatar(input.uid, input.photoUri) : null;

  await runTransaction(db, async (tx) => {
    const nameRef = doc(db, 'usernames', usernameLower);
    const existing = await tx.get(nameRef);
    if (existing.exists() && existing.data().uid !== input.uid) {
      throw new Error('PN:That username was just taken. Try another.');
    }
    tx.set(nameRef, { uid: input.uid });
    const profile: Omit<UserProfile, 'uid' | 'createdAt' | 'updatedAt'> & Record<string, unknown> = {
      username: input.username.trim().replace(/^@/, ''),
      usernameLower,
      displayName: input.displayName.trim(),
      bio: input.bio.trim(),
      photoURL,
      xp: 0,
      level: 1,
      followerCount: 0,
      followingCount: 0,
      privacy: DEFAULT_PRIVACY,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    tx.set(doc(db, 'users', input.uid), profile);
  });

  const settings: PrivateSettings = {
    email: input.email,
    weightKg: input.weightKg,
    units: 'metric',
    notifications: { followers: true, likesAndComments: true, challenges: true, events: true, milestones: true },
  };
  await setDoc(doc(db, 'users', input.uid, 'private', 'settings'), settings);
}

export interface ProfileEdit {
  displayName: string;
  bio: string;
  username: string;
  photoUri: string | null;
  weightKg: number | null;
}

export async function updateProfile(current: UserProfile, edit: ProfileEdit): Promise<void> {
  const uid = current.uid;
  const photoURL = edit.photoUri ? await uploadAvatar(uid, edit.photoUri) : current.photoURL;
  const newLower = normalizeUsername(edit.username);

  await runTransaction(db, async (tx) => {
    if (newLower !== current.usernameLower) {
      const newRef = doc(db, 'usernames', newLower);
      const taken = await tx.get(newRef);
      if (taken.exists() && taken.data().uid !== uid) throw new Error('PN:That username is taken. Try another.');
      tx.delete(doc(db, 'usernames', current.usernameLower));
      tx.set(newRef, { uid });
    }
    tx.update(doc(db, 'users', uid), {
      displayName: edit.displayName.trim(),
      bio: edit.bio.trim(),
      username: edit.username.trim().replace(/^@/, ''),
      usernameLower: newLower,
      photoURL,
      updatedAt: serverTimestamp(),
    });
  });
  await updateDoc(doc(db, 'users', uid, 'private', 'settings'), { weightKg: edit.weightKg });
}

export async function getPrivateSettings(uid: string): Promise<PrivateSettings | null> {
  const snap = await getDoc(doc(db, 'users', uid, 'private', 'settings'));
  return snap.exists() ? (snap.data() as PrivateSettings) : null;
}

export function updatePrivacy(uid: string, privacy: PrivacySettings) {
  return updateDoc(doc(db, 'users', uid), { privacy, updatedAt: serverTimestamp() });
}
