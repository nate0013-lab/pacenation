import { getApp, getApps, initializeApp, type FirebaseOptions } from 'firebase/app';
import { connectAuthEmulator } from 'firebase/auth';
import { connectFirestoreEmulator, initializeFirestore } from 'firebase/firestore';
import { connectStorageEmulator, getStorage } from 'firebase/storage';

import { createAuth } from './auth-init';

/**
 * Firebase is configured from EXPO_PUBLIC_* variables (see .env.example).
 * Set EXPO_PUBLIC_USE_FIREBASE_EMULATOR=1 to run against the local emulator
 * suite instead of a real project.
 */
const useEmulator = process.env.EXPO_PUBLIC_USE_FIREBASE_EMULATOR === '1';

const config: FirebaseOptions = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? (useEmulator ? 'demo-key' : undefined),
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? (useEmulator ? 'demo-pacenation' : undefined),
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? (useEmulator ? 'demo-pacenation.appspot.com' : undefined),
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

export const isFirebaseConfigured = Boolean(config.apiKey && config.projectId);

const firstInit = getApps().length === 0;
export const app = firstInit ? initializeApp(config) : getApp();
export const auth = createAuth(app);
export const db = initializeFirestore(app, { ignoreUndefinedProperties: true });
export const storage = getStorage(app);

if (useEmulator && firstInit) {
  const host = process.env.EXPO_PUBLIC_EMULATOR_HOST ?? 'localhost';
  connectAuthEmulator(auth, `http://${host}:9099`, { disableWarnings: true });
  connectFirestoreEmulator(db, host, 8080);
  connectStorageEmulator(storage, host, 9199);
}
