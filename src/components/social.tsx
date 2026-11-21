import { useRouter } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { formatActivityDate, RouteThumb } from '@/components/activity-row';
import { Avatar } from '@/components/avatar';
import { Icon } from '@/components/icons';
import { SPORT_COLOR } from '@/components/sport-button';
import { Button } from '@/components/ui';
import { Colors, Radius, Spacing, Type } from '@/constants/theme';
import { formatDistanceKm, formatDuration, formatPace, formatSpeedKmh } from '@/lib/format';
import { levelTitle } from '@/lib/progress/xp';
import {
  cancelRequest,
  follow,
  getFollowState,
  getReactions,
  setLike,
  unfollow,
  type FeedItem,
  type FollowState,
  type Reactions,
} from '@/lib/social-service';
import type { UserProfile } from '@/lib/types';

/** Follow / Requested / Following button. Public profiles follow at once; others get a request. */
export function FollowButton({ me, target, compact = false, onChange }: { me: string; target: UserProfile; compact?: boolean; onChange?: (s: FollowState) => void }) {
  const [state, setState] = useState<FollowState | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);

  useEffect(() => {
    let live = true;
    getFollowState(me, target.uid)
      .then((s) => live && setState(s))
      .catch(() => live && setState('none'));
    return () => {
      live = false;
    };
  }, [me, target.uid]);

  if (state === null) return <ActivityIndicator color={Colors.primary} />;
  if (state === 'self') return null;

  async function press() {
    if (!state) return;
    if (state === 'following' && !confirm) {
      setConfirm(true);
      setTimeout(() => setConfirm(false), 4000);
      return;
    }
    setBusy(true);
    try {
      let next: FollowState = state;
      if (state === 'none') next = await follow(me, target);
      else if (state === 'requested') {
        await cancelRequest(me, target.uid);
        next = 'none';
      } else {
        await unfollow(me, target.uid);
        next = 'none';
      }
      setConfirm(false);
      setState(next);
      onChange?.(next);
    } finally {
      setBusy(false);
    }
  }

  const label =
    state === 'none' ? (target.privacy.profileVisibility === 'public' ? 'Follow' : 'Request to follow') : state === 'requested' ? 'Requested' : confirm ? 'Tap to unfollow' : 'Following';
  return (
    <Button
      testID={`follow-${target.usernameLower}`}
      title={compact && state === 'none' && target.privacy.profileVisibility !== 'public' ? 'Request' : label}
      variant={state === 'none' ? 'primary' : confirm ? 'danger' : 'secondary'}
      icon={state === 'none' ? 'user-plus' : state === 'following' && !confirm ? 'check' : undefined}
      loading={busy}
      onPress={press}
      style={compact ? { minHeight: 36, paddingHorizontal: Spacing.md } : undefined}
    />
  );
}

/** A person: avatar, name, username and level. Tapping opens their profile. */
export function PersonRow({ user, me, right, testID }: { user: UserProfile; me: string; right?: ReactNode; testID?: string }) {
  const router = useRouter();
  return (
    <Pressable
      testID={testID ?? `person-${user.usernameLower}`}
      accessibilityRole="button"
      accessibilityLabel={`Open ${user.displayName}'s profile`}
      onPress={() => router.push({ pathname: '/user/[uid]', params: { uid: user.uid } })}
      style={({ pressed }) => [styles.person, pressed && { backgroundColor: Colors.surfaceRaised }]}>
      <Avatar uri={user.photoURL} name={user.displayName} size={44} />
      <View style={{ flex: 1 }}>
        <Text style={[Type.bodyStrong, { color: Colors.text }]} numberOfLines={1}>
          {user.displayName}
          {user.uid === me ? <Text style={{ color: Colors.textMuted }}> (you)</Text> : null}
        </Text>
        <Text style={[Type.small, { color: Colors.textSecondary }]} numberOfLines={1}>
          @{user.username} · Level {user.level} {levelTitle(user.level)}
        </Text>
      </View>
      {right}
    </Pressable>
  );
}

