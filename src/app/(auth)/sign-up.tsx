import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { LogoMark } from '@/components/logo';
import { ScreenHeader } from '@/components/screen-header';
import { Banner, Button, Screen, TextField } from '@/components/ui';
import { Colors, Spacing, Type } from '@/constants/theme';
import { signUpWithEmail } from '@/lib/auth-service';
import { authErrorMessage, validateEmail, validatePassword, validatePasswordConfirm } from '@/lib/validation';

export default function SignUp() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    const next = {
      email: validateEmail(email),
      password: validatePassword(password),
      confirm: validatePasswordConfirm(password, confirm),
    };
    setErrors(next);
    setFormError(null);
    if (next.email || next.password || next.confirm) return;
    setBusy(true);
    try {
      await signUpWithEmail(email, password);
      // The auth gate sends new accounts to profile creation.
    } catch (e) {
      setFormError(authErrorMessage(e));
      setBusy(false);
    }
  }

  return (
    <Screen header={<ScreenHeader fallback="/welcome" />}>
      <View style={styles.head}>
        <LogoMark size={56} />
        <Text style={styles.title}>Join PaceNation</Text>
        <Text style={styles.sub}>Create your account, then set up your athlete profile.</Text>
      </View>
      <View style={styles.form}>
        {formError ? <Banner kind="error" text={formError} /> : null}
        <TextField
          testID="sign-up-email"
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
          error={errors.email}
        />
        <TextField
          testID="sign-up-password"
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="new-password"
          textContentType="newPassword"
          hint="At least 8 characters with a letter and a number."
          error={errors.password}
        />
        <TextField
          testID="sign-up-confirm"
          label="Confirm password"
          value={confirm}
          onChangeText={setConfirm}
          secureTextEntry
          autoComplete="new-password"
          returnKeyType="go"
          onSubmitEditing={submit}
          error={errors.confirm}
        />
        <Button testID="sign-up-submit" title="Create account" onPress={submit} loading={busy} />
        <Button title="Already a member? Sign in" variant="ghost" onPress={() => router.replace('/sign-in')} />
        <Text style={styles.legal}>By creating an account you agree to keep PaceNation a respectful, supportive community.</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { gap: Spacing.sm, marginTop: Spacing.lg, marginBottom: Spacing.xl },
  title: { ...Type.title, color: Colors.text, marginTop: Spacing.md },
  sub: { ...Type.body, color: Colors.textSecondary },
  form: { gap: Spacing.lg },
  legal: { ...Type.small, color: Colors.textMuted, textAlign: 'center' },
});
