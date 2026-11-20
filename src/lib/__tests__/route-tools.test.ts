import { describe, expect, test } from '@jest/globals';

import type { TrackPoint } from '../tracking/geo';
import { cumulative, elevationProfile, gpxFileName, kmSplits, prepareReplay, replayAt, toGpx } from '../tracking/route-tools';

// ~3.34 m/s north, one point per second; 0.00003 deg lat = 3.336 m
const line = (n: number, seg = 0, t0 = 0, lat0 = 0, alt: ((i: number) => number) | null = null): TrackPoint[] =>
  Array.from({ length: n }, (_, i) => ({ lat: lat0 + i * 0.00003, lng: 0, alt: alt ? alt(i) : null, t: t0 + i * 1000, acc: 5, seg }));

describe('route tools', () => {
  test('GPX has one segment per stretch, escaped names, elevation and times', () => {
    const pts = [...line(3, 0, 0), ...line(2, 1, 60_000, 0.01, () => 12.34)];
    const gpx = toGpx({ title: 'Hills & <Views>', sport: 'run', startedAt: 0 }, pts);
    expect(gpx).toContain('<gpx version="1.1" creator="PaceNation"');
    expect(gpx).toContain('<name>Hills &amp; &lt;Views&gt;</name>');
    expect(gpx.match(/<trkseg>/g)).toHaveLength(2);
    expect(gpx.match(/<trkpt /g)).toHaveLength(5);
    expect(gpx).toContain('<ele>12.3</ele>');
    expect(gpx).toContain('<time>1970-01-01T00:00:00.000Z</time>');
    expect(gpx).toContain('<type>running</type>');
  });

  test('file names are safe', () => {
    expect(gpxFileName('Morning Run: Lakeside!', new Date(2026, 10, 20).getTime())).toBe('pacenation-2026-11-20-morning-run-lakeside.gpx');
  });

  test('cumulative skips pauses', () => {
    const pts = [...line(11, 0, 0), ...line(11, 1, 100_000, 1)];
    const { d, t } = cumulative(pts);
    expect(t[t.length - 1]).toBe(20);
    expect(d[d.length - 1]).toBeCloseTo(66.7, 0);
  });

  test('km splits by moving time with a partial final split', () => {
    const pts = line(751); // 750 s, ~2502 m
    const s = kmSplits(pts);
    expect(s).toHaveLength(3);
    expect(s[0].index).toBe(1);
    expect(s[0].timeS).toBeCloseTo(299.7, 0);
    expect(s[2].distanceM).toBeCloseTo(502, 0);
    expect(s[2].paceSPerKm).toBeCloseTo(299.7, 0);
    expect(kmSplits(line(20))).toHaveLength(0); // 63 m: too short for a split
  });

  test('elevation profile is thinned and null without altitude', () => {
    expect(elevationProfile(line(50))).toBeNull();
    const prof = elevationProfile(line(1000, 0, 0, 0, (i) => 100 + i / 10), 100)!;
    expect(prof).toHaveLength(100);
    expect(prof[0].alt).toBe(100);
    expect(prof[99].alt).toBeCloseTo(199.9, 1);
  });

  test('replay interpolates position, distance and the travelled path', () => {
    const r = prepareReplay(line(101));
    expect(r.totalS).toBe(100);
    const half = replayAt(r, 0.5);
    expect(half.timeS).toBe(50);
    expect(half.distanceM).toBeCloseTo(166.8, 0);
    expect(half.position!.lat).toBeCloseTo(0.0015, 6);
    expect(replayAt(r, 1).distanceM).toBeCloseTo(r.totalM, 3);
    expect(replayAt(r, 0).travelled.length).toBeGreaterThanOrEqual(1);
  });

  test('long routes are simplified for replay', () => {
    const zig = Array.from({ length: 3000 }, (_, i) => ({ lat: i * 0.00003, lng: (i % 2) * 0.00002, alt: null, t: i * 1000, acc: 5, seg: 0 }));
    expect(prepareReplay(zig, 600).points.length).toBeLessThanOrEqual(600);
  });
});
