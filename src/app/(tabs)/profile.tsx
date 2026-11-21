import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { connectionCounts } from '@/lib/social-service';
import { useSocial } from '@/lib/use-social';

import { Avatar } from '@/components/avatar';
import { Icon } from '@/components/icons';
import { LevelBar } from '@/components/level-bar';
import { MountainScene } from '@/components/mountain-scene';
import { SPORT_COLOR } from '@/components/sport-button';
import { Button, Card, EmptyState, ListRow, Screen, SectionHeader, StatTile } from '@/components/ui';
import { Colors, Radius, Spacing, Type } from '@/constants/theme';
import { useProfile } from '@/lib/auth-context';
import { formatDistanceKm, formatDuration } from '@/lib/format';
import { SPORT_LABEL, SPORTS } from '@/lib/types';
import { useMyActivities } from '@/lib/use-stats';
import { BadgeStrip } from '@/components/badge-strip';
import { RecordsList } from '@/components/records-list';
import { DistanceBars } from '@/components/week-bars';

const VIS_LABEL = { public: 'Everyone', followers: 'Followers', private: 'Only me' } as const;

export default function ProfileTab() {
  const router = useRouter();
  const { profile } = useProfile();
  const { stats, progress } = useMyActivities();
  const { following, requests } = useSocial();
  const [counts, setCounts] = useState<{ followers: number; following: number } | null>(null);
  const followingKey = following.join(',');
  useFocusEffect(
    useCallback(() => {
      connectionCounts(profile.uid).then(setCounts).catch(() => undefined);
    }, [profile.uid, followingKey, requests.length]),
  );

  return (
    <Screen padded={false}>
      <View style={styles.cover}>
        <MountainScene height={170} />
      </View>
      <View style={styles.body}>
        <View style={styles.idRow}>
          <Avatar uri={profile.photoURL} name={profile.displayName} size={96} ring />
        </View>
        <Text style={styles.name} testID="profile-name">
          {profile.displayName}
        </Text>
        <Text style={styles.username}>@{profile.username}</Text>
        {profile.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}

        <View style={styles.follows}>
          <Pressable style={styles.followItem} testID="profile-followers" accessibilityRole="button" onPress={() => router.push({ pathname: '/connections', params: { uid: profile.uid, kind: 'followers' } })}>
            <Text style={styles.followNum}>{counts ? counts.followers : '–'}</Text>
            <Text style={styles.followLabel}>Followers</Text>
          </Pressable>
          <Pressable style={styles.followItem} testID="profile-following" accessibilityRole="button" onPress={() => router.push({ pathname: '/connections', params: { uid: profile.uid, kind: 'following' } })}>
            <Text style={styles.followNum}>{counts ? counts.following : '–'}</Text>
            <Text style={styles.followLabel}>Following</Text>
          </Pressable>
          <View style={styles.followItem}>
            <Text style={styles.followNum}>{stats.totals.count}</Text>
            <Text style={styles.followLabel}>Activities</Text>
          </View>
        </View>

        {requests.length > 0 ? (
          <Pressable testID="profile-requests" accessibilityRole="button" onPress={() => router.push('/requests')} style={styles.requests}>
            <Icon name="user-plus" size={20} color={Colors.gold} />
            <Text style={[Type.bodyStrong, { color: Colors.text, flex: 1 }]}>
              {requests.length} follow {requests.length === 1 ? 'request' : 'requests'}
            </Text>
            <Icon name="chevron-right" size={18} color={Colors.textMuted} />
          </Pressable>
        ) : null}

        <Card style={{ marginTop: Spacing.lg }}>
          <LevelBar xp={progress.xp} />
        </Card>

        <View style={styles.grid}>
          <StatTile label="Total distance" value={formatDistanceKm(stats.totals.distanceM)} unit="km" />
          <StatTile label="This week" value={formatDistanceKm(stats.week.distanceM)} unit="km" accent={Colors.gold} />
        </View>
        <View style={[styles.grid, { marginTop: Spacing.md }]}>
          <StatTile label="This month" value={formatDistanceKm(stats.month.distanceM)} unit="km" accent={Colors.walk} />
          <StatTile label="Moving time" value={formatDuration(stats.totals.movingTimeS)} accent={Colors.ride} />
        </View>

        <SectionHeader title="Weekly distance" />
        <Card>
          <DistanceBars testID="profile-weeks-chart" height={110} bars={progress.last8Weeks.map((w, i) => ({ key: w.key, label: w.label, distanceM: w.distanceM, highlight: i === progress.last8Weeks.length - 1 }))} />
        </Card>

        <SectionHeader title="By sport" />
        <Card style={{ padding: 0 }}>
          {SPORTS.map((s, i) => (
            <View key={s} style={[styles.sportRow, i > 0 && styles.divider]}>
              <Icon name={s} size={24} color={SPORT_COLOR[s]} />
              <Text style={[Type.bodyStrong, { color: Colors.text, flex: 1 }]}>{SPORT_LABEL[s]}</Text>
              <Text style={[Type.small, { color: Colors.textSecondary }]}>
                {stats.bySport[s].count} · {formatDuration(stats.bySport[s].movingTimeS)}
              </Text>
              <Text style={[Type.bodyStrong, { color: Colors.text, minWidth: 72, textAlign: 'right' }]}>
                {formatDistanceKm(stats.bySport[s].distanceM)} km
              </Text>
            </View>
          ))}
        </Card>

        <SectionHeader title="Personal records" />
        {progress.records.length ? (
          <RecordsList records={progress.records} />
        ) : (
          <EmptyState icon="trophy" title="No records yet" body="Your fastest 1 km, 5 km and 10 km and your longest walk, run and ride will be tracked here." />
        )}

        <SectionHeader
          title="Badges"
          action={<Button testID="profile-badges" title={`See all ${progress.earned.length}/${progress.badges.length}`} variant="ghost" onPress={() => router.push('/badges')} style={{ minHeight: 32, paddingHorizontal: 0 }} />}
        />
        {progress.earned.length ? (
          <Card>
            <BadgeStrip testID="profile-badge-strip" badges={progress.earned} />
          </Card>
        ) : (
          <EmptyState icon="shield" title="No badges yet" body="Save your first activity to earn First Steps. Distance, streak and climbing badges follow.">
            <Button title="View all badges" variant="secondary" onPress={() => router.push('/badges')} style={{ marginTop: Spacing.sm }} />
          </EmptyState>
        )}

        <SectionHeader title="Settings" />
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <ListRow testID="profile-edit" icon="profile" label="Edit profile" onPress={() => router.push('/settings/edit-profile')} />
          <View style={styles.divider} />
          <ListRow
            testID="profile-privacy"
            icon="lock"
            label="Privacy"
            value={VIS_LABEL[profile.privacy.profileVisibility]}
            onPress={() => router.push('/settings/privacy')}
          />
          <View style={styles.divider} />
          <ListRow testID="profile-notifications" icon="bell" label="Notifications" onPress={() => router.push('/settings/notifications')} />
          <View style={styles.divider} />
          <ListRow testID="profile-account" icon="settings" label="Account" onPress={() => router.push('/settings/account')} />
        </Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  cover: { height: 170, overflow: 'hidden' },
  body: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl, marginTop: -60 },
  idRow: { flexDirection: 'row', alignItems: 'flex-end' },
  name: { ...Type.title, color: Colors.text, marginTop: Spacing.md },
  username: { ...Type.body, color: Colors.primary },
  bio: { ...Type.body, color: Colors.textSecondary, marginTop: Spacing.sm },
  follows: {
    flexDirection: 'row',
    marginTop: Spacing.lg,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: Spacing.md,
  },
  followItem: { flex: 1, alignItems: 'center', gap: 2 },
  followNum: { ...Type.heading, color: Colors.text },
  followLabel: { ...Type.small, color: Colors.textSecondary },
  grid: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.lg },
  sportRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.lg },
  requests: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: Colors.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.gold, padding: Spacing.lg, marginTop: Spacing.md },
  divider: { borderTopWidth: 1, borderTopColor: Colors.border },
});
