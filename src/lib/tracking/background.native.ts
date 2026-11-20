import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';

import { Colors } from '@/constants/theme';
import { toFix } from './location';
import type { RawFix } from './session';

export const LOCATION_TASK = 'pacenation-activity-location';

let handler: ((fixes: RawFix[]) => void) | null = null;

/**
 * Must run at app start-up (it is called from the tracker store module, which
 * the root layout imports) so the OS can wake the task after a restart.
 */
export function registerBackgroundTask(onFixes: (fixes: RawFix[]) => void): void {
  handler = onFixes;
  if (TaskManager.isTaskDefined(LOCATION_TASK)) return;
  TaskManager.defineTask<{ locations: Location.LocationObject[] }>(LOCATION_TASK, async ({ data, error }) => {
    if (error || !data?.locations?.length) return;
    handler?.(data.locations.map(toFix));
  });
}

/** Starts background updates if the user allows it. Returns false when only foreground tracking is possible. */
export async function startBackgroundUpdates(): Promise<boolean> {
  try {
    const bg = await Location.requestBackgroundPermissionsAsync();
    if (bg.status !== 'granted') return false;
    if (await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK)) return true;
    await Location.startLocationUpdatesAsync(LOCATION_TASK, {
      accuracy: Location.Accuracy.BestForNavigation,
      timeInterval: 1000,
      distanceInterval: 2,
      activityType: Location.ActivityType.Fitness,
      pausesUpdatesAutomatically: false,
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: 'PaceNation is tracking your activity',
        notificationBody: 'Open the app to pause or finish.',
        notificationColor: Colors.primary,
        killServiceOnDestroy: false,
      },
    });
    return true;
  } catch {
    return false;
  }
}

export async function stopBackgroundUpdates(): Promise<void> {
  try {
    if (await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK)) await Location.stopLocationUpdatesAsync(LOCATION_TASK);
  } catch {
    // already stopped
  }
}
