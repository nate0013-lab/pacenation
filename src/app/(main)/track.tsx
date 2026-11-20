import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GpsSignal, signalLevel } from '@/components/gps-signal';
import { Icon } from '@/components/icons';
import { Metric } from '@/components/metric';
import { RouteMap } from '@/components/route-map';
import { SPORT_COLOR, SportButton } from '@/components/sport-button';
import { Banner, Button, Card, Segmented, TextField } from '@/components/ui';
import { Colors, MaxContentWidth, Radius, Spacing, Type } from '@/constants/theme';
import { newActivityId, saveActivity } from '@/lib/activities-service';
import { useProfile } from '@/lib/auth-context';
import { formatDistanceKm, formatDuration, formatPace, formatSpeedKmh } from '@/lib/format';
import { getPrivateSettings } from '@/lib/profile-service';
import { defaultTitle } from '@/lib/tracking/geo';
import { liveMetrics } from '@/lib/tracking/session';
import { tracker, useTracker } from '@/lib/tracking/store';
import { SPORT_LABEL, SPORTS, type Sport, type Visibility } from '@/lib/types';

const isSport = (v: unknown): v is Sport => typeof v === 'string' && (SPORTS as string[]).includes(v);
const VIS_OPTIONS: { value: Visibility; label: string }[] = [
  { value: 'public', label: 'Everyone' },
  { value: 'followers', label: 'Followers' },
  { value: 'private', label: 'Only me' },
];

function useNow(active: boolean) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [active]);
  return now;
}

