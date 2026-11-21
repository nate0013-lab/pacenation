import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Colors, Spacing, Type } from '@/constants/theme';
import { auth } from '@/lib/firebase';
import { googleEnabled } from '@/lib/social-auth-config';
import { socialErrorMessage } from '@/lib/validation';
import { Button } from './ui';

/** Web: Google opens Firebase's own sign-in popup. Hidden until configured. */
export function SocialSignIn({ onError }: { onError: (message: string) => void }) {
  const [busy, setBusy] = useState(false);
  if (!googleEnabled('web')) return null;

  async function google() {
    setBusy(true);
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
      // The auth gate sends new people to create their profile.
    } catch (e) {
      const msg = socialErrorMessage(e);
      if (msg) onError(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.or}>
        <View style={styles.line} />
        <Text style={[Type.small, { color: Colors.textMuted }]}>or</Text>
        <View style={styles.line} />
      </View>
      <Button testID="google-sign-in" title="Continue with Google" variant="secondary" onPress={google} loading={busy} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.md },
  or: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  line: { flex: 1, height: 1, backgroundColor: Colors.border },
});
