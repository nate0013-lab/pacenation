/** Route helpers for the activity page: GPX export, km splits, elevation profile and replay. */
import { haversineM, simplify, type LatLng, type TrackPoint } from './geo';

const xmlEscape = (s: string) => s.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c]!);

const GPX_TYPE: Record<string, string> = { walk: 'walking', run: 'running', ride: 'cycling' };

/** GPX 1.1 track, one segment per stretch between pauses. Opens in any mapping or training tool. */
export function toGpx(meta: { title: string; sport: string; startedAt: number }, points: TrackPoint[]): string {
  const segs = new Map<number, TrackPoint[]>();
  for (const p of points) {
    if (!segs.has(p.seg)) segs.set(p.seg, []);
    segs.get(p.seg)!.push(p);
  }
  const trksegs = [...segs.values()]
    .map(
      (seg) =>
        '    <trkseg>\n' +
        seg
          .map(
            (p) =>
              `      <trkpt lat="${p.lat.toFixed(6)}" lon="${p.lng.toFixed(6)}">` +
              (p.alt !== null ? `<ele>${p.alt.toFixed(1)}</ele>` : '') +
              `<time>${new Date(p.t).toISOString()}</time></trkpt>`,
          )
          .join('\n') +
        '\n    </trkseg>',
    )
    .join('\n');
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<gpx version="1.1" creator="PaceNation" xmlns="http://www.topografix.com/GPX/1/1">',
    `  <metadata><name>${xmlEscape(meta.title)}</name><time>${new Date(meta.startedAt).toISOString()}</time></metadata>`,
    '  <trk>',
    `    <name>${xmlEscape(meta.title)}</name>`,
    `    <type>${GPX_TYPE[meta.sport] ?? meta.sport}</type>`,
    trksegs,
    '  </trk>',
    '</gpx>',
    '',
  ].join('\n');
}

export function gpxFileName(title: string, startedAt: number): string {
  const d = new Date(startedAt);
  const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'activity';
  return `pacenation-${date}-${slug}.gpx`;
}

/** Cumulative distance (m) and moving time (s) at every point. Pauses add neither. */
export function cumulative(points: TrackPoint[]): { d: number[]; t: number[] } {
  const d = [0];
  const t = [0];
  for (let i = 1; i < points.length; i++) {
    const same = points[i].seg === points[i - 1].seg;
    d.push(d[i - 1] + (same ? haversineM(points[i - 1], points[i]) : 0));
    t.push(t[i - 1] + (same ? (points[i].t - points[i - 1].t) / 1000 : 0));
  }
  return { d, t };
}

export interface Split {
  index: number;
  distanceM: number;
  timeS: number;
  paceSPerKm: number;
  elevDeltaM: number | null;
}

/** Per-kilometre splits by moving time, with a final partial split when it is at least 100 m. */
export function kmSplits(points: TrackPoint[]): Split[] {
  if (points.length < 2) return [];
  const { d, t } = cumulative(points);
  const total = d[d.length - 1];
  const out: Split[] = [];
  const at = (target: number) => {
    let i = d.findIndex((x) => x >= target);
    if (i <= 0) i = Math.max(1, i);
    const f = d[i] === d[i - 1] ? 0 : (target - d[i - 1]) / (d[i] - d[i - 1]);
    const altA = points[i - 1].alt;
    const altB = points[i].alt;
    return {
      t: t[i - 1] + f * (t[i] - t[i - 1]),
      alt: altA !== null && altB !== null ? altA + f * (altB - altA) : null,
    };
  };
  let prev = { t: 0, alt: points[0].alt };
  let km = 1;
  for (; km * 1000 <= total; km++) {
    const cur = at(km * 1000);
    out.push({
      index: km,
      distanceM: 1000,
      timeS: cur.t - prev.t,
      paceSPerKm: cur.t - prev.t,
      elevDeltaM: cur.alt !== null && prev.alt !== null ? Math.round(cur.alt - prev.alt) : null,
    });
    prev = cur;
  }
  const rest = total - (km - 1) * 1000;
  if (rest >= 100) {
    const end = { t: t[t.length - 1], alt: points[points.length - 1].alt };
    const timeS = end.t - prev.t;
    out.push({
      index: km,
      distanceM: rest,
      timeS,
      paceSPerKm: timeS / (rest / 1000),
      elevDeltaM: end.alt !== null && prev.alt !== null ? Math.round(end.alt - prev.alt) : null,
    });
  }
  return out;
}

/** Altitude against distance, thinned to at most `max` samples. Null when the device gave no altitude. */
export function elevationProfile(points: TrackPoint[], max = 160): { dM: number; alt: number }[] | null {
  const { d } = cumulative(points);
  const samples = points.map((p, i) => ({ dM: d[i], alt: p.alt })).filter((s): s is { dM: number; alt: number } => s.alt !== null && Number.isFinite(s.alt));
  if (samples.length < 2) return null;
  if (samples.length <= max) return samples;
  const step = (samples.length - 1) / (max - 1);
  return Array.from({ length: max }, (_, k) => samples[Math.round(k * step)]);
}

export interface ReplayTrack {
  points: TrackPoint[];
  d: number[];
  t: number[];
  totalS: number;
  totalM: number;
}

/** Prepares a route for replay, simplified so the animation stays smooth on long activities. */
export function prepareReplay(points: TrackPoint[], maxPoints = 600): ReplayTrack {
  let pts = points;
  for (let tol = 2; pts.length > maxPoints && tol < 200; tol *= 1.6) pts = simplify(points, tol);
  const { d, t } = cumulative(pts);
  return { points: pts, d, t, totalS: t[t.length - 1] ?? 0, totalM: d[d.length - 1] ?? 0 };
}

/** Position, distance and the travelled part of the route at a fraction (0 to 1) of the moving time. */
export function replayAt(r: ReplayTrack, progress: number): { position: LatLng | null; distanceM: number; timeS: number; travelled: LatLng[] } {
  const n = r.points.length;
  if (n === 0) return { position: null, distanceM: 0, timeS: 0, travelled: [] };
  if (n === 1 || r.totalS <= 0) return { position: r.points[0], distanceM: 0, timeS: 0, travelled: [r.points[0]] };
  const target = Math.max(0, Math.min(1, progress)) * r.totalS;
  let lo = 0;
  let hi = n - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (r.t[mid] < target) lo = mid + 1;
    else hi = mid;
  }
  const i = Math.max(1, lo);
  const span = r.t[i] - r.t[i - 1];
  const f = span > 0 ? (target - r.t[i - 1]) / span : 1;
  const a = r.points[i - 1];
  const b = r.points[i];
  const position = { lat: a.lat + f * (b.lat - a.lat), lng: a.lng + f * (b.lng - a.lng) };
  return {
    position,
    distanceM: r.d[i - 1] + f * (r.d[i] - r.d[i - 1]),
    timeS: target,
    travelled: [...r.points.slice(0, i), position],
  };
}