/** Like button. The parent loads the reactions and gets every change back. */
export function LikeButton({ activityId, me, value, onChange, ownerId }: { activityId: string; me: string; value: Reactions | null; onChange: (r: Reactions) => void; ownerId?: string }) {
  async function toggle() {
    if (!value) return;
    const next = { ...value, likedByMe: !value.likedByMe, likes: Math.max(0, value.likes + (value.likedByMe ? -1 : 1)) };
    onChange(next);
    try {
      await setLike(activityId, me, next.likedByMe, ownerId);
    } catch {
      onChange(value);
    }
  }
  const liked = value?.likedByMe ?? false;
  return (
    <Pressable
      testID={`like-${activityId}`}
      accessibilityRole="button"
      accessibilityState={{ selected: liked }}
      accessibilityLabel={liked ? 'Unlike' : 'Like'}
      hitSlop={8}
      onPress={toggle}
      style={styles.reaction}>
      <Icon name="heart" size={20} color={liked ? Colors.danger : Colors.textSecondary} />
      <Text style={[Type.small, { color: liked ? Colors.text : Colors.textSecondary }]} testID={`like-count-${activityId}`}>
        {value ? value.likes : '–'}
      </Text>
    </Pressable>
  );
}

/** Wide route preview that fills its container. */
function RouteBanner({ polyline, color }: { polyline: string; color: string }) {
  const [w, setW] = useState(0);
  return (
    <View onLayout={(e) => setW(Math.round(e.nativeEvent.layout.width))} style={{ height: 150 }}>
      {w > 0 ? <RouteThumb polyline={polyline} color={color} size={150} width={w} /> : null}
    </View>
  );
}

/** One activity in the community feed. */
export function FeedCard({ item, me }: { item: FeedItem; me: string }) {
  const router = useRouter();
  const a = item.activity;
  const color = SPORT_COLOR[a.sport];
  const [r, setR] = useState<Reactions | null>(null);
  useEffect(() => {
    let live = true;
    getReactions(a.id, me)
      .then((x) => live && setR(x))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [a.id, me]);
  const open = () => router.push({ pathname: '/activity/[id]', params: { id: a.id } });

  return (
    <View style={styles.card} testID={`feed-${a.id}`}>
      <Pressable style={styles.cardHead} onPress={() => router.push({ pathname: '/user/[uid]', params: { uid: item.owner.uid } })} accessibilityRole="button" accessibilityLabel={`Open ${item.owner.displayName}'s profile`}>
        <Avatar uri={item.owner.photoURL} name={item.owner.displayName} size={40} />
        <View style={{ flex: 1 }}>
          <Text style={[Type.bodyStrong, { color: Colors.text }]} numberOfLines={1}>
            {item.owner.uid === me ? 'You' : item.owner.displayName}
          </Text>
          <Text style={[Type.small, { color: Colors.textMuted }]}>{formatActivityDate(a)}</Text>
        </View>
        <Icon name={a.sport} size={22} color={color} />
      </Pressable>
      <Pressable onPress={open} accessibilityRole="button" accessibilityLabel={`Open ${a.title}`} style={{ gap: Spacing.md }}>
        <Text style={[Type.heading, { color: Colors.text }]} numberOfLines={2}>
          {a.title}
        </Text>
        <View style={styles.cardStats}>
          <View>
            <Text style={styles.statLabel}>DISTANCE</Text>
            <Text style={styles.statValue}>{formatDistanceKm(a.distanceM)} km</Text>
          </View>
          <View>
            <Text style={styles.statLabel}>{a.sport === 'ride' ? 'SPEED' : 'PACE'}</Text>
            <Text style={styles.statValue}>{a.sport === 'ride' ? `${formatSpeedKmh(a.avgSpeedMps)} km/h` : `${formatPace(a.avgPaceSPerKm)} /km`}</Text>
          </View>
          <View>
            <Text style={styles.statLabel}>TIME</Text>
            <Text style={styles.statValue}>{formatDuration(a.movingTimeS)}</Text>
          </View>
        </View>
        {a.polyline ? <RouteBanner polyline={a.polyline} color={color} /> : null}
      </Pressable>
      <View style={styles.reactions}>
        <LikeButton activityId={a.id} me={me} value={r} onChange={setR} ownerId={a.ownerId} />
        <Pressable style={styles.reaction} onPress={open} accessibilityRole="button" accessibilityLabel="Comments" testID={`comments-${a.id}`}>
          <Icon name="comment" size={20} color={Colors.textSecondary} />
          <Text style={[Type.small, { color: Colors.textSecondary }]}>{r ? r.comments : '–'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  person: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.lg },
  card: { backgroundColor: Colors.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, padding: Spacing.lg, gap: Spacing.md, overflow: 'hidden' },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  cardStats: { flexDirection: 'row', gap: Spacing.xl },
  statLabel: { ...Type.caption, color: Colors.textMuted },
  statValue: { ...Type.bodyStrong, color: Colors.text },
  reactions: { flexDirection: 'row', gap: Spacing.xl, borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: Spacing.md },
  reaction: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 32 },
});
