import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

import type { Sport } from '../types';
import { registerBackgroundTask, startBackgroundUpdates, stopBackgroundUpdates } from './background';
import { requestLocationPermission, startForegroundWatch, stopForegroundWatch, type PermissionResult } from './location';
import { initialSession, sessionReducer, type RawFix, type SessionAction, type SessionState } from './session';

const STORAGE_KEY = 'pacenation.activeSession.v1';

let state: SessionState = initialSession;
let backgroundOn = false;
const listeners = new Set<() => void>();

function dispatch(action: SessionAction) {
  const next = sessionReducer(state, action);
  if (next === state) return;
  state = next;
  listeners.forEach((l) => l());
  schedulePersist();
}

function pushFix(fix: RawFix) {
  // Foreground and background sources can both deliver the same fix.
  if (state.lastFix && fix.t <= state.lastFix.t) return;
  dispatch({ type: 'fix', fix });
}

registerBackgroundTask((fixes) => fixes.forEach(pushFix));

// ---- persistence, so an activity survives the app being closed ----
let persistTimer: ReturnType<typeof setTimeout> | null = null;
function schedulePersist() {
  if (persistTimer) return;
  persistTimer = setTimeout(() => {
    persistTimer = null;
    const active = state.status === 'running' || state.status === 'paused' || state.status === 'finished';
    (active ? AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)) : AsyncStorage.removeItem(STORAGE_KEY)).catch(() => undefined);
  }, 3000);
}

let restored = false;
export async function restoreSession(): Promise<void> {
  if (restored) return;
  restored = true;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw) as SessionState;
    if (saved.status === 'running' || saved.status === 'paused' || saved.status === 'finished') {
      await stopBackgroundUpdates();
      dispatch({ type: 'restore', state: saved, now: Date.now() });
    }
  } catch {
    // A corrupt save is ignored.
  }
}

// ---- public controller ----
export const tracker = {
  getState: () => state,
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  /** Asks for permission and starts listening for GPS so the signal shows before Start. */
  async prepare(sport: Sport, weightKg: number | null): Promise<PermissionResult> {
    await restoreSession();
    const perm = await requestLocationPermission();
    if (perm !== 'granted') return perm;
    dispatch({ type: 'prepare', sport, weightKg });
    await startForegroundWatch(pushFix);
    return perm;
  },
  setSport: (sport: Sport) => dispatch({ type: 'setSport', sport }),
  async start(): Promise<{ background: boolean }> {
    dispatch({ type: 'start', now: Date.now() });
    backgroundOn = await startBackgroundUpdates();
    return { background: backgroundOn };
  },
  pause: () => dispatch({ type: 'pause', now: Date.now() }),
  async resume() {
    await startForegroundWatch(pushFix);
    dispatch({ type: 'resume', now: Date.now() });
    if (!backgroundOn) backgroundOn = await startBackgroundUpdates();
  },
  async finish() {
    dispatch({ type: 'finish', now: Date.now() });
    stopForegroundWatch();
    await stopBackgroundUpdates();
    backgroundOn = false;
  },
  /** Discards the session (after saving, or when the user throws it away). */
  async reset() {
    stopForegroundWatch();
    await stopBackgroundUpdates();
    backgroundOn = false;
    dispatch({ type: 'reset' });
    await AsyncStorage.removeItem(STORAGE_KEY).catch(() => undefined);
  },
  /** Stops listening for GPS when the user leaves the tracker without starting. */
  release() {
    if (state.status === 'ready' || state.status === 'idle') {
      stopForegroundWatch();
      dispatch({ type: 'reset' });
    }
  },
  /** Test hook: feed a fix directly. */
  pushFix,
};

export function useTracker(): SessionState {
  return useSyncExternalStore(tracker.subscribe, tracker.getState, tracker.getState);
}
