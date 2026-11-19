import { StyleSheet, Text, View } from 'react-native';

import { Colors, Radius, Type } from '@/constants/theme';
import { levelForXp } from '@/lib/format';

export function LevelBar({ xp }: { xp: number }) {
  const { level, intoLevel, perLevel } = levelForXp(xp);
  return (
    <View style={{ gap: 8 }}>
      <View style={styles.row}>
        <Text style={[Type.bodyStrong, { color: Colors.gold }]}>Level {level}</Text>
        <Text style={[Type.small, { color: Colors.textSecondary }]}>
          {intoLevel} / {perLevel} XP
        </Text>
      </View>
      <View style={styles.track} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: perLevel, now: intoLevel }}>
        <View style={[styles.fill, { width: `${Math.max(2, (intoLevel / perLevel) * 100)}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  track: { height: 8, borderRadius: Radius.pill, backgroundColor: Colors.surfaceRaised, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: Radius.pill, backgroundColor: Colors.gold },
});
