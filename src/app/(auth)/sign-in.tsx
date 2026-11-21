import { Link, useRouter } from 'expo-router';
import { useRef, useState, type ComponentRef } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { LogoMark } from '@/components/logo';
import { ScreenHeader } from '@/components/screen-header';
import { Banner, Button, Screen, TextField } from '@/components/ui';
import { SocialSignIn } from '@/components/social-sign-in';
import { Colors, Spacing, Type } from '@/constants/theme';
import { signInWithEmail } from '@/lib/auth-service';
import { authErrorMessage, validateEmail } from '@/lib/validation';

export default function SignIn() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string | null; password?: string | null }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const passwordRef = useRef<ComponentRef<typeof TextInput>>(null);

  async function submit() {
    const next = { email: validateEmail(email), password: password ? null : 'Enter your password.' };
    setErrors(next);
    setFormError(null);
    if (next.email || next.password) return;
    setBusy(true);
    try {
      await signInWithEmail(email, password);
      // The auth gate moves the user on once their profile loads.
    } catch (e) {
      setFormError(authErrorMessage(e));
      setBusy(false);
    }
  }

  return (
    <Screen header={<ScreenHeader fallback="/welcome" />}>
      <View style={styles.head}>
        <LogoMark size={56} />
        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.sub}>Sign in to pick up where you left off.</Text>
      </View>
      <View style={styles.form}>
        {formError ? <Banner kind="error" text={formError} /> : null}
        <TextField
          testID="sign-in-email"
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
          returnKeyType="next"
          onSubmitEditing={() => passwordRef.current?.focus()}
          error={errors.email}
        />
        <TextField
          ref={passwordRef}
          testID="sign-in-password"
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="current-password"
          textContentType="password"
          returnKeyType="go"
          onSubmitEditing={submit}
          error={errors.password}
        />
        <Link href="/forgot-password" style={styles.link} testID="sign-in-forgot">
          Forgot password?
        </Link>
        <Button testID="sign-in-submit" title="Sign in" onPress={submit} loading={busy} />
        <SocialSignIn onError={setFormError} />
        <Button title="New here? Create an account" variant="ghost" onPress={() => router.replace('/sign-up')} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { alignItems: 'flex-start', gap: Spacing.sm, marginTop: Spacing.lg, marginBottom: Spacing.xl },
  title: { ...Type.title, color: Colors.text, marginTop: Spacing.md },
  sub: { ...Type.body, color: Colors.textSecondary },
  form: { gap: Spacing.lg },
  link: { ...Type.small, color: Colors.primary, fontWeight: '600', alignSelf: 'flex-end' },
});
