import { describe, expect, jest, test } from '@jest/globals';

jest.mock('../firebase', () => ({ db: {} }));
jest.mock('@react-native-async-storage/async-storage', () => ({ getItem: jest.fn(), setItem: jest.fn(), removeItem: jest.fn() }));

import { buildActivityDoc, fromStored, toStored } from '../activities-service';
import { decodePolyline } from '../tracking/geo';
import { initialSession, sessionReducer, type SessionAction } from '../tracking/session';

describe('buildActivityDoc', () => {
  test('turns a finished session into a valid activity document', () => {
    const t0 = 1_763_000_000_000;
    const actions: SessionAction[] = [{ type: 'prepare', sport: 'run', weightKg: 70 }, { type: 'start', now: t0 }];
    for (let i = 0; i <= 300; i++) actions.push({ type: 'fix', fix: { lat: 51.5 + i * 0.00003, lng: -0.12, alt: 20 + (i % 50 === 0 ? 5 : 0), acc: 5, t: t0 + i * 1000 } });
    actions.push({ type: 'finish', now: t0 + 300_000 });
    const session = actions.reduce(sessionReducer, initialSession);
    const d = buildActivityDoc({ id: 'x', ownerId: 'u1', title: '  Morning Run  ', visibility: 'public', session });
    expect(d.ownerId).toBe('u1');
    expect(d.title).toBe('Morning Run');
    expect(d.distanceM).toBeGreaterThan(990);
    expect(d.distanceM).toBeLessThan(1010);
    expect(d.movingTimeS).toBe(300);
    expect(d.elapsedTimeS).toBeGreaterThanOrEqual(d.movingTimeS);
    expect(d.avgPaceSPerKm).toBeGreaterThan(295);
    expect(d.avgPaceSPerKm).toBeLessThan(305);
    expect(d.likeCount).toBe(0);
    expect(d.start).toEqual({ lat: 51.5, lng: -0.12 });
    // a straight line simplifies to its two ends
    expect(decodePolyline(d.polyline)).toHaveLength(2);
    expect(d.pointCount).toBe(301);
  });

  test('stored points round-trip with short keys', () => {
    const p = { lat: 51.1234567, lng: -0.7654321, alt: 12.34, t: 5, acc: 4.56, seg: 2 };
    expect(fromStored(toStored(p))).toEqual({ lat: 51.123457, lng: -0.765432, alt: 12.3, t: 5, acc: 4.6, seg: 2 });
  });
});

import { shareText } from '../activities-service';

describe('shareText', () => {
  test('summarises runs and rides', () => {
    expect(shareText({ title: 'Lakeside tempo', sport: 'run', distanceM: 5230, movingTimeS: 1512, avgPaceSPerKm: 289, avgSpeedMps: 3.46, elevationGainM: 42 })).toBe(
      'Lakeside tempo: I ran 5.23 km in 25:12 (4:49 /km average pace, 42 m climbed) on PaceNation. Where Every Kilometre Matters.',
    );
    expect(shareText({ title: 'Coast', sport: 'ride', distanceM: 40000, movingTimeS: 4800, avgPaceSPerKm: 120, avgSpeedMps: 8.33, elevationGainM: null })).toBe(
      'Coast: I rode 40.00 km in 80:00 (30.0 km/h average) on PaceNation. Where Every Kilometre Matters.',
    );
  });
});
