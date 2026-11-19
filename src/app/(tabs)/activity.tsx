import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/icons';
import { SPORT_COLOR, SportButton } from '@/components/sport-button';
import { Card, EmptyState, Screen, SectionHeader } from '@/components/ui';
import { Colors, Spacing, Type } from '@/constants/theme';
import { SPORT_LABEL, SPORTS, type Sport } from '@/lib/types';

const isSport = (v: unknown): v is Sport => typeof v === 'string' && (SPORTS as string[]).includes(v);

export default function ActivityTab() {
  const params = useLocalSearchParams<{ sport?: string }>();
  const [sport, setSport] = useState<Sport>(isSport(params.sport) ? params.sport : 'run');

  useEffect(() => {
    if (isSport(params.sport)) setSport(params.sport);
  }, [params.sport]);

  return (
    <Screen>
      <Text style={styles.title}>Activity</Text>
      <Text style={styles.sub}>Choose how you are moving today.</Text>

      <View style={styles.sports}>
        {SPORTS.map((s) => (
          <SportButton key={s} sport={s} selected={s === sport} testID={`activity-sport-${s}`} onPress={() => setSport(s)} />
        ))}
      </View>

      <Card style={styles.ready}>
        <View style={[styles.dot, { backgroundColor: SPORT_COLOR[sport] }]} />
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={[Type.bodyStrong, { color: Colors.text }]} testID="activity-selected">
            {SPORT_LABEL[sport]} selected
          </Text>
          <Text style={[Type.small, { color: Colors.textSecondary }]}>
            Live GPS tracking with pace, distance and your route map is the next update.
          </Text>
        </View>
        <Icon name="map" size={26} color={Colors.textMuted} />
      </Card>

      <SectionHeader title="Activity history" />
      <EmptyState icon="activity" title="Nothing tracked yet" body="Every activity you finish is saved here with its route, pace and stats." />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...Type.title, color: Colors.text, marginTop: Spacing.lg },
  sub: { ...Type.body, color: Colors.textSecondary, marginTop: 4, marginBottom: Spacing.xl },
  sports: { flexDirection: 'row', gap: Spacing.md },
  ready: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginTop: Spacing.lg },
  dot: { width: 12, height: 12, borderRadius: 6 },
});
