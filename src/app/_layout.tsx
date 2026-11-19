import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { LogoMark } from '@/components/logo';
import { Colors } from '@/constants/theme';
import { AuthProvider, useAuth } from '@/lib/auth-context';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

/** Sends people to the right area for their sign-in state. */
function AuthGate() {
  const { status } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return;
    SplashScreen.hideAsync().catch(() => undefined);
    const area = segments[0];
    if (status === 'signedOut' && area !== '(auth)') router.replace('/welcome');
    else if (status === 'needsProfile' && area !== 'create-profile') router.replace('/create-profile');
    else if (status === 'ready' && (area === '(auth)' || area === 'create-profile')) router.replace('/');
  }, [status, segments, router]);

  return (
    <>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: Colors.bg },
          animation: 'slide_from_right',
        }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(auth)" options={{ animation: 'fade' }} />
        <Stack.Screen name="create-profile" options={{ animation: 'fade' }} />
        <Stack.Screen name="settings" />
      </Stack>
      {status === 'loading' ? (
        <View style={styles.loading} testID="app-loading">
          <LogoMark size={88} />
          <ActivityIndicator color={Colors.primary} style={{ marginTop: 24 }} />
        </View>
      ) : null}
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="light" />
        <AuthGate />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: Colors.bg, alignItems: 'center', justifyContent: 'center' },
});
