import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Avatar } from '@/components/avatar';
import { LevelBar } from '@/components/level-bar';
import { LogoMark } from '@/components/logo';
import { MountainScene } from '@/components/mountain-scene';
import { SportButton } from '@/components/sport-button';
import { Button, Card, EmptyState, Screen, SectionHeader, StatTile } from '@/components/ui';
import { Colors, Radius, Spacing, Type } from '@/constants/theme';
import { useProfile } from '@/lib/auth-context';
import { formatDistanceKm, greeting } from '@/lib/format';
import { SPORTS } from '@/lib/types';
import { useMyActivities } from '@/lib/use-stats';
import { ActivityRow } from '@/components/activity-row';

export default function Home() {
  const router = useRouter();
  const { profile } = useProfile();
  const { stats, activities } = useMyActivities(profile.uid);
  const firstName = profile.displayName.split(' ')[0];

  return (
    <Screen>
      <View style={styles.header}>
        <LogoMark size={36} />
        <View style={{ flex: 1 }}>
          <Text style={styles.greet}>{greeting()},</Text>
          <Text style={styles.name} numberOfLines={1} testID="home-welcome">
            {firstName}
          </Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Open your profile" onPress={() => router.navigate('/profile')}>
          <Avatar uri={profile.photoURL} name={profile.displayName} size={44} />
        </Pressable>
      </View>

      <Animated.View entering={FadeInDown.duration(450)} style={styles.hero}>
        <MountainScene height={190} style={styles.heroScene} />
        <View style={styles.heroBody}>
          <Text style={styles.heroLabel}>THIS WEEK</Text>
          <Text style={styles.heroValue} testID="home-week-distance">
            {formatDistanceKm(stats.week.distanceM)}
            <Text style={styles.heroUnit}> km</Text>
          </Text>
          <Text style={styles.heroSub}>
            {stats.week.count} {stats.week.count === 1 ? 'activity' : 'activities'} · Where every kilometre matters
          </Text>
        </View>
      </Animated.View>

      <View style={styles.grid}>
        <StatTile label="This month" value={formatDistanceKm(stats.month.distanceM)} unit="km" accent={Colors.walk} />
        <StatTile label="All time" value={formatDistanceKm(stats.totals.distanceM)} unit="km" accent={Colors.gold} />
      </View>
      <View style={[styles.grid, { marginTop: Spacing.md }]}>
        <StatTile label="Activities" value={String(stats.totals.count)} accent={Colors.primary} />
        <StatTile label="Level" value={String(profile.level)} unit={`${profile.xp} XP`} accent={Colors.ride} />
      </View>

      <SectionHeader title="Quick start" />
      <View style={styles.sports}>
        {SPORTS.map((s) => (
          <SportButton key={s} sport={s} testID={`quick-${s}`} onPress={() => router.push({ pathname: '/track', params: { sport: s } })} />
        ))}
      </View>

      <SectionHeader
        title="Recent activities"
        action={activities.length > 3 ? <Button title="See all" variant="ghost" onPress={() => router.navigate('/activity')} style={{ minHeight: 32, paddingHorizontal: 0 }} /> : undefined}
      />
      {activities.length === 0 ? (
        <EmptyState icon="map" title="No activities yet" body="Your walks, runs and rides will show here with their routes once you track them." />
      ) : (
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          {activities.slice(0, 3).map((a, i) => (
            <View key={a.id} style={i > 0 ? { borderTopWidth: 1, borderTopColor: Colors.border } : undefined}>
              <ActivityRow a={a} />
            </View>
          ))}
        </Card>
      )}

      <SectionHeader title="Current challenges" />
      <EmptyState icon="challenges" title="You have not joined a challenge" body="Weekly and monthly challenges keep you moving and earn badges.">
        <Button title="Browse challenges" variant="secondary" onPress={() => router.navigate('/challenges')} style={{ marginTop: Spacing.sm }} />
      </EmptyState>

      <SectionHeader title="Achievements" />
      <Card>
        <LevelBar xp={profile.xp} />
        <Text style={[Type.small, { color: Colors.textSecondary, marginTop: Spacing.md }]}>
          Earn XP for every kilometre. Badges you unlock appear on your profile.
        </Text>
      </Card>

      <SectionHeader title="Community" />
      <EmptyState icon="community" title="Your feed is quiet" body="Follow other athletes to see their activities here.">
        <Button title="Find people" variant="secondary" onPress={() => router.navigate('/community')} style={{ marginTop: Spacing.sm }} />
      </EmptyState>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingTop: Spacing.md, paddingBottom: Spacing.lg },
  greet: { ...Type.small, color: Colors.textSecondary },
  name: { ...Type.heading, color: Colors.text },
  hero: { borderRadius: Radius.xl, overflow: 'hidden', backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, minHeight: 190 },
  heroScene: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  heroBody: { padding: Spacing.xl, gap: 4 },
  heroLabel: { ...Type.caption, color: Colors.gold },
  heroValue: { fontSize: 56, lineHeight: 62, fontWeight: '900', color: Colors.text, letterSpacing: -1.5 },
  heroUnit: { fontSize: 22, fontWeight: '700', color: Colors.textSecondary, letterSpacing: 0 },
  heroSub: { ...Type.small, color: Colors.textSecondary },
  grid: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.lg },
  sports: { flexDirection: 'row', gap: Spacing.md },
});
