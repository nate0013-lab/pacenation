import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Share, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { formatActivityDate } from '@/components/activity-row';
import { Icon } from '@/components/icons';
import { ElevationChart } from '@/components/elevation-chart';
import { RouteReplay } from '@/components/route-replay';
import { SplitsTable } from '@/components/splits-table';
import { ScreenHeader } from '@/components/screen-header';
import { SPORT_COLOR } from '@/components/sport-button';
import { Banner, Button, Card, EmptyState, Screen, SectionHeader, Segmented, StatTile, TextField } from '@/components/ui';
import { Colors, Spacing, Type } from '@/constants/theme';
import { deleteActivity, getActivity, getRoute, shareText, updateActivityDetails } from '@/lib/activities-service';
import { exportGpx } from '@/lib/export-route';
import { useProfile } from '@/lib/auth-context';
import { formatDistanceKm, formatDuration, formatPace, formatSpeedKmh } from '@/lib/format';
import type { TrackPoint } from '@/lib/tracking/geo';
import { elevationProfile, gpxFileName, kmSplits, toGpx } from '@/lib/tracking/route-tools';
import { useMemo } from 'react';
import { SPORT_LABEL, type Activity, type Visibility } from '@/lib/types';
import { BadgeStrip } from '@/components/badge-strip';
import { TIER_XP } from '@/lib/progress/badges';
import { xpForActivity } from '@/lib/progress/xp';
import { useProgress } from '@/lib/use-stats';

const VIS_LABEL = { public: 'Everyone', followers: 'Followers', private: 'Only me' } as const;
const VIS_OPTIONS: { value: Visibility; label: string }[] = [
  { value: 'public', label: 'Everyone' },
  { value: 'followers', label: 'Followers' },
  { value: 'private', label: 'Only me' },
];

export default function ActivityDetail() {
  const { id, saved } = useLocalSearchParams<{ id: string; saved?: string }>();
  const router = useRouter();
  const { profile } = useProfile();
  const progress = useProgress();
  const [activity, setActivity] = useState<Activity | null | undefined>(undefined);
  const [route, setRoute] = useState<TrackPoint[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftVis, setDraftVis] = useState<Visibility>('followers');
  const [savingEdit, setSavingEdit] = useState(false);
  const splits = useMemo(() => kmSplits(route), [route]);
  const profile3 = useMemo(() => elevationProfile(route), [route]);

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

  async function share() {
    if (!activity) return;
    setNotice(null);
    try {
      await Share.share({ message: shareText(activity), title: activity.title });
    } catch {
      setNotice('Sharing is not available here. Use Download route to save the GPX file instead.');
    }
  }

  async function download() {
    if (!activity) return;
    setNotice(null);
    try {
      const startedAt = activity.startedAt.toMillis();
      const res = await exportGpx(gpxFileName(activity.title, startedAt), toGpx({ title: activity.title, sport: activity.sport, startedAt }, route));
      if (res === 'downloaded') setNotice('Route downloaded as a GPX file.');
    } catch (e) {
      setError(e instanceof Error && e.message.startsWith('PN:') ? e.message.slice(3) : 'Could not export the route.');
    }
  }

  function startEdit() {
    if (!activity) return;
    setDraftTitle(activity.title);
    setDraftVis(activity.visibility);
    setEditing(true);
  }

  async function saveEdit() {
    if (!activity) return;
    setSavingEdit(true);
    try {
      await updateActivityDetails(activity.id, { title: draftTitle, visibility: draftVis });
      setActivity({ ...activity, title: draftTitle.trim().slice(0, 80) || 'Activity', visibility: draftVis });
      setEditing(false);
      setNotice('Changes saved.');
    } catch {
      setError('Could not save changes. Check your connection and try again.');
    } finally {
      setSavingEdit(false);
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
  const unlocked = isOwner ? progress.earned.filter((b) => b.activityId === a.id) : [];
  const xpEarned = xpForActivity(a) + unlocked.reduce((n, b) => n + TIER_XP[b.badge.tier], 0);
  return (
    <Screen header={<ScreenHeader title={SPORT_LABEL[a.sport]} fallback="/" />}>
      {saved ? (
        <Animated.View entering={FadeInDown} style={{ marginBottom: Spacing.md }}>
          <Banner kind="success" text={`Saved. ${formatDistanceKm(a.distanceM)} km and ${xpEarned} XP added to your totals.`} />
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

      <View style={{ marginTop: Spacing.lg }}>
        <RouteReplay points={route} color={color} height={300} />
      </View>
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

      <View style={styles.actions}>
        <Button testID="activity-share" title="Share" icon="community" variant="secondary" onPress={share} style={{ flex: 1 }} />
        <Button testID="activity-download" title="Download route" icon="map" variant="secondary" onPress={download} disabled={route.length < 2} style={{ flex: 1 }} />
      </View>
      {notice ? <Banner kind="success" text={notice} /> : null}

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
        {isOwner ? <Row label="XP earned" value={`+${xpEarned} XP`} /> : null}
      </Card>

      {unlocked.length ? (
        <>
          <SectionHeader title={unlocked.length === 1 ? 'Badge unlocked' : `${unlocked.length} badges unlocked`} />
          <Card>
            <BadgeStrip testID="activity-badges" badges={unlocked} />
          </Card>
        </>
      ) : null}

      {splits.length ? (
        <>
          <SectionHeader title="Splits" />
          <Card>
            <SplitsTable splits={splits} color={color} />
          </Card>
        </>
      ) : null}

      <SectionHeader title="Elevation" />
      <Card>
        {profile3 ? (
          <ElevationChart data={profile3} />
        ) : (
          <Text style={[Type.small, { color: Colors.textSecondary }]}>This device did not record altitude for this activity.</Text>
        )}
      </Card>

      {error ? <Banner kind="error" text={error} /> : null}
      {isOwner ? (
        editing ? (
          <Card style={{ gap: Spacing.md, marginTop: Spacing.xl }}>
            <TextField testID="activity-edit-title" label="Title" value={draftTitle} onChangeText={setDraftTitle} maxLength={80} />
            <Text style={[Type.caption, { color: Colors.textSecondary }]}>WHO CAN SEE IT</Text>
            <Segmented options={VIS_OPTIONS} value={draftVis} onChange={setDraftVis} />
            <Button testID="activity-edit-save" title="Save changes" onPress={saveEdit} loading={savingEdit} />
            <Button title="Cancel" variant="ghost" onPress={() => setEditing(false)} />
          </Card>
        ) : (
          <Button testID="activity-edit" title="Edit title and visibility" variant="secondary" onPress={startEdit} style={{ marginTop: Spacing.xl }} />
        )
      ) : null}
      {isOwner ? (
        <Button
          testID="activity-delete"
          title={confirmDelete ? 'Tap again to delete for good' : 'Delete activity'}
          variant="danger"
          onPress={remove}
          loading={deleting}
          style={{ marginTop: Spacing.md }}
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
  actions: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.lg, marginBottom: Spacing.sm },
});
