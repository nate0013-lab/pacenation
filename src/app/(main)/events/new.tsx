import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import { DateTimePicker } from '@/components/date-time-picker';
import { ScreenHeader } from '@/components/screen-header';
import { SportButton } from '@/components/sport-button';
import { Banner, Button, Card, Screen, SectionHeader, TextField } from '@/components/ui';
import { Colors, Spacing, Type } from '@/constants/theme';
import { useProfile } from '@/lib/auth-context';
import { createEvent, getEvent, updateEvent, validateEvent, type EventDraft } from '@/lib/events-service';
import { SPORTS, type Sport } from '@/lib/types';

function defaultStart(): number {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(7, 0, 0, 0);
  return d.getTime();
}

/** Host a new event, or edit one I host (with ?id=). */
export default function EventForm() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const { profile } = useProfile();
  const [sport, setSport] = useState<Sport>('run');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startsAt, setStartsAt] = useState(defaultStart);
  const [duration, setDuration] = useState('60');
  const [distance, setDistance] = useState('');
  const [meetingPoint, setMeetingPoint] = useState('');
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [capacity, setCapacity] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);

  // A fixed field clears the last error message.
  useEffect(() => setError(null), [sport, title, description, startsAt, duration, distance, meetingPoint, capacity]);
  useEffect(() => {
    if (!id) return;
    getEvent(id).then((e) => {
      if (!e || e.ownerId !== profile.uid) return;
      setSport(e.sport);
      setTitle(e.title);
      setDescription(e.description);
      setStartsAt(e.startsAt);
      setDuration(String(e.durationMin));
      setDistance(e.distanceM ? String(e.distanceM / 1000) : '');
      setMeetingPoint(e.meetingPoint);
      setLocation(e.location);
      setCapacity(e.capacity ? String(e.capacity) : '');
    });
  }, [id, profile.uid]);

  async function pinHere() {
    setLocating(true);
    setError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') throw new Error('PN:Location permission is needed to pin the meeting point.');
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setLocation({ lat: Math.round(pos.coords.latitude * 1e5) / 1e5, lng: Math.round(pos.coords.longitude * 1e5) / 1e5 });
    } catch (e) {
      setError(e instanceof Error && e.message.startsWith('PN:') ? e.message.slice(3) : 'Could not get your location.');
    } finally {
      setLocating(false);
    }
  }

  async function save() {
    const km = distance.trim() ? Number(distance.replace(',', '.')) : null;
    const cap = capacity.trim() ? Number(capacity) : null;
    const mins = Number(duration);
    if ((km !== null && !Number.isFinite(km)) || (cap !== null && !Number.isInteger(cap)) || !Number.isInteger(mins) || mins < 15 || mins > 720) {
      setError('Check the numbers: duration 15 to 720 minutes, distance in km, spaces as a whole number.');
      return;
    }
    const draft: EventDraft = { title, description, sport, startsAt, durationMin: mins, distanceM: km === null ? null : km * 1000, meetingPoint, location, capacity: cap };
    const problem = validateEvent(draft);
    if (problem) {
      setError(problem);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (id) {
        await updateEvent(profile.uid, id, draft);
        router.back();
      } else {
        const newId = await createEvent(profile, draft);
        router.replace({ pathname: '/events/[id]', params: { id: newId } });
      }
    } catch {
      setError('Could not save the event. Check your connection.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen header={<ScreenHeader title={id ? 'Edit event' : 'Host an event'} />}>
      <Text style={[Type.body, { color: Colors.textSecondary }]}>Invite the community to walk, run or ride with you. Everyone signed in can see events.</Text>
      <SectionHeader title="Sport" />
      <View style={{ flexDirection: 'row', gap: Spacing.md }}>
        {SPORTS.map((s) => (
          <SportButton key={s} sport={s} selected={sport === s} testID={`event-sport-${s}`} onPress={() => setSport(s)} />
        ))}
      </View>
      <View style={{ gap: Spacing.md, marginTop: Spacing.lg }}>
        <TextField testID="event-title" label="Title" value={title} onChangeText={setTitle} maxLength={60} placeholder="Saturday sunrise run" />
        <TextField testID="event-meeting" label="Meeting point" value={meetingPoint} onChangeText={setMeetingPoint} maxLength={120} placeholder="Main gate car park" />
        <Card style={{ gap: Spacing.sm }}>
          <Text style={[Type.small, { color: Colors.textSecondary }]}>{location ? `Pinned at ${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}` : 'Optionally pin the exact spot so people can open it in their maps app.'}</Text>
          <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
            <Button testID="event-pin" title={location ? 'Pin again here' : 'Pin my current location'} icon="map" variant="secondary" loading={locating} onPress={pinHere} style={{ flex: 1 }} />
            {location ? <Button title="Remove" variant="ghost" onPress={() => setLocation(null)} /> : null}
          </View>
        </Card>
      </View>
      <SectionHeader title="When" />
      <DateTimePicker value={startsAt} onChange={setStartsAt} />
      <View style={{ gap: Spacing.md, marginTop: Spacing.lg }}>
        <View style={{ flexDirection: 'row', gap: Spacing.md }}>
          <View style={{ flex: 1 }}>
            <TextField testID="event-duration" label="Duration (min)" value={duration} onChangeText={setDuration} keyboardType="number-pad" maxLength={3} />
          </View>
          <View style={{ flex: 1 }}>
            <TextField testID="event-distance" label="Distance (km)" value={distance} onChangeText={setDistance} keyboardType="decimal-pad" maxLength={6} placeholder="Optional" />
          </View>
        </View>
        <TextField testID="event-capacity" label="Spaces" value={capacity} onChangeText={setCapacity} keyboardType="number-pad" maxLength={3} placeholder="No limit" />
        <TextField testID="event-description" label="Details" value={description} onChangeText={setDescription} multiline maxLength={1000} placeholder="Pace, route, what to bring" style={{ minHeight: 100, textAlignVertical: 'top' }} />
      </View>
      {error ? <Banner kind="error" text={error} /> : null}
      <Button testID="event-save" title={id ? 'Save changes' : 'Create event'} onPress={save} loading={saving} style={{ marginTop: Spacing.lg }} />
    </Screen>
  );
}
