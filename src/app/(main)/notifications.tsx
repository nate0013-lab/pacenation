import { useRouter, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { Icon, type IconName } from '@/components/icons';
import { ScreenHeader } from '@/components/screen-header';
import { Button, EmptyState, Screen } from '@/components/ui';
import { Colors, Radius, Spacing, Type } from '@/constants/theme';
import { useProfile } from '@/lib/auth-context';
import { timeAgo } from '@/lib/format';
import { markOneRead, markRead, type AppNotification } from '@/lib/notifications-service';
import { getUserCards } from '@/lib/social-service';
import { useNotifications } from '@/lib/use-notifications';

const ICON: Record<AppNotification['type'], { icon: IconName; color: string }> = {
  follow: { icon: 'user-plus', color: Colors.primary },
  follow_request: { icon: 'user-plus', color: Colors.gold },
  follow_approved: { icon: 'check', color: Colors.walk },
  cheer: { icon: 'heart', color: Colors.primary },
  comment: { icon: 'comment', color: Colors.ride },
  event_join: { icon: 'calendar', color: Colors.walk },
  event_cancelled: { icon: 'close', color: Colors.danger },
  event_updated: { icon: 'calendar', color: Colors.gold },
};

function describe(n: AppNotification): string {
  switch (n.type) {
    case 'follow':
      return `${n.fromName} started following you`;
    case 'follow_request':
      return `${n.fromName} asked to follow you`;
    case 'follow_approved':
      return `${n.fromName} approved your follow request`;
    case 'cheer':
      return `${n.fromName} cheered your activity`;
    case 'comment':
      return `${n.fromName} commented: "${n.text ?? ''}"`;
    case 'event_join':
      return `${n.fromName} is coming to your event`;
    case 'event_cancelled':
      return `${n.fromName} cancelled ${n.text ? `"${n.text}"` : 'an event you joined'}`;
    case 'event_updated':
      return `${n.fromName} changed the details of ${n.text ? `"${n.text}"` : 'an event you joined'}`;
  }
}

function target(n: AppNotification): Href {
  if ((n.type === 'cheer' || n.type === 'comment') && n.activityId) return `/activity/${n.activityId}`;
  if (n.type.startsWith('event_') && n.eventId) return `/events/${n.eventId}`;
  if (n.type === 'follow_request') return '/requests';
  return `/user/${n.fromUid}`;
}

export default function Notifications() {
  const router = useRouter();
  const { profile } = useProfile();
  const { items, unread, loaded } = useNotifications();
  const [photos, setPhotos] = useState<Record<string, string | null>>({});

  const senders = [...new Set(items.map((n) => n.fromUid))].filter((u) => !(u in photos));
  const sendersKey = senders.join(',');
  useEffect(() => {
    if (!sendersKey) return;
    let live = true;
    getUserCards(sendersKey.split(','))
      .then((cards) => {
        if (!live) return;
        setPhotos((p) => {
          const next = { ...p };
          for (const u of sendersKey.split(',')) next[u] = cards.get(u)?.photoURL ?? null;
          return next;
        });
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [sendersKey]);

  function open(n: AppNotification) {
    if (!n.read) markOneRead(profile.uid, n.id).catch(() => undefined);
    router.push(target(n));
  }

  return (
    <Screen header={<ScreenHeader title="Notifications" />}>
      <View style={styles.top}>
        <Text style={[Type.small, { color: Colors.textSecondary, flex: 1 }]} testID="notifications-unread">
          {unread === 0 ? 'You are all caught up' : `${unread} unread`}
        </Text>
        {unread > 0 ? (
          <Button
            testID="notifications-read-all"
            title="Mark all read"
            variant="ghost"
            onPress={() => markRead(profile.uid, items.filter((n) => !n.read).map((n) => n.id)).catch(() => undefined)}
            style={{ minHeight: 32, paddingHorizontal: 0 }}
          />
        ) : null}
        <Button
          testID="notifications-settings"
          title="Settings"
          variant="ghost"
          onPress={() => router.push('/settings/notifications')}
          style={{ minHeight: 32, paddingHorizontal: 0 }}
        />
      </View>
      {loaded && items.length === 0 ? (
        <EmptyState icon="bell" title="Nothing yet" body="When people follow you, cheer or comment on your activities, or join your events, you will see it here." />
      ) : (
        <View style={{ gap: Spacing.sm }}>
          {items.map((n) => (
            <Pressable
              key={n.id}
              testID={`notification-${n.type}`}
              accessibilityRole="button"
              onPress={() => open(n)}
              style={({ pressed }) => [styles.row, !n.read && styles.unread, pressed && { opacity: 0.7 }]}>
              <View>
                <Avatar uri={photos[n.fromUid] ?? null} name={n.fromName} size={44} />
                <View style={[styles.badge, { backgroundColor: ICON[n.type].color }]}>
                  <Icon name={ICON[n.type].icon} size={12} color={Colors.bg} strokeWidth={2.6} />
                </View>
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[Type.body, { color: Colors.text }]} numberOfLines={3}>
                  {describe(n)}
                </Text>
                <Text style={[Type.small, { color: Colors.textMuted }]}>{timeAgo(n.createdAt)}</Text>
              </View>
              {!n.read ? <View style={styles.dot} /> : null}
            </Pressable>
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: Spacing.lg, marginVertical: Spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.md, borderRadius: Radius.lg, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  unread: { borderColor: Colors.primary + '66', backgroundColor: Colors.surfaceRaised },
  badge: { position: 'absolute', right: -3, bottom: -3, width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: Colors.surface },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: Colors.primary },
});
