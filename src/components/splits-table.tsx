import { StyleSheet, Text, View } from 'react-native';

import { Colors, Radius, Spacing, Type } from '@/constants/theme';
import { formatPace } from '@/lib/format';
import type { Split } from '@/lib/tracking/route-tools';

/** Pace per kilometre with a bar for each split; the fastest is marked in gold. */
export function SplitsTable({ splits, color }: { splits: Split[]; color: string }) {
  const paces = splits.map((s) => s.paceSPerKm);
  const fastest = Math.min(...paces);
  const slowest = Math.max(...paces);
  const showElev = splits.some((s) => s.elevDeltaM !== null);
  return (
    <View>
      <View style={[styles.row, styles.head]}>
        <Text style={[styles.h, { width: 40 }]}>KM</Text>
        <Text style={[styles.h, { width: 64 }]}>PACE</Text>
        <View style={{ flex: 1 }} />
        {showElev ? <Text style={[styles.h, { width: 48, textAlign: 'right' }]}>ELEV</Text> : null}
      </View>
      {splits.map((s) => {
        const w = slowest === fastest ? 1 : 0.35 + 0.65 * ((slowest - s.paceSPerKm) / (slowest - fastest));
        const best = s.paceSPerKm === fastest && splits.length > 1;
        return (
          <View key={s.index} style={styles.row} testID={`split-${s.index}`}>
            <Text style={[Type.small, { color: Colors.textSecondary, width: 40 }]}>
              {s.distanceM < 1000 ? (s.distanceM / 1000).toFixed(2) : s.index}
            </Text>
            <Text style={[Type.small, { color: best ? Colors.gold : Colors.text, width: 64, fontWeight: '700' }]}>{formatPace(s.paceSPerKm)}</Text>
            <View style={styles.barTrack}>
              <View style={[styles.bar, { width: `${w * 100}%`, backgroundColor: best ? Colors.gold : color }]} />
            </View>
            {showElev ? (
              <Text style={[Type.small, { color: Colors.textSecondary, width: 48, textAlign: 'right' }]}>
                {s.elevDeltaM === null ? '' : `${s.elevDeltaM > 0 ? '+' : ''}${s.elevDeltaM} m`}
              </Text>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: 6 },
  head: { borderBottomWidth: 1, borderBottomColor: Colors.border, marginBottom: 4 },
  h: { ...Type.caption, color: Colors.textMuted },
  barTrack: { flex: 1, height: 10, borderRadius: Radius.pill, backgroundColor: Colors.surfaceRaised, overflow: 'hidden' },
  bar: { height: '100%', borderRadius: Radius.pill },
});
