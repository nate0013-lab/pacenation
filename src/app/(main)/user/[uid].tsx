import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { ActivityRow } from '@/components/activity-row';
import { Avatar } from '@/components/avatar';
import { BadgeStrip } from '@/components/badge-strip';
import { LevelBar } from '@/components/level-bar';
import { MountainScene } from '@/components/mountain-scene';
import { RecordsList } from '@/components/records-list';
import { ScreenHeader } from '@/components/screen-header';
import { FollowButton } from '@/components/social';
import { Card, EmptyState, Screen, SectionHeader, StatTile } from '@/components/ui';
import { Colors, Radius, Spacing, Type } from '@/constants/theme';
import { useProfile } from '@/lib/auth-context';
import { formatDistanceKm, isoWeekKey } from '@/lib/format';
import type { StatsSummary } from '@/lib/progress/sync';
import { badgesFromSummary, recordsFromSummary } from '@/lib/progress/summary';
import { connectionCounts, getFollowState, getStatsSummary, listActivitiesOf, watchUserCard, type FollowState } from '@/lib/social-service';
import type { Activity, UserProfile } from '@/lib/types';

export default function UserProfileScreen() {
  const { uid } = useLocalSearchParams<{ uid: string }>();
  const router = useRouter();
  const { profile: me } = useProfile();
  const [user, setUser] = useState<UserProfile | null | undefined>(undefined);
  const [rel, setRel] = useState<FollowState | null>(null);
  const [counts, setCounts] = useState<{ followers: number; following: number } | null>(null);
  const [summary, setSummary] = useState<StatsSummary | null>(null);
  const [acts, setActs] = useState<Activity[] | null>(null);

  useEffect(() => (uid ? watchUserCard(uid, setUser) : undefined), [uid]);

  const canSee = !!user && (user.privacy.profileVisibility === 'public' || (user.privacy.profileVisibility === 'followers' && rel === 'following'));

  const load = useCallback(async () => {
    if (!uid || !user) return;
    const state = await getFollowState(me.uid, uid).catch(() => 'none' as FollowState);
    setRel(state);
    connectionCounts(uid).then(setCounts).catch(() => setCounts(null));
    const visible = user.privacy.profileVisibility === 'public' || (user.privacy.profileVisibility === 'followers' && state === 'following');
    if (!visible) {
      setSummary(null);
      setActs([]);
      return;
    }
    getStatsSummary(uid).then(setSummary);
    listActivitiesOf(me.uid, uid, state === 'following', 50)
      .then(setActs)
      .catch(() => setActs([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, user?.privacy.profileVisibility, me.uid]);

  useEffect(() => {
    load();
  }, [load]);

  if (uid === me.uid) return <Redirect href="/profile" />;
  if (user === undefined) {
    return (
      <Screen header={<ScreenHeader title="Profile" />}>
        <ActivityIndicator color={Colors.primary} style={{ marginTop: Spacing.xxl }} />
      </Screen>
    );
  }
  if (user === null) {
    return (
      <Screen header={<ScreenHeader title="Profile" />}>
        <EmptyState icon="profile" title="Profile not found" body="This account may have been deleted." />
      </Screen>
    );
  }

  const week = summary && summary.week?.key === isoWeekKey(new Date()) ? summary.week : { distanceM: 0, count: 0 };
  const badges = badgesFromSummary(summary?.badges);
  const records = recordsFromSummary(summary?.records);

  return (
    <Screen padded={false} header={<ScreenHeader title={`@${user.username}`} />}>
      <View style={styles.cover}>
        <MountainScene height={130} />
      </View>
      <View style={styles.body}>
        <View style={styles.idRow}>
          <Avatar uri={user.photoURL} name={user.displayName} size={88} ring />
          <View style={{ flex: 1 }} />
          {rel !== null ? <FollowButton me={me.uid} target={user} onChange={() => load()} /> : null}
        </View>
        <Text style={styles.name} testID="user-name">
          {user.displayName}
        </Text>
        <Text style={styles.username}>@{user.username}</Text>
        {user.bio ? <Text style={styles.bio}>{user.bio}</Text> : null}

        <View style={styles.follows}>
          <Pressable style={styles.followItem} testID="user-followers" accessibilityRole="button" onPress={() => router.push({ pathname: '/connections', params: { uid: user.uid, kind: 'followers' } })}>
            <Text style={styles.followNum}>{counts ? counts.followers : '–'}</Text>
            <Text style={styles.followLabel}>Followers</Text>
          </Pressable>
          <Pressable style={styles.followItem} testID="user-following" accessibilityRole="button" onPress={() => router.push({ pathname: '/connections', params: { uid: user.uid, kind: 'following' } })}>
            <Text style={styles.followNum}>{counts ? counts.following : '–'}</Text>
            <Text style={styles.followLabel}>Following</Text>
          </Pressable>
          <View style={styles.followItem}>
            <Text style={styles.followNum}>{canSee && summary ? summary.totals.count : '–'}</Text>
            <Text style={styles.followLabel}>Activities</Text>
          </View>
        </View>

        <Card style={{ marginTop: Spacing.lg }}>
          <LevelBar xp={user.xp} />
        </Card>

        {!canSee ? (
          <View style={{ marginTop: Spacing.lg }}>
            <EmptyState
              icon="lock"
              title={user.privacy.profileVisibility === 'private' ? 'This profile is private' : 'Followers only'}
              body={
                user.privacy.profileVisibility === 'private'
                  ? `${user.displayName.split(' ')[0]} keeps their stats and activities to themselves.`
                  : rel === 'requested'
                    ? 'Your follow request is waiting for approval.'
                    : `Follow ${user.displayName.split(' ')[0]} to see their stats, badges and activities once they approve.`
              }
            />
          </View>
        ) : (
          <>
            <View style={styles.grid}>
              <StatTile label="This week" value={formatDistanceKm(week.distanceM)} unit="km" accent={Colors.gold} />
              <StatTile label="All time" value={formatDistanceKm(summary?.totals.distanceM ?? 0)} unit="km" />
            </View>
            <View style={[styles.grid, { marginTop: Spacing.md }]}>
              <StatTile label="Best streak" value={String(summary?.bestStreak ?? 0)} unit="days" accent={Colors.ride} />
              <StatTile label="Badges" value={String(badges.length)} accent={Colors.walk} />
            </View>

            {badges.length ? (
              <>
                <SectionHeader title="Badges" />
                <Card>
                  <BadgeStrip badges={badges} interactive={false} testID="user-badges" />
                </Card>
              </>
            ) : null}

            {records.length ? (
              <>
                <SectionHeader title="Personal records" />
                <RecordsList records={records} />
              </>
            ) : null}

            <SectionHeader title="Activities" />
            {acts === null ? (
              <ActivityIndicator color={Colors.primary} />
            ) : acts.length === 0 ? (
              <EmptyState icon="map" title="No activities to show" body="Activities they share with you will appear here." />
            ) : (
              <Card style={{ padding: 0, overflow: 'hidden' }}>
                {acts.slice(0, 20).map((a, i) => (
                  <View key={a.id} style={i > 0 ? { borderTopWidth: 1, borderTopColor: Colors.border } : undefined}>
                    <ActivityRow a={a} />
                  </View>
                ))}
              </Card>
            )}
          </>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  cover: { height: 130, overflow: 'hidden' },
  body: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl, marginTop: -48 },
  idRow: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.md },
  name: { ...Type.title, color: Colors.text, marginTop: Spacing.md },
  username: { ...Type.body, color: Colors.primary },
  bio: { ...Type.body, color: Colors.textSecondary, marginTop: Spacing.sm },
  follows: { flexDirection: 'row', marginTop: Spacing.lg, backgroundColor: Colors.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, paddingVertical: Spacing.md },
  followItem: { flex: 1, alignItems: 'center', gap: 2 },
  followNum: { ...Type.heading, color: Colors.text },
  followLabel: { ...Type.small, color: Colors.textSecondary },
  grid: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.lg },
});
