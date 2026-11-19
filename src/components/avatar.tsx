import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/theme';

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

export function Avatar({ uri, name, size = 56, ring = false }: { uri: string | null | undefined; name: string; size?: number; ring?: boolean }) {
  const style = { width: size, height: size, borderRadius: size / 2 };
  return (
    <View style={[ring && { padding: 3, borderRadius: size, borderWidth: 2, borderColor: Colors.primary }]}>
      {uri ? (
        <Image source={{ uri }} style={style} contentFit="cover" accessibilityLabel={`${name} profile picture`} transition={150} />
      ) : (
        <View style={[style, styles.fallback]} accessibilityLabel={`${name} profile picture`}>
          <Text style={[styles.initials, { fontSize: size * 0.38 }]}>{initials(name)}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: { backgroundColor: Colors.surfaceRaised, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.borderStrong },
  initials: { color: Colors.primary, fontWeight: '800' },
});
