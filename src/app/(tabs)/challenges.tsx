import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ChallengeCard } from '@/components/challenge-card';
import { Icon } from '@/components/icons';
import { Button, EmptyState, Screen, SectionHeader, Segmented } from '@/components/ui';
import { Colors, Spacing, Type } from '@/constants/theme';
import { currentChallenges, type ChallengePeriod } from '@/lib/challenges/catalogue';
import { useMyActivities } from '@/lib/use-stats';

export default function ChallengesTab() {
  const router = useRouter();
  const { joined } = useMyActivities();
  const [period, setPeriod] = useState<ChallengePeriod>('weekly');
  const all = useMemo(() => currentChallenges(), []);
  const mineById = new Map(joined.map((j) => [j.challenge.id, j]));
  const active = joined.filter((j) => j.active);
  const finished = joined.filter((j) => !j.active);
  const completed = joined.filter((j) => j.completedAt !== null).length;
  const available = all.filter((c) => c.period === period && !mineById.has(c.id));

  return (
    <Screen>
      <View style={styles.titleRow}>
        <Text style={styles.title}>Challenges</Text>
        <Icon name="trophy" size={28} color={Colors.gold} />
      </View>
      <Text style={styles.sub}>Push your limits solo or move the whole community forward. New challenges start every Monday and on the 1st.</Text>

      <View style={{ flexDirection: 'row', gap: Spacing.md }}>
        <Button testID="open-leaderboards" title="Leaderboards" icon="trophy" variant="secondary" onPress={() => router.push('/leaderboards')} style={{ flex: 1 }} />
        <Button testID="open-events" title="Events" icon="calendar" variant="secondary" onPress={() => router.push('/events')} style={{ flex: 1 }} />
      </View>

      <SectionHeader title="Your challenges" />
      {active.length === 0 ? (
        <EmptyState icon="challenges" title="You have not joined a challenge" body="Pick one below. Activities you already saved this week or month count straight away." />
      ) : (
        <View style={{ gap: Spacing.md }}>
          {active.map((j) => (
            <ChallengeCard key={j.challenge.id} c={j.challenge} mine={j} />
          ))}
        </View>
      )}

      <SectionHeader title="Join a challenge" />
      <Segmented
        options={[
          { value: 'weekly', label: 'This week' },
          { value: 'monthly', label: 'This month' },
        ]}
        value={period}
        onChange={setPeriod}
      />
      <View style={{ gap: Spacing.md, marginTop: Spacing.lg }}>
        {available.length === 0 ? (
          <Text style={[Type.body, { color: Colors.textSecondary, textAlign: 'center' }]}>You have joined every challenge for this {period === 'weekly' ? 'week' : 'month'}.</Text>
        ) : (
          available.map((c) => <ChallengeCard key={c.id} c={c} />)
        )}
      </View>

      {finished.length ? (
        <>
          <SectionHeader title={`Past challenges · ${completed} completed`} />
          <View style={{ gap: Spacing.md }}>
            {finished.slice(0, 10).map((j) => (
              <ChallengeCard key={j.challenge.id} c={j.challenge} mine={j} />
            ))}
          </View>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Spacing.lg },
  title: { ...Type.title, color: Colors.text },
  sub: { ...Type.body, color: Colors.textSecondary, marginTop: 4, marginBottom: Spacing.lg },
});
