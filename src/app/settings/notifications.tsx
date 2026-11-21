import { useEffect, useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';

import { ScreenHeader } from '@/components/screen-header';
import { Banner, Card, Screen } from '@/components/ui';
import { Colors, Spacing, Type } from '@/constants/theme';
import { useProfile } from '@/lib/auth-context';
import { saveNotificationPrefs, useNotifications, type NotificationPrefs } from '@/lib/use-notifications';

const ROWS: { key: keyof NotificationPrefs; label: string; help: string }[] = [
  { key: 'followers', label: 'New followers', help: 'Someone follows you, asks to follow you, or approves your request.' },
  { key: 'likesAndComments', label: 'Cheers and comments', help: 'Someone cheers or comments on one of your activities.' },
  { key: 'events', label: 'Events', help: 'Someone joins an event you host, or an event you joined changes or is cancelled.' },
];

export default function NotificationSettings() {
  const { profile } = useProfile();
  const { prefs: live } = useNotifications();
  const [prefs, setPrefs] = useState<NotificationPrefs>(live);
  const [status, setStatus] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => setPrefs(live), [live]);

  async function toggle(key: keyof NotificationPrefs, value: boolean) {
    const prev = prefs;
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    setStatus(null);
    try {
      await saveNotificationPrefs(profile.uid, next);
      setStatus({ kind: 'success', text: 'Saved.' });
    } catch {
      setPrefs(prev);
      setStatus({ kind: 'error', text: 'Could not save. Check your connection and try again.' });
    }
  }

  return (
    <Screen header={<ScreenHeader title="Notifications" fallback="/profile" />}>
      <View style={styles.wrap}>
        {status ? <Banner kind={status.kind} text={status.text} /> : null}
        <Text style={[Type.small, { color: Colors.textSecondary }]}>Choose what shows in your notifications inbox. Turning one off hides those notifications.</Text>
        {ROWS.map((r) => (
          <Card key={r.key} style={styles.row}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={[Type.bodyStrong, { color: Colors.text }]}>{r.label}</Text>
              <Text style={[Type.small, { color: Colors.textSecondary }]}>{r.help}</Text>
            </View>
            <Switch
              testID={`notif-${r.key}`}
              value={prefs[r.key]}
              onValueChange={(v) => toggle(r.key, v)}
              trackColor={{ true: Colors.primary, false: Colors.surfaceRaised }}
              thumbColor={Colors.text}
              accessibilityLabel={r.label}
            />
          </Card>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.lg, marginTop: Spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
});
