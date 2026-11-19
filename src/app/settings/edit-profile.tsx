import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ProfileForm, validateProfileForm, type ProfileFormValues, type UsernameState } from '@/components/profile-form';
import { ScreenHeader } from '@/components/screen-header';
import { Banner, Button, Screen } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useProfile } from '@/lib/auth-context';
import { getPrivateSettings, updateProfile } from '@/lib/profile-service';
import { authErrorMessage, parseWeight } from '@/lib/validation';

export default function EditProfile() {
  const router = useRouter();
  const { profile } = useProfile();
  const [values, setValues] = useState<ProfileFormValues>({
    displayName: profile.displayName,
    username: profile.username,
    bio: profile.bio,
    weight: '',
    photoUri: null,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [usernameState, setUsernameState] = useState<UsernameState>('idle');
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getPrivateSettings(profile.uid)
      .then((s) => s?.weightKg && setValues((v) => ({ ...v, weight: String(s.weightKg) })))
      .catch(() => undefined);
  }, [profile.uid]);

  async function save() {
    const next = validateProfileForm(values);
    if (usernameState === 'taken') next.username = 'That username is taken. Try another.';
    setErrors(next);
    setFormError(null);
    if (Object.keys(next).length) return;
    setBusy(true);
    try {
      await updateProfile(profile, {
        displayName: values.displayName,
        bio: values.bio,
        username: values.username,
        photoUri: values.photoUri,
        weightKg: parseWeight(values.weight).value,
      });
      router.back();
    } catch (e) {
      setFormError(authErrorMessage(e));
      setBusy(false);
    }
  }

  return (
    <Screen header={<ScreenHeader title="Edit profile" fallback="/profile" />}>
      <View style={styles.wrap}>
        {formError ? <Banner kind="error" text={formError} /> : null}
        <ProfileForm
          values={values}
          onChange={setValues}
          errors={errors}
          currentPhotoURL={profile.photoURL}
          myUid={profile.uid}
          onUsernameState={setUsernameState}
        />
        <Button testID="edit-profile-save" title="Save changes" onPress={save} loading={busy} disabled={usernameState === 'checking'} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({ wrap: { gap: Spacing.xl, marginTop: Spacing.md } });
