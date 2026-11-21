import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { EventCard } from '@/components/event-card';
import { ScreenHeader } from '@/components/screen-header';
import { Button, EmptyState, Screen, Segmented } from '@/components/ui';
import { Colors, Spacing, Type } from '@/constants/theme';
import { useProfile } from '@/lib/auth-context';
import { watchMyEventIds, watchUpcoming, type PaceEvent } from '@/lib/events-service';
import { SPORT_LABEL, type Sport } from '@/lib/types';

type Filter = 'all' | Sport | 'going';

export default function EventsScreen() {
  const router = useRouter();
  const { profile } = useProfile();
  const [list, setList] = useState<PaceEvent[] | null>(null);
  const [mine, setMine] = useState<string[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  useEffect(() => watchUpcoming(setList), []);
  useEffect(() => watchMyEventIds(profile.uid, setMine), [profile.uid]);

  const shown = (list ?? []).filter((e) => (filter === 'all' ? true : filter === 'going' ? mine.includes(e.id) : e.sport === filter));
  return (
    <Screen header={<ScreenHeader title="Events" fallback="/" />}>
      <Text style={[Type.body, { color: Colors.textSecondary, marginBottom: Spacing.lg }]}>Group walks, runs and rides hosted by the PaceNation community.</Text>
      <Button testID="events-host" title="Host an event" icon="calendar" onPress={() => router.push('/events/new')} />
      <View style={{ marginTop: Spacing.lg, marginBottom: Spacing.lg }}>
        <Segmented
          options={[
            { value: 'all', label: 'All' },
            { value: 'walk', label: SPORT_LABEL.walk },
            { value: 'run', label: SPORT_LABEL.run },
            { value: 'ride', label: SPORT_LABEL.ride },
            { value: 'going', label: 'Going' },
          ]}
          value={filter}
          onChange={setFilter}
        />
      </View>
      {list === null ? (
        <ActivityIndicator color={Colors.primary} />
      ) : shown.length === 0 ? (
        <EmptyState icon="calendar" title={filter === 'going' ? 'No events yet' : 'Nothing planned yet'} body={filter === 'going' ? 'Events you join show up here.' : 'Be the first to host one.'} />
      ) : (
        <View style={{ gap: Spacing.md }}>
          {shown.map((e) => (
            <EventCard key={e.id} ev={e} going={mine.includes(e.id)} />
          ))}
        </View>
      )}
    </Screen>
  );
}
