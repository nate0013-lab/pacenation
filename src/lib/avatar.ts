import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

/** Largest stored avatar, as a data URL. Firestore documents can hold 1 MB. */
export const MAX_AVATAR_CHARS = 200_000;

/**
 * Turns a picked photo into the value stored in `users/{uid}.photoURL`.
 *
 * PaceNation runs on the free Firebase plan, so photos are kept in Firestore
 * as small JPEG data URLs (256 px, usually 15 to 30 KB) instead of Cloud
 * Storage. To move to Storage later, upload the file here and return its
 * download URL; nothing else in the app needs to change.
 */
export async function avatarToPhotoURL(localUri: string): Promise<string> {
  const rendered = await ImageManipulator.manipulate(localUri).resize({ width: 256, height: 256 }).renderAsync();
  for (const compress of [0.7, 0.5, 0.35]) {
    const out = await rendered.saveAsync({ format: SaveFormat.JPEG, compress, base64: true });
    if (out.base64) {
      const url = `data:image/jpeg;base64,${out.base64}`;
      if (url.length <= MAX_AVATAR_CHARS) return url;
    }
  }
  throw new Error('PN:That photo is too large. Try a different one.');
}
