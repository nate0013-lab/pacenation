import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { ActivityRow } from '@/components/activity-row';
import { Icon } from '@/components/icons';
import { SPORT_COLOR, SportButton } from '@/components/sport-button';
import { Banner, Button, Card, EmptyState, Screen, SectionHeader } from '@/components/ui';
import { Colors, Radius, Spacing, Type } from '@/constants/theme';
import { getPending, retryPending } from '@/lib/activities-service';
import { useProfile } from '@/lib/auth-context';
import { formatDistanceKm, formatDuration } from '@/lib/format';
import { liveMetrics } from '@/lib/tracking/session';
import { useTracker } from '@/lib/tracking/store';
import { SPORT_LABEL, SPORTS, type Sport } from '@/lib/types';
import { useMyActivities } from '@/lib/use-stats';

const isSport = (v: unknown): v is Sport => typeof v === 'string' && (SPORTS as string[]).includes(v);

export default function ActivityTab() {
  const router = useRouter();
  const params = useLocalSearchParams<{ sport?: string; queued?: string }>();
  const { profile } = useProfile();
  const session = useTracker();
  const { activities, loading, error } = useMyActivities(profile.uid);
  const [sport, setSport] = useState<Sport>(isSport(params.sport) ? params.sport : 'run');
  const [pending, setPending] = useState(0);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    if (isSport(params.sport)) setSport(params.sport);
  }, [params.sport]);

  // Upload anything that was saved offline whenever this tab is opened.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      getPending().then((l) => {
        const mine = l.filter((p) => p.ownerId === profile.uid).length;
        if (cancelled) return;
        setPending(mine);
        if (mine) retryPending(profile.uid).then((n) => !cancelled && setPending(n));
      });
      return () => {
        cancelled = true;
      };
    }, [profile.uid]),
  );

  const inProgress = session.status === 'running' || session.status === 'paused' || session.status === 'finished';
  const m = liveMetrics(session, Date.now());

  return (
    <Screen>
      <Text style={styles.title}>Activity</Text>
      <Text style={styles.sub}>Choose how you are moving today.</Text>

      {inProgress ? (
        <Pressable testID="activity-resume-tracker" accessibilityRole="button" onPress={() => router.push('/track')} style={styles.live}>
          <View style={[styles.liveDot, { backgroundColor: session.status === 'running' ? Colors.success : Colors.gold }]} />
          <View style={{ flex: 1 }}>
            <Text style={[Type.bodyStrong, { color: Colors.text }]}>
              {SPORT_LABEL[session.sport]} {session.status === 'running' ? 'in progress' : session.status === 'paused' ? 'paused' : 'ready to save'}
            </Text>
            <Text style={[Type.small, { color: Colors.textSecondary }]}>
              {formatDistanceKm(m.distanceM)} km · {formatDuration(m.movingTimeS)} · Tap to return
            </Text>
          </View>
          <Icon name="chevron-right" size={20} color={Colors.text} />
        </Pressable>
      ) : (
        <>
          <View style={styles.sports}>
            {SPORTS.map((s) => (
              <SportButton key={s} sport={s} selected={s === sport} testID={`activity-sport-${s}`} onPress={() => setSport(s)} />
            ))}
          </View>
          <Button
            testID="activity-start"
            title={`Start ${SPORT_LABEL[sport].toLowerCase()}`}
            icon={sport}
            onPress={() => router.push({ pathname: '/track', params: { sport } })}
            style={{ marginTop: Spacing.lg, backgroundColor: SPORT_COLOR[sport], borderColor: SPORT_COLOR[sport] }}
          />
        </>
      )}

      {params.queued || pending > 0 ? (
        <Card style={styles.pending}>
          <Text style={[Type.small, { color: Colors.text, flex: 1 }]}>
            {pending > 0
              ? `${pending} ${pending === 1 ? 'activity is' : 'activities are'} saved on this phone and will upload when you are online.`
              : 'Your activity is uploaded.'}
          </Text>
          {pending > 0 ? (
            <Button
              title="Retry"
              variant="secondary"
              loading={retrying}
              onPress={async () => {
                setRetrying(true);
                setPending(await retryPending(profile.uid));
                setRetrying(false);
              }}
            />
          ) : null}
        </Card>
      ) : null}

      <SectionHeader title="Activity history" />
      {error ? <Banner kind="error" text="Your activities could not be loaded. Check your connection." /> : null}
      {loading ? (
        <ActivityIndicator color={Colors.primary} />
      ) : activities.length === 0 ? (
        <EmptyState icon="activity" title="Nothing tracked yet" body="Every activity you finish is saved here with its route, pace and stats." />
      ) : (
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          {activities.map((a, i) => (
            <View key={a.id} style={i > 0 ? styles.divider : undefined}>
              <ActivityRow a={a} />
            </View>
          ))}
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...Type.title, color: Colors.text, marginTop: Spacing.lg },
  sub: { ...Type.body, color: Colors.textSecondary, marginTop: 4, marginBottom: Spacing.xl },
  sports: { flexDirection: 'row', gap: Spacing.md },
  live: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surfaceRaised,
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  liveDot: { width: 12, height: 12, borderRadius: 6 },
  pending: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginTop: Spacing.lg },
  divider: { borderTopWidth: 1, borderTopColor: Colors.border },
});
