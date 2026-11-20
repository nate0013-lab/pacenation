import { getApp, getApps, initializeApp, type FirebaseOptions } from 'firebase/app';
import { connectAuthEmulator } from 'firebase/auth';
import { connectFirestoreEmulator, initializeFirestore } from 'firebase/firestore';

import { createAuth } from './auth-init';

/**
 * Set EXPO_PUBLIC_USE_FIREBASE_EMULATOR=1 to run against the local emulator
 * suite instead of a real project.
 */
const useEmulator = process.env.EXPO_PUBLIC_USE_FIREBASE_EMULATOR === '1';

/**
 * The pacenation-958d2 web app config. These values are public identifiers,
 * not secrets: access is controlled by the security rules in /firebase.
 * EXPO_PUBLIC_FIREBASE_* variables override them (for example a staging project).
 */
const PROJECT_CONFIG: FirebaseOptions = {
  apiKey: 'AIzaSyB3ETmPkIWRg_eCx-8VGcRz18KVnpk_TFQ',
  authDomain: 'pacenation-958d2.firebaseapp.com',
  projectId: 'pacenation-958d2',
  storageBucket: 'pacenation-958d2.firebasestorage.app',
  messagingSenderId: '421707834426',
  appId: '1:421707834426:web:47646bde8825c2deff4103',
};

const EMULATOR_CONFIG: FirebaseOptions = {
  apiKey: 'demo-key',
  projectId: 'demo-pacenation',
};

const base = useEmulator ? EMULATOR_CONFIG : PROJECT_CONFIG;
const config: FirebaseOptions = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || base.apiKey,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || base.authDomain,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || base.projectId,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || base.storageBucket,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || base.messagingSenderId,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || base.appId,
};

export const isFirebaseConfigured = Boolean(config.apiKey && config.projectId);

const firstInit = getApps().length === 0;
export const app = firstInit ? initializeApp(config) : getApp();
export const auth = createAuth(app);
export const db = initializeFirestore(app, { ignoreUndefinedProperties: true });

if (useEmulator && firstInit) {
  const host = process.env.EXPO_PUBLIC_EMULATOR_HOST ?? 'localhost';
  connectAuthEmulator(auth, `http://${host}:9099`, { disableWarnings: true });
  connectFirestoreEmulator(db, host, 8080);
}
