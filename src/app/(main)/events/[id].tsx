import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { Icon } from '@/components/icons';
import { MountainScene } from '@/components/mountain-scene';
import { ScreenHeader } from '@/components/screen-header';
import { SPORT_COLOR } from '@/components/sport-button';
import { Banner, Button, Card, EmptyState, Screen, SectionHeader } from '@/components/ui';
import { Colors, Radius, Spacing, Type } from '@/constants/theme';
import { useProfile } from '@/lib/auth-context';
import { cancelEvent, formatEventTime, joinEvent, leaveEvent, watchAttendees, watchEvent, type Attendee, type PaceEvent } from '@/lib/events-service';
import { formatDistanceKm } from '@/lib/format';
import { SPORT_LABEL } from '@/lib/types';

export default function EventScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { profile } = useProfile();
  const [ev, setEv] = useState<PaceEvent | null | undefined>(undefined);
  const [people, setPeople] = useState<Attendee[]>([]);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<'leave' | 'cancel' | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => watchEvent(id, setEv), [id]);
  useEffect(() => watchAttendees(id, setPeople), [id]);

  if (ev === undefined) {
    return (
      <Screen header={<ScreenHeader title="Event" />}>
        <ActivityIndicator color={Colors.primary} style={{ marginTop: Spacing.xxl }} />
      </Screen>
    );
  }
  if (ev === null) {
    return (
      <Screen header={<ScreenHeader title="Event" />}>
        <EmptyState icon="calendar" title="Event not found" body="It may have been removed by its host." />
      </Screen>
    );
  }

  const going = people.some((p) => p.uid === profile.uid);
  const host = ev.ownerId === profile.uid;
  const started = ev.startsAt <= Date.now();
  const full = ev.capacity !== null && people.length >= ev.capacity;
  const color = SPORT_COLOR[ev.sport];

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
      setConfirm(null);
    } catch {
      setError('That did not work. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen header={<ScreenHeader title="Event" fallback="/" />}>
      <View style={styles.hero}>
        <MountainScene height={140} style={styles.heroScene} />
        <View style={styles.heroBody}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
            <Icon name={ev.sport} size={20} color={color} />
            <Text style={[Type.caption, { color }]}>GROUP {SPORT_LABEL[ev.sport].toUpperCase()}</Text>
          </View>
          <Text style={styles.title} testID="event-title-text">
            {ev.title}
          </Text>
          <Text style={[Type.bodyStrong, { color: Colors.gold }]}>{formatEventTime(ev.startsAt)}</Text>
        </View>
      </View>

      {ev.cancelled ? <Banner kind="error" text="This event has been cancelled by its host." /> : null}

      <Card style={{ marginTop: Spacing.lg, gap: Spacing.md }}>
        <Row icon="map" label="Meeting point" value={ev.meetingPoint} />
        {ev.location ? (
          <Button
            testID="event-open-map"
            title="Open in maps"
            variant="secondary"
            icon="map"
            onPress={() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${ev.location!.lat},${ev.location!.lng}`)}
          />
        ) : null}
        <Row icon="calendar" label="Duration" value={`${ev.durationMin} min`} />
        {ev.distanceM ? <Row icon="route" label="Distance" value={`${formatDistanceKm(ev.distanceM)} km`} /> : null}
        <Row icon="community" label="Going" value={ev.capacity ? `${people.length} of ${ev.capacity}` : String(people.length)} testID="event-going-count" />
        <Pressable onPress={() => (host ? router.navigate('/profile') : router.push({ pathname: '/user/[uid]', params: { uid: ev.ownerId } }))} accessibilityRole="button">
          <Row icon="profile" label="Host" value={host ? 'You' : ev.ownerName} />
        </Pressable>
      </Card>

      {ev.description ? <Text style={[Type.body, { color: Colors.text, marginTop: Spacing.lg }]}>{ev.description}</Text> : null}

      {error ? <Banner kind="error" text={error} /> : null}
      {!ev.cancelled && !started ? (
        <View style={{ gap: Spacing.sm, marginTop: Spacing.lg }}>
          {going ? (
            !host ? (
              <Button
                testID="event-leave"
                title={confirm === 'leave' ? 'Tap again to leave' : "You're going · Leave"}
                variant={confirm === 'leave' ? 'danger' : 'secondary'}
                icon={confirm === 'leave' ? undefined : 'check'}
                loading={busy}
                onPress={() => (confirm === 'leave' ? run(() => leaveEvent(profile.uid, ev.id)) : setConfirm('leave'))}
              />
            ) : null
          ) : (
            <Button testID="event-join" title={full ? 'Event is full' : "I'm going"} icon="check" disabled={full} loading={busy} onPress={() => run(() => joinEvent(profile, ev))} />
          )}
          {host ? (
            <>
              <Button testID="event-edit" title="Edit event" variant="secondary" onPress={() => router.push({ pathname: '/events/new', params: { id: ev.id } })} />
              <Button
                testID="event-cancel"
                title={confirm === 'cancel' ? 'Tap again to cancel the event' : 'Cancel event'}
                variant="danger"
                loading={busy}
                onPress={() => (confirm === 'cancel' ? run(() => cancelEvent(profile.uid, ev)) : setConfirm('cancel'))}
              />
            </>
          ) : null}
        </View>
      ) : started && !ev.cancelled ? (
        <Text style={[Type.body, { color: Colors.textSecondary, marginTop: Spacing.lg }]}>This event has started. Track your activity from the Activity tab.</Text>
      ) : null}

      <SectionHeader title={`Who's going (${people.length})`} />
      {people.length === 0 ? (
        <Text style={[Type.body, { color: Colors.textSecondary }]}>Nobody yet.</Text>
      ) : (
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          {people.map((p, i) => (
            <Pressable
              key={p.uid}
              testID={`attendee-${p.username}`}
              accessibilityRole="button"
              onPress={() => (p.uid === profile.uid ? router.navigate('/profile') : router.push({ pathname: '/user/[uid]', params: { uid: p.uid } }))}
              style={[styles.person, i > 0 && styles.divider]}>
              <Avatar uri={null} name={p.displayName} size={34} />
              <Text style={[Type.bodyStrong, { color: Colors.text, flex: 1 }]}>{p.uid === profile.uid ? 'You' : p.displayName}</Text>
              {p.uid === ev.ownerId ? <Text style={[Type.caption, { color: Colors.gold }]}>HOST</Text> : null}
            </Pressable>
          ))}
        </Card>
      )}
    </Screen>
  );
}

function Row({ icon, label, value, testID }: { icon: 'map' | 'calendar' | 'route' | 'community' | 'profile'; label: string; value: string; testID?: string }) {
  return (
    <View style={styles.row}>
      <Icon name={icon} size={20} color={Colors.textSecondary} />
      <Text style={[Type.small, { color: Colors.textSecondary, width: 100 }]}>{label}</Text>
      <Text style={[Type.bodyStrong, { color: Colors.text, flex: 1, textAlign: 'right' }]} testID={testID}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { borderRadius: Radius.xl, overflow: 'hidden', backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, minHeight: 140 },
  heroScene: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  heroBody: { padding: Spacing.xl, gap: 6 },
  title: { fontSize: 28, lineHeight: 34, fontWeight: '900', color: Colors.text },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  person: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  divider: { borderTopWidth: 1, borderTopColor: Colors.border },
});
