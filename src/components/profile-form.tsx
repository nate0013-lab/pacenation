import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Colors, Spacing, Type } from '@/constants/theme';
import { isUsernameAvailable } from '@/lib/profile-service';
import { normalizeUsername, parseWeight, validateBio, validateDisplayName, validateUsername } from '@/lib/validation';
import { AvatarPicker } from './avatar-picker';
import { TextField } from './ui';

export interface ProfileFormValues {
  displayName: string;
  username: string;
  bio: string;
  weight: string;
  photoUri: string | null;
}

export type UsernameState = 'idle' | 'checking' | 'available' | 'taken';

/** Validates the form, returning field errors (empty object when valid). */
export function validateProfileForm(v: ProfileFormValues): Record<string, string> {
  const errors: Record<string, string> = {};
  const dn = validateDisplayName(v.displayName);
  if (dn) errors.displayName = dn;
  const un = validateUsername(v.username);
  if (un) errors.username = un;
  const bio = validateBio(v.bio);
  if (bio) errors.bio = bio;
  const w = parseWeight(v.weight).error;
  if (w) errors.weight = w;
  return errors;
}

export function ProfileForm({
  values,
  onChange,
  errors,
  currentPhotoURL,
  myUid,
  onUsernameState,
}: {
  values: ProfileFormValues;
  onChange: (v: ProfileFormValues) => void;
  errors: Record<string, string>;
  currentPhotoURL?: string | null;
  myUid: string;
  onUsernameState: (s: UsernameState) => void;
}) {
  const [usernameState, setUsernameState] = useState<UsernameState>('idle');
  const set = (patch: Partial<ProfileFormValues>) => onChange({ ...values, ...patch });

  useEffect(() => {
    const name = normalizeUsername(values.username);
    if (validateUsername(name)) {
      setUsernameState('idle');
      onUsernameState('idle');
      return;
    }
    let cancelled = false;
    setUsernameState('checking');
    onUsernameState('checking');
    const t = setTimeout(async () => {
      try {
        const ok = await isUsernameAvailable(name, myUid);
        if (cancelled) return;
        const s = ok ? 'available' : 'taken';
        setUsernameState(s);
        onUsernameState(s);
      } catch {
        if (!cancelled) {
          setUsernameState('idle');
          onUsernameState('idle');
        }
      }
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
    // onUsernameState is a stable setter from the parent
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values.username, myUid]);

  const usernameError =
    errors.username ?? (usernameState === 'taken' ? 'That username is taken. Try another.' : undefined);
  const usernameHint =
    usernameState === 'checking' ? 'Checking availability…' : usernameState === 'available' ? 'Available' : 'Letters, numbers and underscores, 3 to 20 characters.';

  return (
    <View style={styles.form}>
      <AvatarPicker uri={values.photoUri ?? currentPhotoURL ?? null} name={values.displayName} onPicked={(photoUri) => set({ photoUri })} />
      <TextField
        testID="profile-display-name"
        label="Name"
        value={values.displayName}
        onChangeText={(displayName) => set({ displayName })}
        autoComplete="name"
        placeholder="Alex Rivera"
        error={errors.displayName}
      />
      <View>
        <TextField
          testID="profile-username"
          label="Username"
          value={values.username}
          onChangeText={(username) => set({ username })}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="trail_alex"
          error={usernameError}
          hint={usernameHint}
        />
        {usernameState === 'available' && !errors.username ? <Text style={styles.ok}>✓</Text> : null}
      </View>
      <TextField
        testID="profile-bio"
        label="Bio"
        value={values.bio}
        onChangeText={(bio) => set({ bio })}
        placeholder="Sunrise runner, weekend hill climber."
        multiline
        style={{ minHeight: 84, paddingTop: 14, textAlignVertical: 'top' }}
        error={errors.bio}
        hint={`${values.bio.trim().length}/160`}
      />
      <TextField
        testID="profile-weight"
        label="Weight in kg (optional)"
        value={values.weight}
        onChangeText={(weight) => set({ weight })}
        keyboardType="decimal-pad"
        placeholder="70"
        error={errors.weight}
        hint="Only used to estimate calories. Never shown to others."
      />
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: Spacing.lg },
  ok: { ...Type.bodyStrong, color: Colors.success, position: 'absolute', right: 16, top: 36 },
});
