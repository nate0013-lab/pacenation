import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ProfileForm, validateProfileForm, type ProfileFormValues, type UsernameState } from '@/components/profile-form';
import { Banner, Button, Screen } from '@/components/ui';
import { Colors, Spacing, Type } from '@/constants/theme';
import { useAuth } from '@/lib/auth-context';
import { signOut } from '@/lib/auth-service';
import { createProfile } from '@/lib/profile-service';
import { authErrorMessage, parseWeight } from '@/lib/validation';

export default function CreateProfile() {
  const { user } = useAuth();
  const [values, setValues] = useState<ProfileFormValues>({
    displayName: user?.displayName ?? '',
    username: '',
    bio: '',
    weight: '',
    photoUri: null,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [usernameState, setUsernameState] = useState<UsernameState>('idle');
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!user) return null;

  async function submit() {
    const next = validateProfileForm(values);
    if (usernameState === 'taken') next.username = 'That username is taken. Try another.';
    setErrors(next);
    setFormError(null);
    if (Object.keys(next).length) return;
    setBusy(true);
    try {
      await createProfile({
        uid: user!.uid,
        email: user!.email ?? '',
        username: values.username,
        displayName: values.displayName,
        bio: values.bio,
        weightKg: parseWeight(values.weight).value,
        photoUri: values.photoUri,
      });
      // The auth gate moves to the dashboard when the profile appears.
    } catch (e) {
      setFormError(authErrorMessage(e));
      setBusy(false);
    }
  }

  return (
    <Screen>
      <View style={styles.head}>
        <Text style={styles.step}>ATHLETE PROFILE</Text>
        <Text style={styles.title}>Set up your profile</Text>
        <Text style={styles.sub}>This is how the community will find you and cheer you on.</Text>
      </View>
      {formError ? <Banner kind="error" text={formError} /> : null}
      <ProfileForm values={values} onChange={setValues} errors={errors} myUid={user.uid} onUsernameState={setUsernameState} />
      <View style={styles.actions}>
        <Button testID="create-profile-submit" title="Start moving" onPress={submit} loading={busy} disabled={usernameState === 'checking'} />
        <Button title="Use a different account" variant="ghost" onPress={() => signOut()} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { gap: Spacing.sm, marginTop: Spacing.xl, marginBottom: Spacing.xl },
  step: { ...Type.caption, color: Colors.gold },
  title: { ...Type.title, color: Colors.text },
  sub: { ...Type.body, color: Colors.textSecondary },
  actions: { gap: Spacing.md, marginTop: Spacing.xl },
});
