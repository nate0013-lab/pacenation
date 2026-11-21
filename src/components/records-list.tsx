import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/icons';
import { SPORT_COLOR } from '@/components/sport-button';
import { Card } from '@/components/ui';
import { Colors, Spacing, Type } from '@/constants/theme';
import { formatDistanceKm, formatDuration, formatPace } from '@/lib/format';
import { EFFORT_DISTANCE, type EffortKey } from '@/lib/progress/best-efforts';
import type { PersonalRecord } from '@/lib/progress/summary';
import { SPORT_LABEL, SPORTS } from '@/lib/types';

function valueText(r: PersonalRecord): { main: string; sub: string } {
  if (r.kind === 'distance') return { main: `${formatDistanceKm(r.value)} km`, sub: r.activityTitle };
  if (r.kind === 'climb') return { main: `${Math.round(r.value)} m`, sub: r.activityTitle };
  const effort = r.key.split('-')[1] as EffortKey;
  const pace = (r.value / EFFORT_DISTANCE[effort]) * 1000;
  return { main: formatDuration(r.value), sub: r.sport === 'ride' ? `${((EFFORT_DISTANCE[effort] / r.value) * 3.6).toFixed(1)} km/h` : `${formatPace(pace)} /km` };
}

/** Personal records grouped by sport. Each row opens the activity that set it. */
export function RecordsList({ records }: { records: PersonalRecord[] }) {
  const router = useRouter();
  const groups = [...SPORTS.map((s) => ({ key: s, title: SPORT_LABEL[s], items: records.filter((r) => r.sport === s && r.key !== 'climb') })), { key: 'climb', title: 'Climbing', items: records.filter((r) => r.key === 'climb') }].filter((g) => g.items.length);
  return (
    <Card style={{ padding: 0, overflow: 'hidden' }}>
      {groups.map((g, gi) => (
        <View key={g.key} style={gi > 0 ? styles.divider : undefined}>
          <View style={styles.groupHead}>
            <Icon name={g.key === 'climb' ? 'mountain' : (g.key as 'walk')} size={18} color={g.key === 'climb' ? Colors.gold : SPORT_COLOR[g.key as 'walk']} />
            <Text style={[Type.caption, { color: Colors.textSecondary }]}>{g.title.toUpperCase()}</Text>
          </View>
          {g.items.map((r) => {
            const v = valueText(r);
            if (!r.activityTitle) v.sub = r.kind === 'time' ? v.sub : '';
            return (
              <Pressable
                key={r.key}
                testID={`record-${r.key}`}
                accessibilityRole="button"
                accessibilityLabel={`${r.label} record ${v.main}`}
                disabled={!r.activityId}
                onPress={() => router.push(`/activity/${r.activityId}`)}
                style={({ pressed }) => [styles.row, pressed && { backgroundColor: Colors.surfaceRaised }]}>
                <Text style={[Type.body, { color: Colors.text, flex: 1 }]}>{r.label}</Text>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[Type.bodyStrong, { color: Colors.text }]}>{v.main}</Text>
                  <Text style={[Type.small, { color: Colors.textSecondary }]} numberOfLines={1}>
                    {v.sub}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  groupHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  divider: { borderTopWidth: 1, borderTopColor: Colors.border },
});
