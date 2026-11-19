import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/icons';
import { ScreenHeader } from '@/components/screen-header';
import { Banner, Button, Screen, TextField } from '@/components/ui';
import { Colors, Spacing, Type } from '@/constants/theme';
import { sendPasswordReset } from '@/lib/auth-service';
import { authErrorMessage, validateEmail } from '@/lib/validation';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit() {
    const err = validateEmail(email);
    setError(err);
    if (err) return;
    setBusy(true);
    try {
      await sendPasswordReset(email);
      setSent(true);
    } catch (e) {
      // Do not reveal whether an account exists for this address.
      const code = (e as { code?: string }).code;
      if (code === 'auth/user-not-found') setSent(true);
      else setError(authErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen header={<ScreenHeader fallback="/welcome" />}>
      <View style={styles.head}>
        <View style={styles.iconWrap}>
          <Icon name="lock" size={28} color={Colors.primary} />
        </View>
        <Text style={styles.title}>Reset your password</Text>
        <Text style={styles.sub}>Enter the email you signed up with and we will send you a reset link.</Text>
      </View>
      <View style={styles.form}>
        {sent ? (
          <Banner kind="success" text={`If an account exists for ${email.trim()}, a reset link is on its way. Check your inbox and spam folder.`} />
        ) : null}
        <TextField
          testID="forgot-email"
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          returnKeyType="send"
          onSubmitEditing={submit}
          error={error}
        />
        <Button testID="forgot-submit" title={sent ? 'Send again' : 'Send reset link'} onPress={submit} loading={busy} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { gap: Spacing.sm, marginTop: Spacing.lg, marginBottom: Spacing.xl },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(25, 211, 181, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { ...Type.title, color: Colors.text, marginTop: Spacing.md },
  sub: { ...Type.body, color: Colors.textSecondary },
  form: { gap: Spacing.lg },
});
