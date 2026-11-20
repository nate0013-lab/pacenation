/**
 * Location source. Foreground updates come from watchPositionAsync on every
 * platform. On Android and iOS, ./background.native.ts adds a background task
 * so tracking continues with the screen off.
 */
import * as Location from 'expo-location';

import type { RawFix } from './session';

export type PermissionResult = 'granted' | 'denied' | 'services-off';

export async function requestLocationPermission(): Promise<PermissionResult> {
  try {
    const enabled = await Location.hasServicesEnabledAsync();
    if (!enabled) return 'services-off';
  } catch {
    // Not available on every platform; fall through to the permission request.
  }
  const { status } = await Location.requestForegroundPermissionsAsync();
  return status === 'granted' ? 'granted' : 'denied';
}

export function toFix(loc: Location.LocationObject): RawFix {
  return {
    lat: loc.coords.latitude,
    lng: loc.coords.longitude,
    alt: loc.coords.altitude ?? null,
    acc: loc.coords.accuracy ?? 999,
    t: loc.timestamp,
  };
}

let watch: Location.LocationSubscription | null = null;

export async function startForegroundWatch(onFix: (fix: RawFix) => void): Promise<void> {
  if (watch) return;
  watch = await Location.watchPositionAsync(
    { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 1000, distanceInterval: 0 },
    (loc) => onFix(toFix(loc)),
  );
}

export function stopForegroundWatch(): void {
  watch?.remove();
  watch = null;
}
