import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { Icon } from '@/components/icons';
import { ScreenHeader } from '@/components/screen-header';
import { SPORT_COLOR } from '@/components/sport-button';
import { Banner, Button, Card, EmptyState, Screen, Segmented } from '@/components/ui';
import { Colors, Radius, Spacing, Type } from '@/constants/theme';
import { useProfile } from '@/lib/auth-context';
import { formatDistanceKm } from '@/lib/format';
import { boardId, boardRank, myBoardRows, watchBoard, type BoardEntry, type BoardPeriod, type BoardSport } from '@/lib/leaderboards-service';
import { SPORT_LABEL } from '@/lib/types';
import { useMyActivities } from '@/lib/use-stats';

const SPORT_OPTIONS: { value: BoardSport; label: string }[] = [
  { value: 'any', label: 'All' },
  { value: 'walk', label: SPORT_LABEL.walk },
  { value: 'run', label: SPORT_LABEL.run },
  { value: 'ride', label: SPORT_LABEL.ride },
];

export default function LeaderboardsScreen() {
  const router = useRouter();
  const { profile } = useProfile();
  const { activities } = useMyActivities();
  const [period, setPeriod] = useState<BoardPeriod>('week');
  const [sport, setSport] = useState<BoardSport>('any');
  const [rows, setRows] = useState<BoardEntry[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [rank, setRank] = useState<{ rank: number; total: number } | null>(null);
  const board = boardId(period, sport);
  const mine = useMemo(() => myBoardRows(activities.filter((a) => a.visibility !== 'private')).find((r) => r.board === board), [activities, board]);
  const show = profile.privacy.showOnLeaderboards;

  useEffect(() => {
    setRows(null);
    setFailed(false);
    return watchBoard(board, setRows, () => {
      setFailed(true);
      setRows([]);
    });
  }, [board]);

  const rowsKey = rows?.map((r) => `${r.uid}:${r.distanceM}`).join(',') ?? '';
  useEffect(() => {
    setRank(null);
    if (show && mine && mine.distanceM > 0) boardRank(board, mine.distanceM).then(setRank).catch(() => undefined);
  }, [board, mine?.distanceM, show, rowsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const accent = sport === 'any' ? Colors.primary : SPORT_COLOR[sport];
  return (
    <Screen header={<ScreenHeader title="Leaderboards" fallback="/" />}>
      <Segmented
        options={[
          { value: 'week', label: 'This week' },
          { value: 'month', label: 'This month' },
          { value: 'all', label: 'All time' },
        ]}
        value={period}
        onChange={setPeriod}
      />
      <View style={styles.chips}>
        {SPORT_OPTIONS.map((o) => {
          const on = o.value === sport;
          const c = o.value === 'any' ? Colors.primary : SPORT_COLOR[o.value];
          return (
            <Pressable
              key={o.value}
              testID={`board-sport-${o.value}`}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              onPress={() => setSport(o.value)}
              style={[styles.chip, { borderColor: on ? c : Colors.border, backgroundColor: on ? Colors.surfaceRaised : 'transparent' }]}>
              {o.value !== 'any' ? <Icon name={o.value} size={16} color={on ? c : Colors.textSecondary} /> : null}
              <Text style={[Type.small, { color: on ? Colors.text : Colors.textSecondary, fontWeight: '700' }]}>{o.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {show ? (
        <Card style={styles.me}>
          <Avatar uri={profile.photoURL} name={profile.displayName} size={44} />
          <View style={{ flex: 1 }}>
            <Text style={[Type.caption, { color: Colors.textSecondary }]}>YOUR POSITION</Text>
            <Text style={[Type.heading, { color: Colors.text }]} testID="board-my-rank">
              {mine && mine.distanceM > 0 ? (rank ? `#${rank.rank} of ${rank.total}` : '…') : 'Not ranked yet'}
            </Text>
          </View>
          <Text style={[Type.heading, { color: accent }]}>{formatDistanceKm(mine?.distanceM ?? 0)} km</Text>
        </Card>
      ) : (
        <View style={{ marginTop: Spacing.lg, gap: Spacing.sm }}>
          <Banner kind="info" text="You have chosen not to appear on leaderboards. You can still see them." />
          <Button title="Change in privacy settings" variant="ghost" onPress={() => router.push('/settings/privacy')} />
        </View>
      )}

      {failed ? <Banner kind="error" text="Leaderboards could not be loaded. Check your connection." /> : null}
      {rows === null ? (
        <ActivityIndicator color={Colors.primary} style={{ marginTop: Spacing.xl }} />
      ) : rows.length === 0 ? (
        <View style={{ marginTop: Spacing.lg }}>
          <EmptyState icon="trophy" title="Nobody on this board yet" body="Save an activity to put your name at the top." />
        </View>
      ) : (
        <Card style={{ padding: 0, overflow: 'hidden', marginTop: Spacing.lg }}>
          {rows.map((r, i) => {
            const me = r.uid === profile.uid;
            return (
              <Pressable
                key={r.uid}
                testID={`board-row-${r.username}`}
                accessibilityRole="button"
                onPress={() => (me ? router.navigate('/profile') : router.push({ pathname: '/user/[uid]', params: { uid: r.uid } }))}
                style={[styles.row, i > 0 && styles.divider, me && { backgroundColor: Colors.surfaceRaised }]}>
                <View style={[styles.medal, i < 3 && { backgroundColor: [Colors.gold, '#C9D4E3', '#D9925B'][i] }]}>
                  <Text style={[styles.rank, i < 3 && { color: Colors.bg }]}>{i + 1}</Text>
                </View>
                <Avatar uri={null} name={r.displayName} size={36} />
                <View style={{ flex: 1 }}>
                  <Text style={[Type.bodyStrong, { color: Colors.text }]} numberOfLines={1}>
                    {me ? 'You' : r.displayName}
                  </Text>
                  <Text style={[Type.small, { color: Colors.textSecondary }]}>
                    Level {r.level} · {r.count} {r.count === 1 ? 'activity' : 'activities'}
                  </Text>
                </View>
                <Text style={[Type.bodyStrong, { color: Colors.text }]}>{formatDistanceKm(r.distanceM)} km</Text>
              </Pressable>
            );
          })}
        </Card>
      )}
      <Text style={[Type.small, { color: Colors.textMuted, marginTop: Spacing.md }]}>
        Weeks run Monday to Sunday. &quot;Only me&quot; activities are not counted. Turn leaderboards off any time in privacy settings.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md, flexWrap: 'wrap' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: Radius.pill, paddingHorizontal: Spacing.md, paddingVertical: 8 },
  me: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginTop: Spacing.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  divider: { borderTopWidth: 1, borderTopColor: Colors.border },
  medal: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  rank: { ...Type.bodyStrong, color: Colors.textSecondary },
});
