import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BadgeMedal, TIER_COLOR } from '@/components/badge-medal';
import { ScreenHeader } from '@/components/screen-header';
import { Card, Screen, SectionHeader, Segmented } from '@/components/ui';
import { Colors, Radius, Spacing, Type } from '@/constants/theme';
import { TIER_XP, type BadgeState } from '@/lib/progress/badges';
import { XP_PER_ACTIVITY, XP_PER_KM } from '@/lib/progress/xp';
import { useProgress } from '@/lib/use-stats';

type Filter = 'all' | 'earned' | 'locked';
const CATEGORIES = ['Milestones', 'Distance', 'Consistency', 'Challenges', 'Explorer'] as const;

function progressText(b: BadgeState): string {
  const unit = b.badge.unit;
  const fmt = (n: number) => (unit === 'km' ? (Math.floor(n * 10) / 10).toLocaleString('en') : Math.floor(n).toLocaleString('en'));
  const cur = Math.min(b.current, b.target);
  return unit ? `${fmt(cur)} / ${fmt(b.target)} ${unit}` : `${fmt(cur)} / ${fmt(b.target)}`;
}

function BadgeRow({ b, focused }: { b: BadgeState; focused: boolean }) {
  const router = useRouter();
  const earned = b.earnedAt !== null;
  const tier = TIER_COLOR[b.badge.tier];
  const body = (
    <View style={[styles.row, focused && { borderColor: Colors.primary }]} testID={`badge-${b.badge.id}`}>
      <BadgeMedal id={`list-${b.badge.id}`} tier={b.badge.tier} icon={b.badge.icon} size={60} locked={!earned} />
      <View style={{ flex: 1, gap: 2 }}>
        <View style={styles.nameRow}>
          <Text style={[Type.bodyStrong, { color: Colors.text, flexShrink: 1 }]}>{b.badge.name}</Text>
          <Text style={[styles.tier, { color: tier.light, borderColor: tier.dark }]}>{tier.label}</Text>
        </View>
        <Text style={[Type.small, { color: Colors.textSecondary }]}>{b.badge.description}</Text>
        {earned ? (
          <Text style={[Type.small, { color: Colors.success }]} testID={`badge-${b.badge.id}-earned`}>
            Earned {new Date(b.earnedAt!).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} · +{TIER_XP[b.badge.tier]} XP
          </Text>
        ) : (
          <View style={{ gap: 4, marginTop: 4 }}>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${Math.max(2, b.ratio * 100)}%` }]} />
            </View>
            <Text style={[Type.small, { color: Colors.textSecondary }]}>{progressText(b)}</Text>
          </View>
        )}
      </View>
    </View>
  );
  if (!earned || !b.activityId) return body;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${b.badge.name}, open the activity that earned it`} onPress={() => router.push(`/activity/${b.activityId}`)}>
      {body}
    </Pressable>
  );
}

export default function BadgesScreen() {
  const { focus } = useLocalSearchParams<{ focus?: string }>();
  const p = useProgress();
  const [filter, setFilter] = useState<Filter>('all');
  const shown = p.badges.filter((b) => (filter === 'all' ? true : filter === 'earned' ? b.earnedAt !== null : b.earnedAt === null));

  return (
    <Screen header={<ScreenHeader title="Badges" fallback="/profile" />}>
      <Card style={styles.summary}>
        <Text style={styles.big} testID="badges-earned-count">
          {p.earned.length}
          <Text style={styles.of}> / {p.badges.length}</Text>
        </Text>
        <Text style={[Type.small, { color: Colors.textSecondary }]}>badges earned · {p.badgeXp.toLocaleString('en')} XP from badges</Text>
      </Card>
      <View style={{ marginTop: Spacing.lg }}>
        <Segmented
          options={[
            { value: 'all', label: 'All' },
            { value: 'earned', label: 'Earned' },
            { value: 'locked', label: 'Locked' },
          ]}
          value={filter}
          onChange={setFilter}
        />
      </View>
      {CATEGORIES.map((cat) => {
        const items = shown.filter((b) => b.badge.category === cat);
        if (!items.length) return null;
        return (
          <View key={cat}>
            <SectionHeader title={cat} />
            <View style={{ gap: Spacing.md }}>
              {items.map((b) => (
                <BadgeRow key={b.badge.id} b={b} focused={focus === b.badge.id} />
              ))}
            </View>
          </View>
        );
      })}
      {shown.length === 0 ? <Text style={[Type.body, { color: Colors.textSecondary, marginTop: Spacing.xl, textAlign: 'center' }]}>Nothing here yet.</Text> : null}

      <SectionHeader title="How XP works" />
      <Card style={{ gap: Spacing.sm }}>
        <Text style={styles.rule}>+{XP_PER_ACTIVITY} XP for every activity you save</Text>
        <Text style={styles.rule}>+{XP_PER_KM.walk} XP per km walked or run, +{XP_PER_KM.ride} XP per km ridden</Text>
        <Text style={styles.rule}>+1 XP for every 10 m you climb</Text>
        <Text style={styles.rule}>
          +{TIER_XP.bronze} / {TIER_XP.silver} / {TIER_XP.gold} XP for bronze, silver and gold badges
        </Text>
        <Text style={[Type.small, { color: Colors.textSecondary }]}>Each level takes 250 XP more than the one before. Deleting an activity removes its XP.</Text>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  summary: { alignItems: 'center', gap: 2 },
  big: { fontSize: 44, fontWeight: '900', color: Colors.gold, letterSpacing: -1 },
  of: { fontSize: 22, fontWeight: '700', color: Colors.textSecondary },
  row: { flexDirection: 'row', gap: Spacing.md, alignItems: 'center', backgroundColor: Colors.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, padding: Spacing.md },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  tier: { ...Type.caption, borderWidth: 1, borderRadius: Radius.pill, paddingHorizontal: 6, paddingVertical: 1 },
  track: { height: 6, borderRadius: Radius.pill, backgroundColor: Colors.surfaceRaised, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: Radius.pill, backgroundColor: Colors.primary },
  rule: { ...Type.body, color: Colors.text },
});
