import AsyncStorage from '@react-native-async-storage/async-storage';
import type { FirebaseApp } from 'firebase/app';
import * as FirebaseAuth from 'firebase/auth';

/**
 * Android and iOS: persist the session with AsyncStorage so users stay signed
 * in between launches. `getReactNativePersistence` only exists in the React
 * Native build of firebase/auth, which Metro resolves on device.
 */
const { getReactNativePersistence } = FirebaseAuth as unknown as {
  getReactNativePersistence: (storage: typeof AsyncStorage) => FirebaseAuth.Persistence;
};

export function createAuth(app: FirebaseApp): FirebaseAuth.Auth {
  return FirebaseAuth.initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
}
