import { Platform } from 'react-native';

/**
 * Google and Apple sign-in switch on once their IDs are configured, so the
 * buttons never appear before they can work. Set these in a `.env` file or in
 * the EAS build profile:
 *   EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID      Firebase console > Authentication > Google > Web client ID
 *   EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID      Google Cloud iOS OAuth client (iOS builds)
 *   EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID  Google Cloud Android OAuth client (Android builds)
 *   EXPO_PUBLIC_APPLE_SIGN_IN=1           after enabling Apple in Firebase (iOS only)
 */
export const GOOGLE_IDS = {
  web: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '',
  ios: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? '',
  android: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? '',
};

export function googleEnabled(os: string = Platform.OS): boolean {
  if (!GOOGLE_IDS.web) return false;
  if (os === 'ios') return !!GOOGLE_IDS.ios;
  if (os === 'android') return !!GOOGLE_IDS.android;
  return true;
}

export function appleEnabled(os: string = Platform.OS): boolean {
  return os === 'ios' && process.env.EXPO_PUBLIC_APPLE_SIGN_IN === '1';
}
