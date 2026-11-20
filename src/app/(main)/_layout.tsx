import { Stack } from 'expo-router';

import { Colors } from '@/constants/theme';
import { useAuth } from '@/lib/auth-context';

/** Signed-in screens pushed over the tabs: the tracker and activity pages. */
export default function MainLayout() {
  const { status } = useAuth();
  if (status !== 'ready') return null;
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.bg }, animation: 'slide_from_right' }}>
      <Stack.Screen name="track" options={{ animation: 'slide_from_bottom', gestureEnabled: false }} />
    </Stack>
  );
}
