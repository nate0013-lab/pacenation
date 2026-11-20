import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { formatActivityDate } from '@/components/activity-row';
import { Icon } from '@/components/icons';
import { RouteMap } from '@/components/route-map';
import { ScreenHeader } from '@/components/screen-header';
import { SPORT_COLOR } from '@/components/sport-button';
import { Banner, Button, Card, EmptyState, Screen, StatTile } from '@/components/ui';
import { Colors, Spacing, Type } from '@/constants/theme';
import { deleteActivity, getActivity, getRoute } from '@/lib/activities-service';
import { useProfile } from '@/lib/auth-context';
import { formatDistanceKm, formatDuration, formatPace, formatSpeedKmh } from '@/lib/format';
import type { TrackPoint } from '@/lib/tracking/geo';
import { SPORT_LABEL, type Activity } from '@/lib/types';

const VIS_LABEL = { public: 'Everyone', followers: 'Followers', private: 'Only me' } as const;

export default function ActivityDetail() {
  const { id, saved } = useLocalSearchParams<{ id: string; saved?: string }>();
  const router = useRouter();
  const { profile } = useProfile();
  const [activity, setActivity] = useState<Activity | null | undefined>(undefined);
  const [route, setRoute] = useState<TrackPoint[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getActivity(id), getRoute(id).catch(() => [])])
      .then(([a, r]) => {
        if (cancelled) return;
        setActivity(a);
        setRoute(r);
      })
      .catch(() => !cancelled && (setActivity(null), setError('This activity is private or no longer exists.')));
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function remove() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setDeleting(true);
    try {
      await deleteActivity(id);
      router.replace('/activity');
    } catch {
      setError('Could not delete. Check your connection and try again.');
      setDeleting(false);
    }
  }

  if (activity === undefined) {
    return (
      <Screen header={<ScreenHeader title="Activity" fallback="/" />}>
        <ActivityIndicator color={Colors.primary} style={{ marginTop: Spacing.xxl }} />
      </Screen>
    );
  }
  if (activity === null) {
    return (
      <Screen header={<ScreenHeader title="Activity" fallback="/" />}>
        <EmptyState icon="lock" title="Activity unavailable" body={error ?? 'This activity is private or no longer exists.'} />
      </Screen>
    );
  }

  const a = activity;
  const color = SPORT_COLOR[a.sport];
  const isOwner = a.ownerId === profile.uid;
  return (
    <Screen header={<ScreenHeader title={SPORT_LABEL[a.sport]} fallback="/" />}>
      {saved ? (
        <Animated.View entering={FadeInDown} style={{ marginBottom: Spacing.md }}>
          <Banner kind="success" text={`Saved. ${formatDistanceKm(a.distanceM)} km added to your totals.`} />
        </Animated.View>
      ) : null}
      <View style={styles.titleRow}>
        <Icon name={a.sport} size={26} color={color} />
        <View style={{ flex: 1 }}>
          <Text style={[Type.title, { color: Colors.text }]} testID="activity-title">
            {a.title}
          </Text>
          <Text style={[Type.small, { color: Colors.textSecondary }]}>
            {formatActivityDate(a)} · {VIS_LABEL[a.visibility]}
          </Text>
        </View>
      </View>

      <RouteMap points={route} color={color} height={280} style={{ marginTop: Spacing.lg }} />
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: Colors.success }]} />
          <Text style={[Type.small, { color: Colors.textSecondary }]}>Start</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: Colors.danger }]} />
          <Text style={[Type.small, { color: Colors.textSecondary }]}>Finish</Text>
        </View>
      </View>

      <View style={styles.grid}>
        <StatTile label="Distance" value={formatDistanceKm(a.distanceM)} unit="km" accent={color} />
        <StatTile label="Moving time" value={formatDuration(a.movingTimeS)} accent={Colors.gold} />
      </View>
      <View style={styles.grid}>
        <StatTile label="Avg pace" value={formatPace(a.avgPaceSPerKm)} unit="/km" accent={Colors.walk} />
        <StatTile label="Avg speed" value={formatSpeedKmh(a.avgSpeedMps)} unit="km/h" accent={Colors.primary} />
      </View>
      <View style={styles.grid}>
        <StatTile label="Elevation gain" value={a.elevationGainM === null ? '--' : String(a.elevationGainM)} unit={a.elevationGainM === null ? undefined : 'm'} accent={Colors.ride} />
        <StatTile label="Calories" value={String(a.calories)} unit="kcal" accent={Colors.danger} />
      </View>
      <Card style={{ marginTop: Spacing.md, gap: 6 }}>
        <Row label="Elapsed time" value={formatDuration(a.elapsedTimeS)} />
        <Row label="Max speed" value={`${formatSpeedKmh(a.maxSpeedMps)} km/h`} />
        <Row label="GPS points" value={String(a.pointCount)} />
      </Card>

      {error ? <Banner kind="error" text={error} /> : null}
      {isOwner ? (
        <Button
          testID="activity-delete"
          title={confirmDelete ? 'Tap again to delete for good' : 'Delete activity'}
          variant="danger"
          onPress={remove}
          loading={deleting}
          style={{ marginTop: Spacing.xl }}
        />
      ) : null}
    </Screen>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.kv}>
      <Text style={[Type.small, { color: Colors.textSecondary }]}>{label}</Text>
      <Text style={[Type.small, { color: Colors.text, fontWeight: '600' }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginTop: Spacing.sm },
  legend: { flexDirection: 'row', gap: Spacing.lg, marginTop: Spacing.sm },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  grid: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.md },
  kv: { flexDirection: 'row', justifyContent: 'space-between' },
});
