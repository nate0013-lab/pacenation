import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import { ScreenHeader } from '@/components/screen-header';
import { PersonRow } from '@/components/social';
import { Button, Card, EmptyState, Screen } from '@/components/ui';
import { Colors, Spacing, Type } from '@/constants/theme';
import { useProfile } from '@/lib/auth-context';
import { approveRequest, declineRequest, getUserCards } from '@/lib/social-service';
import type { UserProfile } from '@/lib/types';
import { useSocial } from '@/lib/use-social';

export default function RequestsScreen() {
  const { profile: me } = useProfile();
  const { requests } = useSocial();
  const [cards, setCards] = useState<Map<string, UserProfile>>(new Map());
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    getUserCards(requests.map((r) => r.uid)).then(setCards).catch(() => undefined);
  }, [requests]);

  async function act(uid: string, approve: boolean) {
    setBusy(uid);
    try {
      if (approve) await approveRequest(me.uid, uid);
      else await declineRequest(me.uid, uid);
    } finally {
      setBusy(null);
    }
  }

  return (
    <Screen header={<ScreenHeader title="Follow requests" />}>
      <Text style={[Type.body, { color: Colors.textSecondary, marginBottom: Spacing.lg }]}>
        Your profile is {me.privacy.profileVisibility === 'private' ? 'private' : 'for followers only'}, so people ask before following you. Approved followers see what your privacy settings allow.
      </Text>
      {requests.length === 0 ? (
        <EmptyState icon="community" title="No requests" body="When someone asks to follow you, they will show up here." />
      ) : (
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          {requests.map((r, i) => {
            const u = cards.get(r.uid);
            if (!u) return null;
            return (
              <View key={r.uid} style={i > 0 ? { borderTopWidth: 1, borderTopColor: Colors.border } : undefined}>
                <PersonRow user={u} me={me.uid} />
                <View style={{ flexDirection: 'row', gap: Spacing.md, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg }}>
                  <Button testID={`approve-${u.usernameLower}`} title="Approve" icon="check" loading={busy === r.uid} onPress={() => act(r.uid, true)} style={{ flex: 1 }} />
                  <Button testID={`decline-${u.usernameLower}`} title="Decline" variant="secondary" disabled={busy === r.uid} onPress={() => act(r.uid, false)} style={{ flex: 1 }} />
                </View>
              </View>
            );
          })}
        </Card>
      )}
    </Screen>
  );
}
