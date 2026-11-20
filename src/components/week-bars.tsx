import { StyleSheet, Text, View } from 'react-native';

import { Colors, Radius, Spacing, Type } from '@/constants/theme';
import { formatDistanceKm } from '@/lib/format';

/** Simple bar chart of distance per bucket (days or weeks). The highlighted bar is drawn in teal. */
export function DistanceBars({
  bars,
  height = 96,
  testID,
}: {
  bars: { key: string; label: string; distanceM: number; highlight?: boolean }[];
  height?: number;
  testID?: string;
}) {
  const max = Math.max(1, ...bars.map((b) => b.distanceM));
  return (
    <View testID={testID} accessibilityLabel={bars.map((b) => `${b.label} ${formatDistanceKm(b.distanceM)} km`).join(', ')}>
      <View style={[styles.row, { height }]}>
        {bars.map((b) => {
          const h = b.distanceM > 0 ? Math.max(6, (b.distanceM / max) * height) : 3;
          return (
            <View key={b.key} style={styles.col}>
              <View style={[styles.bar, { height: h, backgroundColor: b.highlight ? Colors.primary : b.distanceM > 0 ? '#2A6F78' : Colors.surfaceRaised }]} />
            </View>
          );
        })}
      </View>
      <View style={styles.labels}>
        {bars.map((b) => (
          <Text key={b.key} style={[styles.label, b.highlight && { color: Colors.text }]} numberOfLines={1}>
            {b.label}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.sm },
  col: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: '100%' },
  bar: { width: '100%', maxWidth: 28, borderRadius: Radius.sm },
  labels: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
  label: { ...Type.caption, flex: 1, textAlign: 'center', color: Colors.textSecondary },
});
