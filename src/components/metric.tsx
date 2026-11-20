import { StyleSheet, Text, View } from 'react-native';

import { Colors, Type } from '@/constants/theme';

export function Metric({ label, value, unit, big = false, testID }: { label: string; value: string; unit?: string; big?: boolean; testID?: string }) {
  return (
    <View style={styles.cell}>
      <Text style={[big ? styles.big : styles.value]} numberOfLines={1} adjustsFontSizeToFit testID={testID}>
        {value}
        {unit ? <Text style={big ? styles.bigUnit : styles.unit}> {unit}</Text> : null}
      </Text>
      <Text style={styles.label}>{label.toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  cell: { flex: 1, alignItems: 'center', gap: 2, paddingVertical: 10 },
  value: { fontSize: 26, lineHeight: 30, fontWeight: '800', color: Colors.text, fontVariant: ['tabular-nums'] },
  unit: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
  big: { fontSize: 72, lineHeight: 78, fontWeight: '900', color: Colors.text, letterSpacing: -2, fontVariant: ['tabular-nums'] },
  bigUnit: { fontSize: 24, fontWeight: '700', color: Colors.textSecondary, letterSpacing: 0 },
  label: { ...Type.caption, color: Colors.textSecondary },
});
