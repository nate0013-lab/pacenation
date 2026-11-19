import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/icons';
import { SPORT_COLOR } from '@/components/sport-button';
import { Banner, Card, EmptyState, Screen, SectionHeader, Segmented } from '@/components/ui';
import { Colors, Spacing, Type } from '@/constants/theme';
import { watchOpenChallenges, type Challenge, type ChallengePeriod } from '@/lib/challenges-service';
import { formatDistanceKm } from '@/lib/format';
import { SPORT_LABEL } from '@/lib/types';

function daysLeft(c: Challenge): number {
  return Math.max(0, Math.ceil((c.endsAt.toMillis() - Date.now()) / 86400000));
}

function ChallengeCard({ c }: { c: Challenge }) {
  const color = c.sport === 'any' ? Colors.primary : SPORT_COLOR[c.sport];
  return (
    <Card style={{ gap: Spacing.sm }}>
      <View style={styles.cardTop}>
        <View style={[styles.chip, { borderColor: color }]}>
          <Text style={[Type.caption, { color }]}>{c.sport === 'any' ? 'ALL SPORTS' : SPORT_LABEL[c.sport].toUpperCase()}</Text>
        </View>
        <Text style={[Type.caption, { color: Colors.textSecondary }]}>{c.kind === 'community' ? 'COMMUNITY' : 'INDIVIDUAL'}</Text>
      </View>
      <Text style={[Type.heading, { color: Colors.text }]}>{c.title}</Text>
      <Text style={[Type.small, { color: Colors.textSecondary }]}>{c.description}</Text>
      <View style={styles.meta}>
        <Text style={[Type.small, { color: Colors.text }]}>Goal {formatDistanceKm(c.goalM, 0)} km</Text>
        <Text style={[Type.small, { color: Colors.textSecondary }]}>{c.participantCount} joined</Text>
        <Text style={[Type.small, { color: Colors.gold }]}>{daysLeft(c)} days left</Text>
      </View>
    </Card>
  );
}

export default function ChallengesTab() {
  const [period, setPeriod] = useState<ChallengePeriod>('weekly');
  const [list, setList] = useState<Challenge[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setList(null);
    setError(null);
    return watchOpenChallenges(period, setList, () => {
      setError('Challenges could not be loaded. Check your connection.');
      setList([]);
    });
  }, [period]);

  return (
    <Screen>
      <View style={styles.titleRow}>
        <Text style={styles.title}>Challenges</Text>
        <Icon name="trophy" size={28} color={Colors.gold} />
      </View>
      <Text style={styles.sub}>Push your limits solo or move the whole community forward.</Text>
      <Segmented
        options={[
          { value: 'weekly', label: 'Weekly' },
          { value: 'monthly', label: 'Monthly' },
        ]}
        value={period}
        onChange={setPeriod}
      />
      <SectionHeader title={period === 'weekly' ? 'This week' : 'This month'} />
      {error ? <Banner kind="error" text={error} /> : null}
      {list === null ? (
        <ActivityIndicator color={Colors.primary} style={{ marginTop: Spacing.xl }} />
      ) : list.length === 0 ? (
        <EmptyState icon="challenges" title="No challenges are live right now" body="New weekly and monthly challenges for walking, running and cycling open here." />
      ) : (
        <View style={{ gap: Spacing.md }}>
          {list.map((c) => (
            <ChallengeCard key={c.id} c={c} />
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Spacing.lg },
  title: { ...Type.title, color: Colors.text },
  sub: { ...Type.body, color: Colors.textSecondary, marginTop: 4, marginBottom: Spacing.xl },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  meta: { flexDirection: 'row', gap: Spacing.lg, marginTop: Spacing.xs, flexWrap: 'wrap' },
});
