import { Stack } from 'expo-router';

import { Colors } from '@/constants/theme';
import { useAuth } from '@/lib/auth-context';

export default function SettingsLayout() {
  const { status } = useAuth();
  if (status !== 'ready') return null;
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.bg }, animation: 'slide_from_right' }} />;
}
