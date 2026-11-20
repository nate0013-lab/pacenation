import { StyleSheet, Text, View } from 'react-native';

import { Colors, Type } from '@/constants/theme';
import { GOOD_ACCURACY_M } from '@/lib/tracking/geo';
import type { RawFix } from '@/lib/tracking/session';

export type SignalLevel = 'none' | 'weak' | 'fair' | 'strong';

export function signalLevel(fix: RawFix | null, now: number): SignalLevel {
  if (!fix || now - fix.t > 15000) return 'none';
  if (fix.acc <= GOOD_ACCURACY_M) return 'strong';
  if (fix.acc <= 25) return 'fair';
  return 'weak';
}

const LABEL: Record<SignalLevel, string> = { none: 'Searching for GPS', weak: 'Weak GPS', fair: 'GPS fair', strong: 'GPS strong' };
const COLOR: Record<SignalLevel, string> = { none: Colors.textMuted, weak: Colors.danger, fair: Colors.gold, strong: Colors.success };
const BARS: Record<SignalLevel, number> = { none: 0, weak: 1, fair: 2, strong: 3 };

export function GpsSignal({ fix, now }: { fix: RawFix | null; now: number }) {
  const level = signalLevel(fix, now);
  return (
    <View style={styles.row} accessibilityLabel={LABEL[level]} testID={`gps-${level}`}>
      <View style={styles.bars}>
        {[1, 2, 3].map((b) => (
          <View key={b} style={[styles.bar, { height: 4 + b * 4, backgroundColor: b <= BARS[level] ? COLOR[level] : Colors.borderStrong }]} />
        ))}
      </View>
      <Text style={[Type.caption, { color: COLOR[level] }]}>{LABEL[level].toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 2 },
  bar: { width: 4, borderRadius: 1 },
});
