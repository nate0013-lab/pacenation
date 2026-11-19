import Svg, { Circle, ClipPath, Defs, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/theme';

/**
 * The PaceNation P+N mark: a white P beside a teal N set against a night
 * mountain range, with a sunrise-gold sun. Geometry lives in a 100x100 box.
 */
export function LogoMark({ size = 64 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" accessibilityLabel="PaceNation logo">
      <Defs>
        <ClipPath id="pnBadge">
          <Rect x="2" y="2" width="96" height="96" rx="24" />
        </ClipPath>
        <LinearGradient id="pnSky" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#15283F" />
          <Stop offset="1" stopColor="#0A1626" />
        </LinearGradient>
      </Defs>
      <G clipPath="url(#pnBadge)">
        <Rect x="0" y="0" width="100" height="100" fill="url(#pnSky)" />
        <Path d="M0 84 L22 66 L34 74 L56 52 L72 66 L84 58 L100 70 V100 H0Z" fill="#1C3352" />
        <Path d="M0 92 L18 82 L40 90 L62 76 L100 92 V100 H0Z" fill="#22406A" opacity={0.7} />
      </G>
      <G transform="translate(9 6) scale(0.82)">
        <Path
          d="M18 80 V20 H31 A14 14 0 0 1 31 48 H18"
          fill="none"
          stroke={Colors.text}
          strokeWidth={9.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Path
          d="M50 80 V20 L82 80 V20"
          fill="none"
          stroke={Colors.primary}
          strokeWidth={9.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </G>
      <Circle cx="86" cy="18" r="5.5" fill={Colors.gold} />
    </Svg>
  );
}

export function Wordmark({ size = 22 }: { size?: number }) {
  return (
    <Text style={[styles.word, { fontSize: size, letterSpacing: size * 0.12 }]} accessibilityRole="header">
      <Text style={styles.pace}>PACE</Text>
      <Text style={styles.nation}>NATION</Text>
    </Text>
  );
}

export function Logo({ markSize = 44, wordSize = 20 }: { markSize?: number; wordSize?: number }) {
  return (
    <View style={styles.row}>
      <LogoMark size={markSize} />
      <Wordmark size={wordSize} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  word: { color: Colors.text },
  pace: { fontWeight: '900', color: Colors.text },
  nation: { fontWeight: '300', color: Colors.primary },
});
