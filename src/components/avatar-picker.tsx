import * as ImagePicker from 'expo-image-picker';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Type } from '@/constants/theme';
import { Avatar } from './avatar';
import { Icon } from './icons';

/** Tap to choose a square profile picture from the photo library. */
export function AvatarPicker({ uri, name, onPicked }: { uri: string | null; name: string; onPicked: (uri: string) => void }) {
  async function pick() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) onPicked(result.assets[0].uri);
  }
  return (
    <Pressable onPress={pick} accessibilityRole="button" accessibilityLabel="Choose profile picture" style={styles.wrap}>
      <View>
        <Avatar uri={uri} name={name || 'P N'} size={96} ring />
        <View style={styles.badge}>
          <Icon name="camera" size={18} color={Colors.onPrimary} />
        </View>
      </View>
      <Text style={[Type.small, { color: Colors.primary, fontWeight: '600' }]}>{uri ? 'Change photo' : 'Add a photo'}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 8 },
  badge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: Colors.bg,
  },
});
