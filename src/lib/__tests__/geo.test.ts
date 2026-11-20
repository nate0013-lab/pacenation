import { describe, expect, test } from '@jest/globals';

import {
  caloriesKcal,
  decodePolyline,
  defaultTitle,
  elevationGainM,
  encodePolyline,
  haversineM,
  judgeFix,
  recentSpeedMps,
  simplify,
  type TrackPoint,
} from '../tracking/geo';

const pt = (lat: number, lng: number, t: number, extra: Partial<TrackPoint> = {}): TrackPoint => ({ lat, lng, alt: null, t, acc: 5, seg: 0, ...extra });

describe('geo', () => {
  test('haversine matches known distances', () => {
    // 0.001 degree of latitude is about 111.2 m
    expect(haversineM({ lat: 0, lng: 0 }, { lat: 0.001, lng: 0 })).toBeCloseTo(111.2, 0);
    // London to Paris, about 343.5 km
    expect(haversineM({ lat: 51.5074, lng: -0.1278 }, { lat: 48.8566, lng: 2.3522 }) / 1000).toBeCloseTo(343.5, 0);
  });

  test('judgeFix rejects inaccurate fixes, jumps and jitter', () => {
    const prev = pt(0, 0, 0);
    expect(judgeFix(prev, { ...pt(0.0001, 0, 5000), acc: 60 }, 'run', true)).toEqual({ accept: false, reason: 'inaccurate' });
    // 1.1 km in 5 s is far too fast for a run
    expect(judgeFix(prev, pt(0.01, 0, 5000), 'run', true)).toEqual({ accept: false, reason: 'too-fast' });
    // 1 m move with 5 m accuracy is noise
    expect(judgeFix(prev, pt(0.000009, 0, 5000), 'run', true)).toEqual({ accept: false, reason: 'jitter' });
    const ok = judgeFix(prev, pt(0.0001, 0, 5000), 'run', true);
    expect(ok.accept).toBe(true);
    // first point of a new segment adds no distance
    expect(judgeFix(prev, pt(0.002, 0, 5000), 'run', false)).toEqual({ accept: true, distanceM: 0 });
  });

  test('a ride allows speeds a run does not', () => {
    const prev = pt(0, 0, 0);
    const next = pt(0.0009, 0, 10000); // 100 m in 10 s = 36 km/h
    expect(judgeFix(prev, next, 'run', true).accept).toBe(false);
    expect(judgeFix(prev, next, 'ride', true).accept).toBe(true);
  });

  test('recent speed uses the trailing window of the current segment', () => {
    const pts = Array.from({ length: 31 }, (_, i) => pt(i * 0.00003, 0, i * 1000)); // ~3.34 m/s
    expect(recentSpeedMps(pts)!).toBeCloseTo(3.34, 1);
    expect(recentSpeedMps(pts, 30, 30000 + 20000)).toBe(0);
    expect(recentSpeedMps(pts.slice(0, 3))).toBeNull();
  });

  test('calories scale with weight and effort', () => {
    // 5 km run in 25 min at 70 kg: MET 11.8 x 70 x 0.4167 h = 344
    expect(caloriesKcal('run', 5000, 1500, 70)).toBe(344);
    expect(caloriesKcal('run', 5000, 1500, 90)).toBeGreaterThan(344);
    expect(caloriesKcal('walk', 0, 0, 70)).toBe(0);
    expect(caloriesKcal('ride', 20000, 3600, null)).toBe(Math.round(8.0 * 70));
  });

  test('elevation gain ignores small wobbles', () => {
    const alts = [100, 101, 99, 100, 106, 105, 112, 108, 120];
    const pts = alts.map((alt, i) => pt(0, 0, i, { alt }));
    expect(elevationGainM(pts)).toBe(24); // 100->112 (12), dip to 108, 108->120 (12)
    expect(elevationGainM([pt(0, 0, 0)])).toBeNull();
  });

  test('polyline round-trips', () => {
    const route = [
      { lat: 38.5, lng: -120.2 },
      { lat: 40.7, lng: -120.95 },
      { lat: 43.252, lng: -126.453 },
    ];
    expect(encodePolyline(route)).toBe('_p~iF~ps|U_ulLnnqC_mqNvxq`@');
    expect(decodePolyline(encodePolyline(route))).toEqual(route);
  });

  test('simplify drops points on a straight line', () => {
    const line = Array.from({ length: 50 }, (_, i) => ({ lat: i * 0.0001, lng: 0 }));
    expect(simplify(line, 2)).toHaveLength(2);
    const corner = [...line, { lat: 0.0049, lng: 0.002 }];
    expect(simplify(corner, 2).length).toBe(3);
  });

  test('default titles follow the time of day', () => {
    expect(defaultTitle('run', new Date(2026, 0, 1, 7))).toBe('Morning Run');
    expect(defaultTitle('ride', new Date(2026, 0, 1, 18))).toBe('Evening Ride');
  });
});
