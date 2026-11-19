import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { Icon } from '@/components/icons';
import { LevelBar } from '@/components/level-bar';
import { MountainScene } from '@/components/mountain-scene';
import { SPORT_COLOR } from '@/components/sport-button';
import { Card, EmptyState, ListRow, Screen, SectionHeader, StatTile } from '@/components/ui';
import { Colors, Radius, Spacing, Type } from '@/constants/theme';
import { useProfile } from '@/lib/auth-context';
import { formatDistanceKm, formatDuration } from '@/lib/format';
import { SPORT_LABEL, SPORTS } from '@/lib/types';
import { useStats } from '@/lib/use-stats';

const VIS_LABEL = { public: 'Everyone', followers: 'Followers', private: 'Only me' } as const;

export default function ProfileTab() {
  const router = useRouter();
  const { profile } = useProfile();
  const { stats } = useStats(profile.uid);

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
          <View style={styles.followItem}>
            <Text style={styles.followNum}>{profile.followerCount}</Text>
            <Text style={styles.followLabel}>Followers</Text>
          </View>
          <View style={styles.followItem}>
            <Text style={styles.followNum}>{profile.followingCount}</Text>
            <Text style={styles.followLabel}>Following</Text>
          </View>
          <View style={styles.followItem}>
            <Text style={styles.followNum}>{stats.totals.count}</Text>
            <Text style={styles.followLabel}>Activities</Text>
          </View>
        </View>

        <Card style={{ marginTop: Spacing.lg }}>
          <LevelBar xp={profile.xp} />
        </Card>

        <View style={styles.grid}>
          <StatTile label="Total distance" value={formatDistanceKm(stats.totals.distanceM)} unit="km" />
          <StatTile label="This week" value={formatDistanceKm(stats.week.distanceM)} unit="km" accent={Colors.gold} />
        </View>
        <View style={[styles.grid, { marginTop: Spacing.md }]}>
          <StatTile label="This month" value={formatDistanceKm(stats.month.distanceM)} unit="km" accent={Colors.walk} />
          <StatTile label="Moving time" value={formatDuration(stats.totals.movingTimeS)} accent={Colors.ride} />
        </View>

        <SectionHeader title="By sport" />
        <Card style={{ padding: 0 }}>
          {SPORTS.map((s, i) => (
            <View key={s} style={[styles.sportRow, i > 0 && styles.divider]}>
              <Icon name={s} size={24} color={SPORT_COLOR[s]} />
              <Text style={[Type.bodyStrong, { color: Colors.text, flex: 1 }]}>{SPORT_LABEL[s]}</Text>
              <Text style={[Type.small, { color: Colors.textSecondary }]}>{stats.bySport[s].count} activities</Text>
              <Text style={[Type.bodyStrong, { color: Colors.text, minWidth: 72, textAlign: 'right' }]}>
                {formatDistanceKm(stats.bySport[s].distanceM)} km
              </Text>
            </View>
          ))}
        </Card>

        <SectionHeader title="Personal records" />
        <EmptyState icon="trophy" title="No records yet" body="Your fastest 1 km, 5 km and 10 km and your longest ride will be tracked here." />

        <SectionHeader title="Badges" />
        <EmptyState icon="shield" title="No badges yet" body="Complete challenges and hit milestones to unlock badges." />

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
  divider: { borderTopWidth: 1, borderTopColor: Colors.border },
});
