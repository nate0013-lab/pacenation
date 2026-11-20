import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { BadgeMedal } from '@/components/badge-medal';
import { Colors, Spacing, Type } from '@/constants/theme';
import type { BadgeState } from '@/lib/progress/badges';

/** A row of medals; tapping one opens the full badge list. */
export function BadgeStrip({ badges, testID }: { badges: BadgeState[]; testID?: string }) {
  const router = useRouter();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row} testID={testID}>
      {badges.map((b) => (
        <Pressable
          key={b.badge.id}
          testID={`badge-chip-${b.badge.id}`}
          accessibilityRole="button"
          accessibilityLabel={`${b.badge.name} badge${b.earnedAt ? '' : ', locked'}`}
          onPress={() => router.push({ pathname: '/badges', params: { focus: b.badge.id } })}
          style={styles.item}>
          <BadgeMedal id={`strip-${b.badge.id}`} tier={b.badge.tier} icon={b.badge.icon} size={64} locked={b.earnedAt === null} />
          <Text style={styles.name} numberOfLines={2}>
            {b.badge.name}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: Spacing.md, paddingVertical: Spacing.xs },
  item: { width: 76, alignItems: 'center', gap: Spacing.xs },
  name: { ...Type.small, color: Colors.text, textAlign: 'center' },
});
