import { useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';

import { ScreenHeader } from '@/components/screen-header';
import { Banner, Card, Screen, Segmented } from '@/components/ui';
import { Colors, Spacing, Type } from '@/constants/theme';
import { useProfile } from '@/lib/auth-context';
import { updatePrivacy } from '@/lib/profile-service';
import type { PrivacySettings, Visibility } from '@/lib/types';

const OPTIONS: { value: Visibility; label: string }[] = [
  { value: 'public', label: 'Everyone' },
  { value: 'followers', label: 'Followers' },
  { value: 'private', label: 'Only me' },
];

export default function Privacy() {
  const { profile } = useProfile();
  const [privacy, setPrivacy] = useState<PrivacySettings>(profile.privacy);
  const [status, setStatus] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  async function change(patch: Partial<PrivacySettings>) {
    const prev = privacy;
    const next = { ...privacy, ...patch };
    setPrivacy(next);
    setStatus(null);
    try {
      await updatePrivacy(profile.uid, next);
      setStatus({ kind: 'success', text: 'Saved.' });
    } catch {
      setPrivacy(prev);
      setStatus({ kind: 'error', text: 'Could not save. Check your connection and try again.' });
    }
  }

  return (
    <Screen header={<ScreenHeader title="Privacy" fallback="/profile" />}>
      <View style={styles.wrap}>
        {status ? <Banner kind={status.kind} text={status.text} /> : null}
        <Card style={styles.block}>
          <Text style={styles.label}>Who can see my profile stats</Text>
          <Text style={styles.help}>Your name, username and photo stay searchable so people can find you. This controls your stats, records and badges.</Text>
          <Segmented options={OPTIONS} value={privacy.profileVisibility} onChange={(v) => change({ profileVisibility: v })} />
        </Card>
        <Card style={styles.block}>
          <Text style={styles.label}>Default visibility for new activities</Text>
          <Text style={styles.help}>You can still change it on each activity. Routes are only shown to people allowed to see the activity.</Text>
          <Segmented options={OPTIONS} value={privacy.activityVisibility} onChange={(v) => change({ activityVisibility: v })} />
        </Card>
        <Card style={{ ...styles.block, ...styles.switchRow }}>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={styles.label}>Show me on leaderboards</Text>
            <Text style={styles.help}>When off, your distance still counts for you but you will not appear in public rankings.</Text>
          </View>
          <Switch
            testID="privacy-leaderboards"
            value={privacy.showOnLeaderboards}
            onValueChange={(v) => change({ showOnLeaderboards: v })}
            trackColor={{ true: Colors.primary, false: Colors.surfaceRaised }}
            thumbColor={Colors.text}
            accessibilityLabel="Show me on leaderboards"
          />
        </Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.lg, marginTop: Spacing.md },
  block: { gap: Spacing.md },
  switchRow: { flexDirection: 'row', alignItems: 'center' },
  label: { ...Type.bodyStrong, color: Colors.text },
  help: { ...Type.small, color: Colors.textSecondary },
});
