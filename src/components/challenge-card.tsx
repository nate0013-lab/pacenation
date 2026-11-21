import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/icons';
import { SPORT_COLOR } from '@/components/sport-button';
import { Colors, Radius, Spacing, Type } from '@/constants/theme';
import { formatGoal, type Challenge } from '@/lib/challenges/catalogue';
import { SPORT_LABEL } from '@/lib/types';

export function challengeColor(c: Pick<Challenge, 'sport' | 'kind'>): string {
  if (c.kind === 'community') return Colors.gold;
  return c.sport === 'any' ? Colors.primary : SPORT_COLOR[c.sport];
}

export function timeLeft(endsAt: number, now = Date.now()): string {
  const ms = endsAt - now;
  if (ms <= 0) return 'Ended';
  const days = Math.floor(ms / 86_400_000);
  if (days >= 2) return `${days} days left`;
  const hours = Math.max(1, Math.round(ms / 3_600_000));
  return `${hours} ${hours === 1 ? 'hour' : 'hours'} left`;
}

export function ProgressBar({ ratio, color, height = 8 }: { ratio: number; color: string; height?: number }) {
  return (
    <View style={[styles.track, { height }]} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(ratio * 100) }}>
      <View style={[styles.fill, { width: `${Math.max(ratio > 0 ? 3 : 0, Math.min(1, ratio) * 100)}%`, backgroundColor: color }]} />
    </View>
  );
}

/** A challenge in a list. Shows my progress when I have joined. */
export function ChallengeCard({ c, mine }: { c: Challenge; mine?: { value: number; completedAt: number | null } | null }) {
  const router = useRouter();
  const color = challengeColor(c);
  const done = mine && c.kind === 'individual' && mine.completedAt !== null;
  return (
    <Pressable
      testID={`challenge-${c.key}`}
      accessibilityRole="button"
      accessibilityLabel={`${c.title}, ${timeLeft(c.endsAt)}`}
      onPress={() => router.push({ pathname: '/challenge/[id]', params: { id: c.id } })}
      style={({ pressed }) => [styles.card, { borderColor: mine ? color : Colors.border }, pressed && { backgroundColor: Colors.surfaceRaised }]}>
      <View style={styles.top}>
        <View style={[styles.chip, { borderColor: color }]}>
          <Text style={[Type.caption, { color }]}>{c.sport === 'any' ? 'ALL SPORTS' : SPORT_LABEL[c.sport].toUpperCase()}</Text>
        </View>
        <Text style={[Type.caption, { color: Colors.textSecondary }]}>{c.kind === 'community' ? 'COMMUNITY' : c.period === 'weekly' ? 'WEEKLY' : 'MONTHLY'}</Text>
        <View style={{ flex: 1 }} />
        {done ? (
          <View style={styles.doneChip}>
            <Icon name="check" size={14} color={Colors.onPrimary} />
            <Text style={[Type.caption, { color: Colors.onPrimary }]}>DONE</Text>
          </View>
        ) : mine ? (
          <Text style={[Type.caption, { color }]}>JOINED</Text>
        ) : null}
      </View>
      <Text style={[Type.heading, { color: Colors.text }]}>{c.title}</Text>
      <Text style={[Type.small, { color: Colors.textSecondary }]} numberOfLines={2}>
        {c.description}
      </Text>
      {mine && c.kind === 'individual' ? (
        <View style={{ gap: 6, marginTop: Spacing.xs }}>
          <ProgressBar ratio={mine.value / c.goal} color={color} />
          <Text style={[Type.small, { color: Colors.text }]}>
            {formatGoal(c, mine.value)} of {formatGoal(c)}
          </Text>
        </View>
      ) : null}
      <View style={styles.meta}>
        <Text style={[Type.small, { color: Colors.text }]}>Goal {formatGoal(c)}</Text>
        <Text style={[Type.small, { color: Colors.gold }]}>{timeLeft(c.endsAt)}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: Colors.surface, borderRadius: Radius.lg, borderWidth: 1, padding: Spacing.lg, gap: Spacing.sm },
  top: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  doneChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.primary, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  meta: { flexDirection: 'row', gap: Spacing.lg, marginTop: Spacing.xs, flexWrap: 'wrap' },
  track: { borderRadius: Radius.pill, backgroundColor: Colors.surfaceRaised, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: Radius.pill },
});
