import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, Line, Pattern, Polyline, Rect } from 'react-native-svg';

import { Colors, Radius, Type } from '@/constants/theme';
import { boundsOf } from '@/lib/tracking/geo';
import type { RouteMapProps } from './route-map.types';

/**
 * Web and fallback route view: the route projected onto a styled grid.
 * Android and iOS use the native map in route-map.native.tsx.
 */
export function RouteMap({ points, current, showEndpoints = true, color = Colors.primary, height = 240, style }: RouteMapProps) {
  const all = current ? [...points, current] : points;
  const b = boundsOf(all);
  const W = 400;
  const H = 240;
  const pad = 28;
  let project = (_p: { lat: number; lng: number }) => ({ x: W / 2, y: H / 2 });
  if (b) {
    const midLat = ((b.minLat + b.maxLat) / 2) * (Math.PI / 180);
    const spanX = Math.max((b.maxLng - b.minLng) * Math.cos(midLat), 0.0005);
    const spanY = Math.max(b.maxLat - b.minLat, 0.0005);
    const scale = Math.min((W - 2 * pad) / spanX, (H - 2 * pad) / spanY);
    const cx = (b.minLng + b.maxLng) / 2;
    const cy = (b.minLat + b.maxLat) / 2;
    project = (p) => ({ x: W / 2 + (p.lng - cx) * Math.cos(midLat) * scale, y: H / 2 - (p.lat - cy) * scale });
  }
  const pts = points.map(project);
  const first = pts[0];
  const last = pts[pts.length - 1];
  const cur = current ? project(current) : null;
  return (
    <View style={[styles.wrap, { height }, style]} accessibilityLabel="Route map">
      <Svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
        <Defs>
          <Pattern id="rmGrid" width="24" height="24" patternUnits="userSpaceOnUse">
            <Line x1="0" y1="0" x2="24" y2="0" stroke="#1A2E47" strokeWidth="1" />
            <Line x1="0" y1="0" x2="0" y2="24" stroke="#1A2E47" strokeWidth="1" />
          </Pattern>
        </Defs>
        <Rect x="0" y="0" width={W} height={H} fill="#0B1829" />
        <Rect x="0" y="0" width={W} height={H} fill="url(#rmGrid)" />
        {pts.length > 1 ? (
          <>
            <Polyline points={pts.map((p) => `${p.x},${p.y}`).join(' ')} fill="none" stroke={color} strokeOpacity={0.25} strokeWidth={10} strokeLinejoin="round" strokeLinecap="round" />
            <Polyline points={pts.map((p) => `${p.x},${p.y}`).join(' ')} fill="none" stroke={color} strokeWidth={4} strokeLinejoin="round" strokeLinecap="round" />
          </>
        ) : null}
        {showEndpoints && first ? <Circle cx={first.x} cy={first.y} r={7} fill={Colors.success} stroke={Colors.bg} strokeWidth={2.5} /> : null}
        {showEndpoints && last && pts.length > 1 && !cur ? <Circle cx={last.x} cy={last.y} r={7} fill={Colors.danger} stroke={Colors.bg} strokeWidth={2.5} /> : null}
        {cur ? (
          <>
            <Circle cx={cur.x} cy={cur.y} r={16} fill="#4DA3FF" opacity={0.25} />
            <Circle cx={cur.x} cy={cur.y} r={7} fill="#4DA3FF" stroke="#fff" strokeWidth={2.5} />
          </>
        ) : null}
      </Svg>
      {!b ? (
        <View style={styles.overlay}>
          <Text style={[Type.small, { color: Colors.textSecondary }]}>Waiting for GPS…</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%', borderRadius: Radius.lg, overflow: 'hidden', backgroundColor: '#0B1829' },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
});
