import * as AppleAuthentication from 'expo-apple-authentication';
import * as Google from 'expo-auth-session/providers/google';
import * as Crypto from 'expo-crypto';
import * as WebBrowser from 'expo-web-browser';
import { GoogleAuthProvider, OAuthProvider, signInWithCredential } from 'firebase/auth';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Colors, Radius, Spacing, Type } from '@/constants/theme';
import { auth } from '@/lib/firebase';
import { GOOGLE_IDS, appleEnabled, googleEnabled } from '@/lib/social-auth-config';
import { socialErrorMessage } from '@/lib/validation';
import { Button } from './ui';

WebBrowser.maybeCompleteAuthSession();

type Props = { onError: (message: string) => void };

/** Native: Google through the system browser, Apple with the iOS sheet. Each is hidden until configured. */
export function SocialSignIn({ onError }: Props) {
  const google = googleEnabled();
  const [apple, setApple] = useState(false);
  useEffect(() => {
    if (appleEnabled()) AppleAuthentication.isAvailableAsync().then(setApple).catch(() => setApple(false));
  }, []);
  if (!google && !apple) return null;

  return (
    <View style={styles.wrap}>
      <View style={styles.or}>
        <View style={styles.line} />
        <Text style={[Type.small, { color: Colors.textMuted }]}>or</Text>
        <View style={styles.line} />
      </View>
      {apple ? <AppleButton onError={onError} /> : null}
      {google ? <GoogleButton onError={onError} /> : null}
    </View>
  );
}

function GoogleButton({ onError }: Props) {
  const [busy, setBusy] = useState(false);
  const [request, response, prompt] = Google.useIdTokenAuthRequest({
    webClientId: GOOGLE_IDS.web,
    iosClientId: GOOGLE_IDS.ios,
    androidClientId: GOOGLE_IDS.android,
  });

  useEffect(() => {
    if (!response) return;
    if (response.type !== 'success') {
      setBusy(false);
      if (response.type === 'error') onError('Google sign-in did not finish. Please try again.');
      return;
    }
    const idToken = response.params.id_token;
    signInWithCredential(auth, GoogleAuthProvider.credential(idToken))
      .catch((e) => {
        const msg = socialErrorMessage(e);
        if (msg) onError(msg);
      })
      .finally(() => setBusy(false));
  }, [response, onError]);

  return (
    <Button
      testID="google-sign-in"
      title="Continue with Google"
      variant="secondary"
      loading={busy}
      onPress={() => {
        if (!request) return;
        setBusy(true);
        prompt().catch(() => setBusy(false));
      }}
    />
  );
}

function AppleButton({ onError }: Props) {
  async function signIn() {
    try {
      const rawNonce = Crypto.randomUUID() + Crypto.randomUUID();
      const hashed = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce);
      const result = await AppleAuthentication.signInAsync({
        requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME, AppleAuthentication.AppleAuthenticationScope.EMAIL],
        nonce: hashed,
      });
      if (!result.identityToken) throw new Error('PN:Apple did not return a sign-in token. Please try again.');
      await signInWithCredential(auth, new OAuthProvider('apple.com').credential({ idToken: result.identityToken, rawNonce }));
    } catch (e) {
      if (typeof e === 'object' && e && 'code' in e && (e as { code: string }).code === 'ERR_REQUEST_CANCELED') return;
      const msg = socialErrorMessage(e);
      if (msg) onError(msg);
    }
  }
  return (
    <AppleAuthentication.AppleAuthenticationButton
      buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
      buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
      cornerRadius={Radius.lg}
      style={{ height: 52 }}
      onPress={signIn}
    />
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.md },
  or: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  line: { flex: 1, height: 1, backgroundColor: Colors.border },
});
