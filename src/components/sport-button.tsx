import { Pressable, StyleSheet, Text } from 'react-native';

import { Colors, Radius, Spacing, Type } from '@/constants/theme';
import { SPORT_LABEL, type Sport } from '@/lib/types';
import { Icon } from './icons';

export const SPORT_COLOR: Record<Sport, string> = { walk: Colors.walk, run: Colors.run, ride: Colors.ride };

export function SportButton({ sport, onPress, selected, testID }: { sport: Sport; onPress: () => void; selected?: boolean; testID?: string }) {
  const color = SPORT_COLOR[sport];
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={SPORT_LABEL[sport]}
      onPress={onPress}
      style={({ pressed }) => [
        styles.btn,
        selected && { borderColor: color, backgroundColor: `${color}1F` },
        pressed && { transform: [{ scale: 0.97 }] },
      ]}>
      <Icon name={sport} size={30} color={color} strokeWidth={2.1} />
      <Text style={[Type.bodyStrong, { color: Colors.text }]}>{SPORT_LABEL[sport]}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.lg,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
});
