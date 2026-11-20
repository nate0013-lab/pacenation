/**
 * Pure GPS maths for the tracker: distance, filtering, pace, calories,
 * elevation and route simplification. No React or Expo imports, so it is
 * fully unit-tested.
 */
import type { Sport } from '../types';

export interface LatLng {
  lat: number;
  lng: number;
}

export interface TrackPoint extends LatLng {
  /** Altitude in metres, when the device reports it. */
  alt: number | null;
  /** Epoch milliseconds. */
  t: number;
  /** Horizontal accuracy radius in metres. */
  acc: number;
  /** Segment number; it increases after every pause so no distance is counted across a pause. */
  seg: number;
}

const R = 6371008.8; // mean Earth radius in metres
const rad = (d: number) => (d * Math.PI) / 180;

export function haversineM(a: LatLng, b: LatLng): number {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Per-sport limits used to reject bad GPS fixes. */
export const SPORT_LIMITS: Record<Sport, { maxAccuracyM: number; maxSpeedMps: number }> = {
  walk: { maxAccuracyM: 25, maxSpeedMps: 4 }, // 14.4 km/h
  run: { maxAccuracyM: 25, maxSpeedMps: 8 }, // 28.8 km/h
  ride: { maxAccuracyM: 30, maxSpeedMps: 28 }, // 100 km/h
};

/** Accuracy at or below this is shown as a strong signal. */
export const GOOD_ACCURACY_M = 12;

export type FixVerdict =
  | { accept: true; distanceM: number }
  | { accept: false; reason: 'inaccurate' | 'too-fast' | 'jitter' | 'stale' };

/**
 * Decides whether a new fix extends the route.
 * - Fixes with a large accuracy radius are dropped.
 * - Fixes implying an impossible speed for the sport are dropped (GPS jumps).
 * - Moves smaller than the combined noise are treated as standing still.
 */
export function judgeFix(prev: TrackPoint | null, next: Omit<TrackPoint, 'seg'>, sport: Sport, sameSegment: boolean): FixVerdict {
  const limits = SPORT_LIMITS[sport];
  if (!Number.isFinite(next.lat) || !Number.isFinite(next.lng)) return { accept: false, reason: 'inaccurate' };
  if (next.acc > limits.maxAccuracyM) return { accept: false, reason: 'inaccurate' };
  if (!prev || !sameSegment) return { accept: true, distanceM: 0 };
  const dt = (next.t - prev.t) / 1000;
  if (dt <= 0) return { accept: false, reason: 'stale' };
  const d = haversineM(prev, next);
  const noise = Math.max(3, Math.min(prev.acc, next.acc) * 0.5);
  if (d < noise) return { accept: false, reason: 'jitter' };
  if (d / dt > limits.maxSpeedMps) return { accept: false, reason: 'too-fast' };
  return { accept: true, distanceM: d };
}

/** Speed over the trailing window (default 30 s) within the current segment, in m/s. */
export function recentSpeedMps(points: TrackPoint[], windowS = 30, now?: number): number | null {
  if (points.length < 2) return null;
  const last = points[points.length - 1];
  const end = now ?? last.t;
  if (end - last.t > 15000) return 0; // no movement recently
  let dist = 0;
  let i = points.length - 1;
  while (i > 0 && points[i - 1].seg === last.seg && last.t - points[i - 1].t <= windowS * 1000) {
    dist += haversineM(points[i - 1], points[i]);
    i--;
  }
  const dt = (last.t - points[i].t) / 1000;
  if (dt < 5) return null;
  return dist / dt;
}

export function paceSecPerKm(distanceM: number, timeS: number): number | null {
  if (distanceM < 10 || timeS <= 0) return null;
  return timeS / (distanceM / 1000);
}

export function speedToPace(mps: number | null): number | null {
  if (!mps || mps < 0.3) return null;
  return 1000 / mps;
}

/**
 * Calorie estimate from MET values (Compendium of Physical Activities).
 * kcal = MET x weight (kg) x hours. Weight defaults to 70 kg.
 */
export function metFor(sport: Sport, avgSpeedMps: number): number {
  const kmh = avgSpeedMps * 3.6;
  if (sport === 'walk') return kmh < 3.2 ? 2.0 : kmh < 4.8 ? 3.0 : kmh < 5.6 ? 3.8 : kmh < 6.4 ? 4.8 : 6.3;
  if (sport === 'run') return kmh < 8 ? 8.3 : kmh < 9.7 ? 9.8 : kmh < 11.3 ? 11.0 : kmh < 12.9 ? 11.8 : kmh < 14.5 ? 12.8 : 14.5;
  return kmh < 16 ? 4.0 : kmh < 19.3 ? 6.8 : kmh < 22.5 ? 8.0 : kmh < 25.7 ? 10.0 : 12.0;
}

export function caloriesKcal(sport: Sport, distanceM: number, movingTimeS: number, weightKg: number | null): number {
  if (movingTimeS <= 0) return 0;
  const met = metFor(sport, distanceM / movingTimeS);
  return Math.round(met * (weightKg ?? 70) * (movingTimeS / 3600));
}

/** Total climb in metres, ignoring wobbles under `thresholdM` (GPS altitude is noisy). */
export function elevationGainM(points: TrackPoint[], thresholdM = 4): number | null {
  const alts = points.map((p) => p.alt).filter((a): a is number => a !== null && Number.isFinite(a));
  if (alts.length < 2) return null;
  let gain = 0;
  let ref = alts[0];
  for (const a of alts.slice(1)) {
    if (a - ref >= thresholdM) {
      gain += a - ref;
      ref = a;
    } else if (ref - a >= thresholdM) {
      ref = a;
    }
  }
  return Math.round(gain);
}

/** Douglas-Peucker simplification, tolerance in metres. Keeps first and last points. */
export function simplify<T extends LatLng>(points: T[], toleranceM: number): T[] {
  if (points.length <= 2) return points.slice();
  const keep = new Uint8Array(points.length);
  keep[0] = keep[points.length - 1] = 1;
  const stack: [number, number][] = [[0, points.length - 1]];
  const lat0 = rad(points[0].lat);
  const xy = points.map((p) => [rad(p.lng) * Math.cos(lat0) * R, rad(p.lat) * R]);
  while (stack.length) {
    const [s, e] = stack.pop()!;
    let maxD = 0;
    let idx = -1;
    const [x1, y1] = xy[s];
    const [x2, y2] = xy[e];
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len2 = dx * dx + dy * dy;
    for (let i = s + 1; i < e; i++) {
      const [x, y] = xy[i];
      let d: number;
      if (len2 === 0) d = Math.hypot(x - x1, y - y1);
      else {
        const u = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / len2));
        d = Math.hypot(x - (x1 + u * dx), y - (y1 + u * dy));
      }
      if (d > maxD) {
        maxD = d;
        idx = i;
      }
    }
    if (idx !== -1 && maxD > toleranceM) {
      keep[idx] = 1;
      stack.push([s, idx], [idx, e]);
    }
  }
  return points.filter((_, i) => keep[i]);
}

