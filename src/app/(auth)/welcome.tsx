import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Logo } from '@/components/logo';
import { MountainScene } from '@/components/mountain-scene';
import { Button } from '@/components/ui';
import { Colors, MaxContentWidth, Spacing, Type } from '@/constants/theme';

export default function Welcome() {
  const router = useRouter();
  return (
    <View style={styles.root}>
      <MountainScene height={460} style={styles.scene} />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <Animated.View entering={FadeInDown.duration(500)} style={styles.top}>
          <Logo markSize={48} wordSize={22} />
        </Animated.View>
        <Animated.View entering={FadeInDown.delay(150).duration(600)} style={styles.bottom}>
          <Text style={styles.tagline}>Where Every Kilometre Matters.</Text>
          <Text style={styles.sub}>Compete. Connect. Conquer.</Text>
          <Text style={styles.body}>Track your walks, runs and rides, take on challenges and climb the rankings with a community that moves.</Text>
          <View style={styles.actions}>
            <Button testID="welcome-sign-up" title="Create account" onPress={() => router.push('/sign-up')} />
            <Button testID="welcome-sign-in" title="I already have an account" variant="secondary" onPress={() => router.push('/sign-in')} />
          </View>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  scene: { position: 'absolute', top: 0, left: 0, right: 0 },
  safe: { flex: 1, justifyContent: 'space-between', paddingHorizontal: Spacing.xl, width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' },
  top: { paddingTop: Spacing.lg },
  bottom: { gap: Spacing.sm, paddingBottom: Spacing.lg },
  tagline: { ...Type.hero, color: Colors.text },
  sub: { ...Type.heading, color: Colors.gold, letterSpacing: 0.5 },
  body: { ...Type.body, color: Colors.textSecondary, marginTop: Spacing.xs },
  actions: { gap: Spacing.md, marginTop: Spacing.xl },
});
