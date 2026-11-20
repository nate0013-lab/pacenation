import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { ScreenHeader } from '@/components/screen-header';
import { FollowButton, PersonRow } from '@/components/social';
import { Button, Card, EmptyState, Screen } from '@/components/ui';
import { Colors, Spacing } from '@/constants/theme';
import { useProfile } from '@/lib/auth-context';
import { getUserCards, listConnections, removeFollower } from '@/lib/social-service';
import type { UserProfile } from '@/lib/types';

/** Followers or following of any user. On my own followers list I can remove people. */
export default function ConnectionsScreen() {
  const { uid, kind } = useLocalSearchParams<{ uid: string; kind: 'followers' | 'following' }>();
  const { profile: me } = useProfile();
  const [people, setPeople] = useState<UserProfile[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [confirm, setConfirm] = useState<string | null>(null);
  const mine = uid === me.uid;
  const k = kind === 'following' ? 'following' : 'followers';

  const load = useCallback(async () => {
    try {
      const ids = await listConnections(uid, k);
      const cards = await getUserCards(ids);
      setPeople(ids.map((i) => cards.get(i)).filter((c): c is UserProfile => !!c));
    } catch {
      setFailed(true);
      setPeople([]);
    }
  }, [uid, k]);
  useEffect(() => {
    load();
  }, [load]);

  async function remove(u: UserProfile) {
    if (confirm !== u.uid) {
      setConfirm(u.uid);
      return;
    }
    await removeFollower(me.uid, u.uid);
    setConfirm(null);
    setPeople((p) => (p ?? []).filter((x) => x.uid !== u.uid));
  }

  return (
    <Screen header={<ScreenHeader title={k === 'followers' ? 'Followers' : 'Following'} />}>
      {people === null ? (
        <ActivityIndicator color={Colors.primary} style={{ marginTop: Spacing.xl }} />
      ) : people.length === 0 ? (
        <EmptyState
          icon="community"
          title={failed ? 'Could not load this list' : k === 'followers' ? 'No followers yet' : 'Not following anyone yet'}
          body={failed ? 'Check your connection and try again.' : mine ? 'Find people on the Community tab.' : 'Nobody to show here yet.'}
        />
      ) : (
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          {people.map((u, i) => (
            <View key={u.uid} style={i > 0 ? { borderTopWidth: 1, borderTopColor: Colors.border } : undefined}>
              <PersonRow
                user={u}
                me={me.uid}
                right={
                  mine && k === 'followers' ? (
                    <Button
                      testID={`remove-${u.usernameLower}`}
                      title={confirm === u.uid ? 'Confirm' : 'Remove'}
                      variant={confirm === u.uid ? 'danger' : 'secondary'}
                      onPress={() => remove(u)}
                      style={{ minHeight: 36, paddingHorizontal: Spacing.md }}
                    />
                  ) : u.uid !== me.uid ? (
                    <FollowButton me={me.uid} target={u} compact />
                  ) : undefined
                }
              />
            </View>
          ))}
        </Card>
      )}
    </Screen>
  );
}
