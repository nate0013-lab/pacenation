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
import { BadgeStrip } from '@/components/badge-strip';
import { DistanceBars } from '@/components/week-bars';

export default function Home() {
  const router = useRouter();
  const { profile } = useProfile();
  const { stats, activities, progress } = useMyActivities();
  const nextBadges = progress.badges.filter((b) => b.earnedAt === null).sort((a, b) => b.ratio - a.ratio).slice(0, 4);
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

      <Card style={{ marginTop: Spacing.lg }}>
        <View style={styles.cardHead}>
          <Text style={[Type.bodyStrong, { color: Colors.text }]}>Last 7 days</Text>
          <Text style={[Type.small, { color: Colors.textSecondary }]} testID="home-streak">
            {progress.currentStreak > 0 ? `${progress.currentStreak}-day streak` : 'Start a streak today'}
          </Text>
        </View>
        <DistanceBars testID="home-week-chart" bars={progress.last7Days.map((d) => ({ key: d.key, label: d.label, distanceM: d.distanceM, highlight: d.isToday }))} />
      </Card>

      <View style={styles.grid}>
        <StatTile label="This month" value={formatDistanceKm(stats.month.distanceM)} unit="km" accent={Colors.walk} />
        <StatTile label="All time" value={formatDistanceKm(stats.totals.distanceM)} unit="km" accent={Colors.gold} />
      </View>
      <View style={[styles.grid, { marginTop: Spacing.md }]}>
        <StatTile label="Activities" value={String(stats.totals.count)} accent={Colors.primary} />
        <StatTile label="Best streak" value={String(progress.bestStreak)} unit={progress.bestStreak === 1 ? 'day' : 'days'} accent={Colors.ride} />
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

      <SectionHeader
        title="Achievements"
        action={<Button testID="home-badges" title="All badges" variant="ghost" onPress={() => router.push('/badges')} style={{ minHeight: 32, paddingHorizontal: 0 }} />}
      />
      <Card style={{ gap: Spacing.lg }}>
        <LevelBar xp={progress.xp} />
        {progress.earned.length > 0 ? (
          <View style={{ gap: Spacing.sm }}>
            <Text style={[Type.caption, { color: Colors.textSecondary }]}>LATEST BADGES</Text>
            <BadgeStrip testID="home-latest-badges" badges={progress.earned.slice(0, 6)} />
          </View>
        ) : null}
        {nextBadges.length > 0 ? (
          <View style={{ gap: Spacing.sm }}>
            <Text style={[Type.caption, { color: Colors.textSecondary }]}>UP NEXT</Text>
            <BadgeStrip testID="home-next-badges" badges={nextBadges} />
          </View>
        ) : null}
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
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: Spacing.md },
});
