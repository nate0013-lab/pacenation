import { StyleSheet, Text, View } from 'react-native';

import { Colors, Radius, Type } from '@/constants/theme';
import { levelForXp, levelTitle } from '@/lib/progress/xp';

export function LevelBar({ xp }: { xp: number }) {
  const { level, intoLevel, perLevel } = levelForXp(xp);
  return (
    <View style={{ gap: 8 }}>
      <View style={styles.row}>
        <Text style={[Type.bodyStrong, { color: Colors.gold }]} testID="level-label">
          Level {level} · {levelTitle(level)}
        </Text>
        <Text style={[Type.small, { color: Colors.textSecondary }]} testID="level-xp">
          {xp.toLocaleString('en')} XP
        </Text>
      </View>
      <View style={styles.track} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: perLevel, now: intoLevel }}>
        <View style={[styles.fill, { width: `${Math.max(2, (intoLevel / perLevel) * 100)}%` }]} />
      </View>
      <Text style={[Type.small, { color: Colors.textSecondary }]}>
        {(perLevel - intoLevel).toLocaleString('en')} XP to level {level + 1}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  track: { height: 8, borderRadius: Radius.pill, backgroundColor: Colors.surfaceRaised, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: Radius.pill, backgroundColor: Colors.gold },
});
