import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ScreenHeader } from '@/components/screen-header';
import { Banner, Button, Card, ListRow, Screen, TextField } from '@/components/ui';
import { Colors, Spacing, Type } from '@/constants/theme';
import { useProfile } from '@/lib/auth-context';
import { deleteAccount, hasPassword, sendPasswordReset, signOut } from '@/lib/auth-service';
import { authErrorMessage } from '@/lib/validation';

export default function Account() {
  const { user, profile } = useProfile();
  const [status, setStatus] = useState<{
    kind: 'success' | 'error';
    text: string;
  } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const usesPassword = hasPassword();

  async function resetPassword() {
    if (!user.email) return;
    try {
      await sendPasswordReset(user.email);
      setStatus({
        kind: 'success',
        text: `We sent a password reset link to ${user.email}.`,
      });
    } catch (e) {
      setStatus({ kind: 'error', text: authErrorMessage(e) });
    }
  }

  async function doDelete() {
    if (usesPassword && !password) {
      setStatus({ kind: 'error', text: 'Enter your password to confirm.' });
      return;
    }
    setBusy(true);
    setStatus(null);
    try {
      await deleteAccount(usesPassword ? password : null, profile.usernameLower);
      // Signing out of a deleted account returns to the welcome screen via the auth gate.
    } catch (e) {
      setStatus({ kind: 'error', text: authErrorMessage(e) });
      setBusy(false);
    }
  }

  return (
    <Screen header={<ScreenHeader title="Account" fallback="/profile" />}>
      <View style={styles.wrap}>
        {status ? <Banner kind={status.kind} text={status.text} /> : null}
        <Card>
          <Text style={styles.caption}>SIGNED IN AS</Text>
          <Text style={[Type.bodyStrong, { color: Colors.text, marginTop: 4 }]} testID="account-email">
            {user.email}
          </Text>
        </Card>
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          {usesPassword ? (
            <>
              <ListRow testID="account-reset" icon="mail" label="Send password reset email" onPress={resetPassword} />
              <View style={styles.divider} />
            </>
          ) : null}
          <ListRow testID="account-sign-out" icon="logout" label="Sign out" onPress={() => signOut()} />
        </Card>

        <Card style={{ gap: Spacing.md }}>
          <Text style={[Type.bodyStrong, { color: Colors.danger }]}>Delete account</Text>
          <Text style={[Type.small, { color: Colors.textSecondary }]}>This permanently removes your profile, photo and username. It cannot be undone.</Text>
          {confirmDelete ? (
            <>
              {usesPassword ? (
                <TextField
                  testID="account-delete-password"
                  label="Confirm with your password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoComplete="current-password"
                />
              ) : (
                <Text style={[Type.small, { color: Colors.textSecondary }]}>You may be asked to confirm with your sign-in provider.</Text>
              )}
              <Button testID="account-delete-confirm" title="Delete my account" variant="danger" onPress={doDelete} loading={busy} />
              <Button title="Keep my account" variant="ghost" onPress={() => (setConfirmDelete(false), setPassword(''))} />
            </>
          ) : (
            <Button testID="account-delete" title="Delete account" variant="danger" onPress={() => setConfirmDelete(true)} />
          )}
        </Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.lg, marginTop: Spacing.md },
  caption: { ...Type.caption, color: Colors.textSecondary },
  divider: { borderTopWidth: 1, borderTopColor: Colors.border },
});
