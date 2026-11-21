import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { Icon } from '@/components/icons';
import { FeedCard, FollowButton, PersonRow } from '@/components/social';
import { Banner, Button, Card, EmptyState, Screen, Segmented } from '@/components/ui';
import { Colors, Radius, Spacing, Type } from '@/constants/theme';
import { useProfile } from '@/lib/auth-context';
import { formatDistanceKm, isoWeekKey } from '@/lib/format';
import { loadFeed, newestMembers, weeklyRanking, type FeedItem, type RankRow } from '@/lib/social-service';
import type { UserProfile } from '@/lib/types';
import { useSocial } from '@/lib/use-social';
import { searchUsers } from '@/lib/users-service';

type Tab = 'feed' | 'ranking' | 'discover';

export default function CommunityTab() {
  const router = useRouter();
  const { profile } = useProfile();
  const { following, requests, loaded } = useSocial();
  const [term, setTerm] = useState('');
  const [results, setResults] = useState<UserProfile[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('feed');
  const [feed, setFeed] = useState<FeedItem[] | null>(null);
  const [ranking, setRanking] = useState<RankRow[] | null>(null);
  const [members, setMembers] = useState<UserProfile[] | null>(null);
  const followingKey = following.slice().sort().join(',');

  useEffect(() => {
    const q = term.trim();
    if (q.replace(/^@/, '').length < 2) {
      setResults(null);
      setError(null);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const t = setTimeout(() => {
      searchUsers(q)
        .then((r) => !cancelled && (setResults(r), setError(null)))
        .catch(() => !cancelled && setError('Search is unavailable. Check your connection.'))
        .finally(() => !cancelled && setSearching(false));
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [term]);

  const refresh = useCallback(() => {
    if (!loaded) return;
    const list = followingKey ? followingKey.split(',') : [];
    if (tab === 'feed') loadFeed(profile.uid, list).then(setFeed).catch(() => setFeed([]));
    if (tab === 'ranking') weeklyRanking(profile.uid, list, isoWeekKey(new Date())).then(setRanking).catch(() => setRanking([]));
    if (tab === 'discover') newestMembers(20).then(setMembers).catch(() => setMembers([]));
  }, [tab, profile.uid, followingKey, loaded]);

  useFocusEffect(refresh);

  const discover = (members ?? []).filter((m) => m.uid !== profile.uid && !following.includes(m.uid));

  return (
    <Screen>
      <Text style={styles.title}>Community</Text>
      <Text style={styles.sub}>Follow other athletes, cheer them on and see how your week stacks up.</Text>

      <View style={styles.search}>
        <Icon name="search" size={20} color={Colors.textMuted} />
        <TextInput
          testID="community-search"
          value={term}
          onChangeText={setTerm}
          placeholder="Search by username"
          placeholderTextColor={Colors.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.searchInput}
          accessibilityLabel="Search by username"
        />
        {searching ? <ActivityIndicator color={Colors.primary} /> : null}
      </View>
      {error ? <Banner kind="error" text={error} /> : null}

      {results ? (
        results.length === 0 ? (
          <EmptyState icon="community" title="No one found" body={`No usernames start with "${term.trim().replace(/^@/, '')}".`} />
        ) : (
          <Card style={{ padding: 0, overflow: 'hidden', marginTop: Spacing.md }}>
            {results.map((u, i) => (
              <View key={u.uid} style={i > 0 ? styles.divider : undefined} testID={`search-result-${u.usernameLower}`}>
                <PersonRow user={u} me={profile.uid} right={u.uid !== profile.uid ? <FollowButton me={profile.uid} target={u} compact /> : undefined} />
              </View>
            ))}
          </Card>
        )
      ) : (
        <>
          {requests.length > 0 ? (
            <Pressable testID="community-requests" accessibilityRole="button" onPress={() => router.push('/requests')} style={styles.requests}>
              <Icon name="user-plus" size={22} color={Colors.gold} />
              <Text style={[Type.bodyStrong, { color: Colors.text, flex: 1 }]}>
                {requests.length} follow {requests.length === 1 ? 'request' : 'requests'}
              </Text>
              <Icon name="chevron-right" size={18} color={Colors.textMuted} />
            </Pressable>
          ) : null}

          <View style={{ marginTop: Spacing.md, marginBottom: Spacing.lg }}>
            <Segmented
              options={[
                { value: 'feed', label: 'Feed' },
                { value: 'ranking', label: 'This week' },
                { value: 'discover', label: 'Discover' },
              ]}
              value={tab}
              onChange={setTab}
            />
          </View>

          {tab === 'feed' ? (
            feed === null ? (
              <ActivityIndicator color={Colors.primary} />
            ) : feed.length === 0 ? (
              <EmptyState icon="activity" title="Your feed is quiet" body="Follow people to see their walks, runs and rides here, alongside your own.">
                <Button title="Discover people" variant="secondary" onPress={() => setTab('discover')} style={{ marginTop: Spacing.sm }} />
              </EmptyState>
            ) : (
              <View style={{ gap: Spacing.md }}>
                {feed.map((item) => (
                  <FeedCard key={item.activity.id} item={item} me={profile.uid} />
                ))}
                <Button title="Refresh" variant="ghost" onPress={refresh} />
              </View>
            )
          ) : null}

          {tab === 'ranking' ? (
            ranking === null ? (
              <ActivityIndicator color={Colors.primary} />
            ) : (
              <>
                <Text style={[Type.small, { color: Colors.textSecondary, marginBottom: Spacing.md }]}>Distance this week (Monday to Sunday) for you and the people you follow.</Text>
                <Card style={{ padding: 0, overflow: 'hidden' }}>
                  {ranking.map((r, i) => (
                    <Pressable
                      key={r.user.uid}
                      testID={`rank-${r.user.usernameLower}`}
                      accessibilityRole="button"
                      onPress={() => (r.user.uid === profile.uid ? router.navigate('/profile') : router.push({ pathname: '/user/[uid]', params: { uid: r.user.uid } }))}
                      style={[styles.rankRow, i > 0 && styles.divider, r.user.uid === profile.uid && { backgroundColor: Colors.surfaceRaised }]}>
                      <Text style={[styles.rankNum, i === 0 && { color: Colors.gold }]}>{i + 1}</Text>
                      <Avatar uri={r.user.photoURL} name={r.user.displayName} size={36} />
                      <View style={{ flex: 1 }}>
                        <Text style={[Type.bodyStrong, { color: Colors.text }]} numberOfLines={1}>
                          {r.user.uid === profile.uid ? 'You' : r.user.displayName}
                        </Text>
                        <Text style={[Type.small, { color: Colors.textSecondary }]}>
                          {r.count} {r.count === 1 ? 'activity' : 'activities'}
                        </Text>
                      </View>
                      <Text style={[Type.bodyStrong, { color: Colors.text }]}>{formatDistanceKm(r.distanceM)} km</Text>
                    </Pressable>
                  ))}
                </Card>
                <Button testID="community-leaderboards" title="See global leaderboards" variant="ghost" icon="trophy" onPress={() => router.push('/leaderboards')} style={{ marginTop: Spacing.sm }} />
                {ranking.length <= 1 ? (
                  <Text style={[Type.small, { color: Colors.textSecondary, marginTop: Spacing.md, textAlign: 'center' }]}>Follow people to compare your week with theirs.</Text>
                ) : null}
              </>
            )
          ) : null}

          {tab === 'discover' ? (
            members === null ? (
              <ActivityIndicator color={Colors.primary} />
            ) : discover.length === 0 ? (
              <EmptyState icon="community" title="You are following everyone new" body="Search by username to find more people." />
            ) : (
              <>
                <Text style={[Type.small, { color: Colors.textSecondary, marginBottom: Spacing.md }]}>New on PaceNation</Text>
                <Card style={{ padding: 0, overflow: 'hidden' }}>
                  {discover.map((u, i) => (
                    <View key={u.uid} style={i > 0 ? styles.divider : undefined}>
                      <PersonRow user={u} me={profile.uid} right={<FollowButton me={profile.uid} target={u} compact />} />
                    </View>
                  ))}
                </Card>
              </>
            )
          ) : null}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...Type.title, color: Colors.text, marginTop: Spacing.lg },
  sub: { ...Type.body, color: Colors.textSecondary, marginTop: 4, marginBottom: Spacing.xl },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.borderStrong,
    paddingHorizontal: Spacing.lg,
    minHeight: 50,
    marginBottom: Spacing.sm,
  },
  searchInput: { flex: 1, color: Colors.text, fontSize: 16, paddingVertical: 12, outlineWidth: 0 },
  divider: { borderTopWidth: 1, borderTopColor: Colors.border },
  requests: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: Colors.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.gold, padding: Spacing.lg, marginTop: Spacing.sm },
  rankRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  rankNum: { ...Type.heading, color: Colors.textSecondary, width: 24, textAlign: 'center' },
});