export default function TrackScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ sport?: string }>();
  const { profile } = useProfile();
  const s = useTracker();
  const now = useNow(true);
  const [permission, setPermission] = useState<'pending' | 'granted' | 'denied' | 'services-off'>('pending');
  const [backgroundNote, setBackgroundNote] = useState(false);
  const [title, setTitle] = useState('');
  const [visibility, setVisibility] = useState<Visibility>(profile.privacy.activityVisibility);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  // Ask for location and start listening for GPS as soon as the screen opens.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const weight = await getPrivateSettings(profile.uid)
        .then((p) => p?.weightKg ?? null)
        .catch(() => null);
      const res = await tracker.prepare(isSport(params.sport) ? params.sport : tracker.getState().sport, weight);
      if (!cancelled) setPermission(res);
    })();
    return () => {
      cancelled = true;
      tracker.release();
    };
    // Run once per visit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (s.status === 'finished' && !title && s.startedAt !== null) setTitle(defaultTitle(s.sport, new Date(s.startedAt)));
  }, [s.status, s.sport, s.startedAt, title]);

  const m = useMemo(() => liveMetrics(s, now), [s, now]);
  const route = s.points;
  const current = s.lastFix && s.status !== 'finished' ? { lat: s.lastFix.lat, lng: s.lastFix.lng } : null;
  const color = SPORT_COLOR[s.sport];
  const isRide = s.sport === 'ride';
  const weak = signalLevel(s.lastFix, now) === 'none' || signalLevel(s.lastFix, now) === 'weak';

  async function start() {
    setError(null);
    const { background } = await tracker.start();
    setBackgroundNote(!background && Platform.OS !== 'web');
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const id = newActivityId();
      const result = await saveActivity({ id, ownerId: profile.uid, title: title || defaultTitle(s.sport, new Date(s.startedAt ?? Date.now())), visibility, session: s });
      await tracker.reset();
      if (result === 'saved') router.replace({ pathname: '/activity/[id]', params: { id, saved: '1' } });
      else router.replace({ pathname: '/activity', params: { queued: '1' } });
    } catch {
      setError('Could not save right now. Your activity is kept on this phone and will upload when you are back online.');
      setSaving(false);
    }
  }

  async function discard() {
    if (!confirmDiscard) {
      setConfirmDiscard(true);
      return;
    }
    await tracker.reset();
    router.back();
  }

  function close() {
    if (router.canGoBack()) router.back();
    else router.replace('/activity');
  }

  if (permission === 'denied' || permission === 'services-off') {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.center}>
          <Icon name="map" size={40} color={Colors.primary} />
          <Text style={[Type.title, { color: Colors.text, textAlign: 'center' }]}>
            {permission === 'services-off' ? 'Turn on location services' : 'Location access needed'}
          </Text>
          <Text style={[Type.body, { color: Colors.textSecondary, textAlign: 'center' }]}>
            PaceNation uses your location only while you track an activity, to map your route and measure distance and pace.
          </Text>
          {Platform.OS !== 'web' ? <Button title="Open settings" onPress={() => Linking.openSettings()} /> : null}
          <Button title="Not now" variant="ghost" onPress={close} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={close} accessibilityRole="button" accessibilityLabel={s.status === 'running' || s.status === 'paused' ? 'Minimise tracker' : 'Close'} hitSlop={12} style={styles.headerBtn} testID="track-close">
          <Icon name="back" size={24} color={Colors.text} />
        </Pressable>
        <View style={styles.headerMid}>
          <Icon name={s.sport} size={20} color={color} />
          <Text style={[Type.bodyStrong, { color: Colors.text }]}>{SPORT_LABEL[s.sport]}</Text>
          {s.status === 'paused' ? <Text style={[Type.caption, { color: Colors.gold }]}> PAUSED</Text> : null}
        </View>
        <GpsSignal fix={s.lastFix} now={now} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <RouteMap points={route} current={current} follow={s.status === 'running' || s.status === 'ready'} color={color} height={s.status === 'finished' ? 220 : 260} />

        {s.status !== 'ready' && s.status !== 'idle' ? (
          <Animated.View entering={FadeIn} style={styles.metrics}>
            <Metric big label="Kilometres" value={formatDistanceKm(m.distanceM, 2)} testID="track-distance" />
            <View style={styles.row}>
              <Metric label="Time" value={formatDuration(m.movingTimeS)} testID="track-time" />
              {isRide ? (
                <Metric label="Speed" value={m.currentSpeedMps === null ? '--' : formatSpeedKmh(m.currentSpeedMps)} unit="km/h" />
              ) : (
                <Metric label="Current pace" value={formatPace(m.currentPaceSPerKm)} unit="/km" testID="track-pace" />
              )}
            </View>
            <View style={[styles.row, styles.rowBorder]}>
              {isRide ? (
                <Metric label="Avg speed" value={formatSpeedKmh(m.avgSpeedMps)} unit="km/h" />
              ) : (
                <Metric label="Avg pace" value={formatPace(m.avgPaceSPerKm)} unit="/km" testID="track-avg-pace" />
              )}
              {isRide ? (
                <Metric label="Avg pace" value={formatPace(m.avgPaceSPerKm)} unit="/km" />
              ) : (
                <Metric label="Speed" value={formatSpeedKmh(m.avgSpeedMps)} unit="km/h" />
              )}
              <Metric label="Calories" value={String(m.calories)} unit="kcal" testID="track-calories" />
            </View>
          </Animated.View>
        ) : (
          <Animated.View entering={FadeInDown} style={{ gap: Spacing.lg, marginTop: Spacing.lg }}>
            <View style={styles.sports}>
              {SPORTS.map((sp) => (
                <SportButton key={sp} sport={sp} selected={sp === s.sport} onPress={() => tracker.setSport(sp)} testID={`track-sport-${sp}`} />
              ))}
            </View>
            {permission === 'pending' ? <Banner kind="info" text="Allow location access to start tracking." /> : null}
            {permission === 'granted' && weak ? (
              <Banner kind="info" text="Finding your position. Head outdoors with a clear view of the sky for the most accurate route." />
            ) : null}
          </Animated.View>
        )}

        {backgroundNote ? (
          <Banner kind="info" text="Background location is off, so keep PaceNation open while you move. You can allow it in Settings for screen-off tracking." />
        ) : null}
        {error ? <Banner kind="error" text={error} /> : null}

        {s.status === 'finished' ? (
          <Card style={{ gap: Spacing.lg, marginTop: Spacing.lg }}>
            <Text style={[Type.heading, { color: Colors.text }]}>Nice work. Save your {SPORT_LABEL[s.sport].toLowerCase()}?</Text>
            {s.distanceM < 50 ? <Banner kind="info" text="This activity is under 50 metres. You can still save it, or discard it." /> : null}
            <TextField testID="track-title" label="Title" value={title} onChangeText={setTitle} maxLength={80} />
            <View style={{ gap: 6 }}>
              <Text style={styles.fieldLabel}>WHO CAN SEE IT</Text>
              <Segmented options={VIS_OPTIONS} value={visibility} onChange={setVisibility} />
            </View>
            <Button testID="track-save" title="Save activity" onPress={save} loading={saving} />
            <Button testID="track-discard" title={confirmDiscard ? 'Tap again to discard' : 'Discard'} variant="danger" onPress={discard} disabled={saving} />
          </Card>
        ) : null}
      </ScrollView>

      {s.status !== 'finished' ? (
        <View style={styles.controls}>
          {s.status === 'ready' || s.status === 'idle' ? (
            <Pressable
              testID="track-start"
              accessibilityRole="button"
              accessibilityLabel={`Start ${SPORT_LABEL[s.sport]}`}
              disabled={permission !== 'granted'}
              onPress={start}
              style={({ pressed }) => [styles.bigBtn, { backgroundColor: color }, permission !== 'granted' && { opacity: 0.5 }, pressed && styles.pressed]}>
              <Text style={styles.bigBtnText}>START</Text>
            </Pressable>
          ) : s.status === 'running' ? (
            <Pressable testID="track-pause" accessibilityRole="button" accessibilityLabel="Pause" onPress={tracker.pause} style={({ pressed }) => [styles.bigBtn, styles.pauseBtn, pressed && styles.pressed]}>
              <View style={styles.pauseIcon}>
                <View style={styles.pauseBar} />
                <View style={styles.pauseBar} />
              </View>
            </Pressable>
          ) : (
            <View style={styles.pausedRow}>
              <Pressable testID="track-resume" accessibilityRole="button" onPress={() => tracker.resume()} style={({ pressed }) => [styles.midBtn, { backgroundColor: color }, pressed && styles.pressed]}>
                <Text style={styles.midBtnText}>RESUME</Text>
              </Pressable>
              <Pressable testID="track-finish" accessibilityRole="button" onPress={() => tracker.finish()} style={({ pressed }) => [styles.midBtn, styles.finishBtn, pressed && styles.pressed]}>
                <Text style={[styles.midBtnText, { color: Colors.text }]}>FINISH</Text>
              </Pressable>
            </View>
          )}
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.lg, padding: Spacing.xl, maxWidth: MaxContentWidth, alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, height: 52, width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' },
  headerBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerMid: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  scroll: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xl, gap: Spacing.md, width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' },
  metrics: { marginTop: Spacing.sm },
  row: { flexDirection: 'row' },
  rowBorder: { borderTopWidth: 1, borderTopColor: Colors.border, marginTop: Spacing.xs },
  sports: { flexDirection: 'row', gap: Spacing.md },
  controls: { alignItems: 'center', paddingVertical: Spacing.lg, borderTopWidth: 1, borderTopColor: Colors.border, backgroundColor: Colors.surface },
  bigBtn: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center' },
  bigBtnText: { fontSize: 18, fontWeight: '900', color: Colors.onPrimary, letterSpacing: 1.5 },
  pauseBtn: { backgroundColor: Colors.gold },
  pauseIcon: { flexDirection: 'row', gap: 10 },
  pauseBar: { width: 9, height: 32, borderRadius: 3, backgroundColor: Colors.onGold },
  pausedRow: { flexDirection: 'row', gap: Spacing.lg },
  midBtn: { minWidth: 136, height: 64, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.xl },
  midBtnText: { fontSize: 16, fontWeight: '900', color: Colors.onPrimary, letterSpacing: 1.2 },
  finishBtn: { backgroundColor: Colors.surfaceRaised, borderWidth: 1.5, borderColor: Colors.danger },
  pressed: { transform: [{ scale: 0.96 }], opacity: 0.9 },
  fieldLabel: { ...Type.caption, color: Colors.textSecondary },
});
