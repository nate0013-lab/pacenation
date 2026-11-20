import { StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, Line, LinearGradient, Path, Stop, Text as SvgText } from 'react-native-svg';

import { Colors, Type } from '@/constants/theme';

/** Elevation profile: altitude (m) against distance (km). */
export function ElevationChart({ data, color = Colors.ride }: { data: { dM: number; alt: number }[]; color?: string }) {
  const W = 340;
  const H = 140;
  const padL = 36;
  const padB = 22;
  const padT = 10;
  const maxD = data[data.length - 1].dM || 1;
  const alts = data.map((s) => s.alt);
  let lo = Math.min(...alts);
  let hi = Math.max(...alts);
  if (hi - lo < 20) {
    const mid = (hi + lo) / 2;
    lo = mid - 10;
    hi = mid + 10;
  }
  const x = (d: number) => padL + (d / maxD) * (W - padL - 8);
  const y = (a: number) => padT + (1 - (a - lo) / (hi - lo)) * (H - padT - padB);
  const line = data.map((s, i) => `${i ? 'L' : 'M'}${x(s.dM).toFixed(1)} ${y(s.alt).toFixed(1)}`).join(' ');
  const area = `${line} L${x(maxD).toFixed(1)} ${H - padB} L${padL} ${H - padB} Z`;
  const ticks = [lo, (lo + hi) / 2, hi];
  return (
    <View accessibilityLabel={`Elevation profile from ${Math.round(Math.min(...alts))} to ${Math.round(Math.max(...alts))} metres`}>
      <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
        <Defs>
          <LinearGradient id="elevFill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity="0.45" />
            <Stop offset="1" stopColor={color} stopOpacity="0.02" />
          </LinearGradient>
        </Defs>
        {ticks.map((t) => (
          <Line key={t} x1={padL} x2={W - 8} y1={y(t)} y2={y(t)} stroke={Colors.border} strokeWidth={1} />
        ))}
        {ticks.map((t) => (
          <SvgText key={`l${t}`} x={padL - 6} y={y(t) + 4} fontSize="10" fill={Colors.textMuted} textAnchor="end">
            {Math.round(t)}
          </SvgText>
        ))}
        <Path d={area} fill="url(#elevFill)" />
        <Path d={line} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" />
        <SvgText x={padL} y={H - 6} fontSize="10" fill={Colors.textMuted}>
          0 km
        </SvgText>
        <SvgText x={W - 8} y={H - 6} fontSize="10" fill={Colors.textMuted} textAnchor="end">
          {(maxD / 1000).toFixed(1)} km
        </SvgText>
      </Svg>
      <Text style={styles.caption}>Altitude in metres</Text>
    </View>
  );
}

const styles = StyleSheet.create({ caption: { ...Type.small, color: Colors.textMuted, marginTop: 2 } });
