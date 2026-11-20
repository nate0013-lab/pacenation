/**
 * Tracker session state as a pure reducer. The store in ./store.ts wraps it
 * with subscriptions, persistence and the location source.
 */
import type { Sport } from '../types';
import {
  caloriesKcal,
  elevationGainM,
  judgeFix,
  paceSecPerKm,
  recentSpeedMps,
  speedToPace,
  type TrackPoint,
} from './geo';

export type TrackerStatus = 'idle' | 'ready' | 'running' | 'paused' | 'finished';

export interface RawFix {
  lat: number;
  lng: number;
  alt: number | null;
  acc: number;
  t: number;
}

export interface SessionState {
  status: TrackerStatus;
  sport: Sport;
  startedAt: number | null;
  endedAt: number | null;
  points: TrackPoint[];
  distanceM: number;
  /** Moving time banked before the current running stretch, in ms. */
  bankedMs: number;
  runningSince: number | null;
  seg: number;
  maxSpeedMps: number;
  /** Latest fix from the device, accepted or not: drives the GPS signal indicator. */
  lastFix: RawFix | null;
  rejected: number;
  weightKg: number | null;
}

export type SessionAction =
  | { type: 'prepare'; sport: Sport; weightKg: number | null }
  | { type: 'setSport'; sport: Sport }
  | { type: 'fix'; fix: RawFix }
  | { type: 'start'; now: number }
  | { type: 'pause'; now: number }
  | { type: 'resume'; now: number }
  | { type: 'finish'; now: number }
  | { type: 'restore'; state: SessionState; now: number }
  | { type: 'reset' };

export const initialSession: SessionState = {
  status: 'idle',
  sport: 'run',
  startedAt: null,
  endedAt: null,
  points: [],
  distanceM: 0,
  bankedMs: 0,
  runningSince: null,
  seg: 0,
  maxSpeedMps: 0,
  lastFix: null,
  rejected: 0,
  weightKg: null,
};

export function sessionReducer(s: SessionState, a: SessionAction): SessionState {
  switch (a.type) {
    case 'prepare':
      if (s.status === 'running' || s.status === 'paused') return s;
      return { ...initialSession, status: 'ready', sport: a.sport, weightKg: a.weightKg, lastFix: s.lastFix };
    case 'setSport':
      return s.status === 'ready' ? { ...s, sport: a.sport } : s;
    case 'fix': {
      const withFix = { ...s, lastFix: a.fix };
      if (s.status !== 'running') return withFix;
      const prev = s.points.length ? s.points[s.points.length - 1] : null;
      const verdict = judgeFix(prev, a.fix, s.sport, prev?.seg === s.seg);
      if (!verdict.accept) return { ...withFix, rejected: s.rejected + 1 };
      const point: TrackPoint = { ...a.fix, seg: s.seg };
      const segSpeed = prev && prev.seg === s.seg ? verdict.distanceM / Math.max(1, (a.fix.t - prev.t) / 1000) : 0;
      return {
        ...withFix,
        points: [...s.points, point],
        distanceM: s.distanceM + verdict.distanceM,
        maxSpeedMps: Math.max(s.maxSpeedMps, segSpeed),
      };
    }
    case 'start':
      if (s.status !== 'ready') return s;
      return { ...s, status: 'running', startedAt: a.now, runningSince: a.now };
    case 'pause':
      if (s.status !== 'running') return s;
      return { ...s, status: 'paused', bankedMs: s.bankedMs + (a.now - (s.runningSince ?? a.now)), runningSince: null };
    case 'resume':
      if (s.status !== 'paused') return s;
      return { ...s, status: 'running', runningSince: a.now, seg: s.seg + 1 };
    case 'finish': {
      if (s.status !== 'running' && s.status !== 'paused') return s;
      const banked = s.status === 'running' ? s.bankedMs + (a.now - (s.runningSince ?? a.now)) : s.bankedMs;
      return { ...s, status: 'finished', bankedMs: banked, runningSince: null, endedAt: a.now };
    }
    case 'restore': {
      // After the app was closed mid-activity, come back paused so nothing is counted while it was gone.
      const st = a.state;
      if (st.status === 'running') {
        const lastT = st.points.length ? st.points[st.points.length - 1].t : (st.runningSince ?? a.now);
        return { ...st, status: 'paused', bankedMs: st.bankedMs + Math.max(0, lastT - (st.runningSince ?? lastT)), runningSince: null };
      }
      return st;
    }
    case 'reset':
      return { ...initialSession, lastFix: s.lastFix };
  }
}

export function movingTimeS(s: SessionState, now: number): number {
  return (s.bankedMs + (s.runningSince !== null ? now - s.runningSince : 0)) / 1000;
}

export interface LiveMetrics {
  distanceM: number;
  movingTimeS: number;
  elapsedTimeS: number;
  avgPaceSPerKm: number | null;
  currentPaceSPerKm: number | null;
  currentSpeedMps: number | null;
  avgSpeedMps: number;
  maxSpeedMps: number;
  calories: number;
  elevationGainM: number | null;
}

export function liveMetrics(s: SessionState, now: number): LiveMetrics {
  const moving = movingTimeS(s, now);
  const end = s.endedAt ?? now;
  const current = s.status === 'running' ? recentSpeedMps(s.points, 30, now) : null;
  return {
    distanceM: s.distanceM,
    movingTimeS: moving,
    elapsedTimeS: s.startedAt !== null ? Math.max(moving, (end - s.startedAt) / 1000) : 0,
    avgPaceSPerKm: paceSecPerKm(s.distanceM, moving),
    currentPaceSPerKm: speedToPace(current),
    currentSpeedMps: current,
    avgSpeedMps: moving > 0 ? s.distanceM / moving : 0,
    maxSpeedMps: s.maxSpeedMps,
    calories: caloriesKcal(s.sport, s.distanceM, moving, s.weightKg),
    elevationGainM: elevationGainM(s.points),
  };
}
