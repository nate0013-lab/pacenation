import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { challengeColor, ProgressBar, timeLeft } from '@/components/challenge-card';
import { MountainScene } from '@/components/mountain-scene';
import { ScreenHeader } from '@/components/screen-header';
import { Banner, Button, Card, EmptyState, Screen, SectionHeader } from '@/components/ui';
import { Colors, Radius, Spacing, Type } from '@/constants/theme';
import { useProfile } from '@/lib/auth-context';
import { challengeById, formatGoal, progressFor } from '@/lib/challenges/catalogue';
import { challengeTotals, joinChallenge, leaveChallenge, rankIn, watchParticipants, type Participant } from '@/lib/challenges-service';
import { SPORT_LABEL } from '@/lib/types';
import { useMyActivities } from '@/lib/use-stats';

const fmtDate = (ms: number) => new Date(ms).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });

export default function ChallengeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { profile } = useProfile();
  const { joined, activities } = useMyActivities();
  const c = challengeById(id);
  const mine = joined.find((j) => j.challenge.id === id) ?? null;
  const [people, setPeople] = useState<Participant[] | null>(null);
  const [totals, setTotals] = useState<{ participants: number; total: number } | null>(null);
  const [rank, setRank] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => (c ? watchParticipants(c.id, setPeople) : undefined), [c?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const peopleKey = people?.map((p) => `${p.uid}:${p.progress}`).join(',') ?? '';
  useEffect(() => {
    if (!c) return;
    challengeTotals(c.id).then(setTotals).catch(() => undefined);
    if (mine) rankIn(c.id, mine.value).then(setRank).catch(() => undefined);
    else setRank(null);
  }, [c?.id, peopleKey, mine?.value]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!c) {
    return (
      <Screen header={<ScreenHeader title="Challenge" />}>
        <EmptyState icon="challenges" title="Challenge not found" body="This challenge does not exist." />
      </Screen>
    );
  }
  const color = challengeColor(c);
  const ended = c.endsAt <= Date.now();
  // Shown straight away, before the first sync: what I already have in this window.
  const preview = progressFor(c, activities.filter((a) => a.visibility !== 'private'));

  async function join() {
    if (!c) return;
    setBusy(true);
    setError(null);
    try {
      await joinChallenge(profile, c, preview.value);
    } catch {
      setError('Could not join right now. Check your connection.');
    } finally {
      setBusy(false);
    }
  }
  async function leave() {
    if (!c) return;
    if (!confirmLeave) {
      setConfirmLeave(true);
      return;
    }
    setBusy(true);
    try {
      await leaveChallenge(profile.uid, c.id);
      setConfirmLeave(false);
    } finally {
      setBusy(false);
    }
  }

  const communityRatio = totals ? totals.total / c.goal : 0;
  return (
    <Screen header={<ScreenHeader title={c.period === 'weekly' ? 'Weekly challenge' : 'Monthly challenge'} fallback="/" />}>
      <View style={styles.hero}>
        <MountainScene height={150} style={styles.heroScene} />
        <View style={styles.heroBody}>
          <Text style={[Type.caption, { color }]}>
            {c.kind === 'community' ? 'COMMUNITY · ' : ''}
            {c.sport === 'any' ? 'ALL SPORTS' : SPORT_LABEL[c.sport].toUpperCase()}
          </Text>
          <Text style={styles.heroTitle} testID="challenge-title">
            {c.title}
          </Text>
          <Text style={[Type.small, { color: Colors.textSecondary }]}>
            {fmtDate(c.startsAt)} to {fmtDate(c.endsAt - 1)} · <Text style={{ color: Colors.gold }}>{timeLeft(c.endsAt)}</Text>
          </Text>
        </View>
      </View>
      <Text style={[Type.body, { color: Colors.textSecondary, marginTop: Spacing.lg }]}>{c.description}</Text>

      {c.kind === 'community' ? (
        <Card style={{ marginTop: Spacing.lg, gap: Spacing.sm }}>
          <Text style={[Type.caption, { color: Colors.textSecondary }]}>COMMUNITY TOTAL</Text>
          <Text style={styles.big} testID="challenge-community-total">
            {formatGoal(c, totals?.total ?? 0)}
            <Text style={styles.of}> / {formatGoal(c)}</Text>
          </Text>
          <ProgressBar ratio={communityRatio} color={color} height={10} />
          <Text style={[Type.small, { color: Colors.textSecondary }]}>
            {totals ? `${totals.participants} ${totals.participants === 1 ? 'person' : 'people'} taking part` : ' '}
            {mine ? ` · you added ${formatGoal(c, mine.value)}` : ''}
          </Text>
        </Card>
      ) : (
        <Card style={{ marginTop: Spacing.lg, gap: Spacing.sm }}>
          <Text style={[Type.caption, { color: Colors.textSecondary }]}>{mine ? 'YOUR PROGRESS' : 'YOU ALREADY HAVE'}</Text>
          <Text style={styles.big} testID="challenge-my-progress">
            {formatGoal(c, mine ? mine.value : preview.value)}
            <Text style={styles.of}> / {formatGoal(c)}</Text>
          </Text>
          <ProgressBar ratio={(mine ? mine.value : preview.value) / c.goal} color={color} height={10} />
          <Text style={[Type.small, { color: mine?.completedAt ? Colors.success : Colors.textSecondary }]} testID="challenge-status">
            {mine?.completedAt
              ? `Completed ${fmtDate(mine.completedAt)}. Nicely done!`
              : mine
                ? `${formatGoal(c, Math.max(0, c.goal - mine.value))} to go${rank ? ` · ranked #${rank}` : ''}`
                : 'Join to count it towards this challenge.'}
          </Text>
        </Card>
      )}

      {error ? <Banner kind="error" text={error} /> : null}
      {mine ? (
        !ended ? (
          <Button testID="challenge-leave" title={confirmLeave ? 'Tap again to leave' : 'Leave challenge'} variant={confirmLeave ? 'danger' : 'ghost'} loading={busy} onPress={leave} style={{ marginTop: Spacing.md }} />
        ) : null
      ) : ended ? (
        <Text style={[Type.body, { color: Colors.textSecondary, marginTop: Spacing.md }]}>This challenge has ended.</Text>
      ) : (
        <Button testID="challenge-join" title="Join challenge" icon="challenges" loading={busy} onPress={join} style={{ marginTop: Spacing.md }} />
      )}

      <SectionHeader title={c.kind === 'community' ? 'Top contributors' : 'Leaderboard'} />
      {people === null ? null : people.length === 0 ? (
        <EmptyState icon="trophy" title="Nobody has joined yet" body="Be the first on the board." />
      ) : (
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          {people.map((p, i) => {
            const me = p.uid === profile.uid;
            const done = c.kind === 'individual' && p.progress >= c.goal;
            return (
              <Pressable
                key={p.uid}
                testID={`participant-${p.username}`}
                accessibilityRole="button"
                onPress={() => (me ? router.navigate('/profile') : router.push({ pathname: '/user/[uid]', params: { uid: p.uid } }))}
                style={[styles.row, i > 0 && styles.divider, me && { backgroundColor: Colors.surfaceRaised }]}>
                <Text style={[styles.rank, i < 3 && { color: Colors.gold }]}>{i + 1}</Text>
                <Avatar uri={null} name={p.displayName} size={34} />
                <View style={{ flex: 1 }}>
                  <Text style={[Type.bodyStrong, { color: Colors.text }]} numberOfLines={1}>
                    {me ? 'You' : p.displayName}
                  </Text>
                  <Text style={[Type.small, { color: done ? Colors.success : Colors.textSecondary }]}>{done ? 'Goal reached' : `@${p.username}`}</Text>
                </View>
                <Text style={[Type.bodyStrong, { color: Colors.text }]}>{formatGoal(c, p.progress)}</Text>
              </Pressable>
            );
          })}
        </Card>
      )}
      <Text style={[Type.small, { color: Colors.textMuted, marginTop: Spacing.md }]}>
        Activities saved as &quot;Only me&quot; are not counted, so they stay private.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { borderRadius: Radius.xl, overflow: 'hidden', backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, minHeight: 150 },
  heroScene: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  heroBody: { padding: Spacing.xl, gap: 6 },
  heroTitle: { fontSize: 32, lineHeight: 38, fontWeight: '900', color: Colors.text, letterSpacing: -0.5 },
  big: { fontSize: 34, fontWeight: '900', color: Colors.text, letterSpacing: -0.5 },
  of: { fontSize: 18, fontWeight: '700', color: Colors.textSecondary },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  divider: { borderTopWidth: 1, borderTopColor: Colors.border },
  rank: { ...Type.heading, color: Colors.textSecondary, width: 26, textAlign: 'center' },
});
