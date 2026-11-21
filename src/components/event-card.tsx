import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/icons';
import { SPORT_COLOR } from '@/components/sport-button';
import { Colors, Radius, Spacing, Type } from '@/constants/theme';
import { formatEventTime, type PaceEvent } from '@/lib/events-service';
import { formatDistanceKm } from '@/lib/format';

export function EventCard({ ev, going }: { ev: PaceEvent; going?: boolean }) {
  const router = useRouter();
  const color = SPORT_COLOR[ev.sport];
  const d = new Date(ev.startsAt);
  return (
    <Pressable
      testID={`event-${ev.id}`}
      accessibilityRole="button"
      accessibilityLabel={`${ev.title}, ${formatEventTime(ev.startsAt)}`}
      onPress={() => router.push({ pathname: '/events/[id]', params: { id: ev.id } })}
      style={({ pressed }) => [styles.card, going && { borderColor: color }, pressed && { backgroundColor: Colors.surfaceRaised }]}>
      <View style={[styles.date, { borderColor: color }]}>
        <Text style={[Type.caption, { color }]}>{d.toLocaleDateString(undefined, { month: 'short' }).toUpperCase()}</Text>
        <Text style={styles.day}>{d.getDate()}</Text>
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[Type.bodyStrong, { color: Colors.text }]} numberOfLines={1}>
          {ev.title}
        </Text>
        <Text style={[Type.small, { color: Colors.textSecondary }]} numberOfLines={1}>
          {formatEventTime(ev.startsAt)}
          {ev.distanceM ? ` · ${formatDistanceKm(ev.distanceM)} km` : ''}
        </Text>
        <Text style={[Type.small, { color: Colors.textMuted }]} numberOfLines={1}>
          {ev.meetingPoint}
        </Text>
      </View>
      {going ? <Text style={[Type.caption, { color }]}>GOING</Text> : <Icon name={ev.sport} size={22} color={color} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: Colors.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, padding: Spacing.md },
  date: { width: 52, height: 56, borderRadius: Radius.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  day: { fontSize: 22, fontWeight: '900', color: Colors.text },
});