/** Google encoded polyline (precision 5), used for compact route previews. */
export function encodePolyline(points: LatLng[]): string {
  let out = '';
  let pLat = 0;
  let pLng = 0;
  const enc = (v: number) => {
    let n = v < 0 ? ~(v << 1) : v << 1;
    while (n >= 0x20) {
      out += String.fromCharCode((0x20 | (n & 0x1f)) + 63);
      n >>= 5;
    }
    out += String.fromCharCode(n + 63);
  };
  for (const p of points) {
    const lat = Math.round(p.lat * 1e5);
    const lng = Math.round(p.lng * 1e5);
    enc(lat - pLat);
    enc(lng - pLng);
    pLat = lat;
    pLng = lng;
  }
  return out;
}

export function decodePolyline(str: string): LatLng[] {
  const pts: LatLng[] = [];
  let i = 0;
  let lat = 0;
  let lng = 0;
  const dec = () => {
    let result = 0;
    let shift = 0;
    let b: number;
    do {
      b = str.charCodeAt(i++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    return result & 1 ? ~(result >> 1) : result >> 1;
  };
  while (i < str.length) {
    lat += dec();
    lng += dec();
    pts.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }
  return pts;
}

export function boundsOf(points: LatLng[]): { minLat: number; maxLat: number; minLng: number; maxLng: number } | null {
  if (!points.length) return null;
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;
  for (const p of points) {
    minLat = Math.min(minLat, p.lat);
    maxLat = Math.max(maxLat, p.lat);
    minLng = Math.min(minLng, p.lng);
    maxLng = Math.max(maxLng, p.lng);
  }
  return { minLat, maxLat, minLng, maxLng };
}

export function defaultTitle(sport: Sport, start: Date): string {
  const h = start.getHours();
  const part = h < 5 ? 'Night' : h < 12 ? 'Morning' : h < 17 ? 'Afternoon' : h < 21 ? 'Evening' : 'Night';
  return `${part} ${sport === 'walk' ? 'Walk' : sport === 'run' ? 'Run' : 'Ride'}`;
}
