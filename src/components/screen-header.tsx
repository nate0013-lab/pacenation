import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, MaxContentWidth, Spacing, Type } from '@/constants/theme';
import { Icon } from './icons';

/** A back button with an optional title, for pushed screens. */
export function ScreenHeader({ title, fallback = '/' }: { title?: string; fallback?: '/' | '/welcome' | '/profile' }) {
  const router = useRouter();
  return (
    <View style={styles.bar}>
      <Pressable
        testID="header-back"
        accessibilityRole="button"
        accessibilityLabel="Go back"
        hitSlop={12}
        onPress={() => (router.canGoBack() ? router.back() : router.replace(fallback))}
        style={styles.back}>
        <Icon name="back" size={24} color={Colors.text} />
      </Pressable>
      {title ? <Text style={styles.title}>{title}</Text> : null}
      <View style={styles.back} />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.sm,
    height: 52,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  back: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  title: { ...Type.bodyStrong, color: Colors.text },
});
