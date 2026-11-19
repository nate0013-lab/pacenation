import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { View, type ViewStyle } from 'react-native';

import { Colors } from '@/constants/theme';

/**
 * Original layered mountain landscape with a winding trail and a runner
 * marker. Drawn as vectors so it is crisp on every screen and ships with no
 * licensed photography.
 */
export function MountainScene({ height = 260, style }: { height?: number; style?: ViewStyle }) {
  return (
    <View style={[{ height, width: '100%', overflow: 'hidden' }, style]} pointerEvents="none">
      <Svg width="100%" height="100%" viewBox="0 0 400 260" preserveAspectRatio="xMidYMax slice">
        <Defs>
          <LinearGradient id="msSky" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#0B1D33" />
            <Stop offset="0.6" stopColor="#123150" />
            <Stop offset="1" stopColor="#1B4A66" />
          </LinearGradient>
          <LinearGradient id="msGlow" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={Colors.gold} stopOpacity="0.55" />
            <Stop offset="1" stopColor={Colors.gold} stopOpacity="0" />
          </LinearGradient>
          <LinearGradient id="msFade" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={Colors.bg} stopOpacity="0" />
            <Stop offset="1" stopColor={Colors.bg} stopOpacity="1" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="400" height="260" fill="url(#msSky)" />
        <Circle cx="292" cy="112" r="70" fill="url(#msGlow)" />
        <Circle cx="292" cy="112" r="20" fill={Colors.gold} />
        {/* far range with snow caps */}
        <Path d="M0 170 L58 108 L92 140 L150 72 L206 132 L246 100 L300 150 L352 96 L400 136 V260 H0Z" fill="#1F4466" />
        <Path d="M150 72 L136 88 L146 86 L152 94 L160 84 L166 88Z M352 96 L340 110 L350 108 L356 114 L364 106Z" fill="#DCE8F5" opacity="0.85" />
        {/* mid range */}
        <Path d="M0 196 L44 160 L84 182 L138 132 L190 176 L238 150 L290 186 L340 152 L400 184 V260 H0Z" fill="#173653" />
        {/* near hills */}
        <Path d="M0 226 L70 196 L130 214 L200 186 L262 210 L330 192 L400 214 V260 H0Z" fill="#0F2740" />
        {/* trail */}
        <Path
          d="M36 260 C 90 236, 130 236, 168 222 S 236 200, 262 206 S 318 196, 346 186"
          fill="none"
          stroke={Colors.primary}
          strokeWidth={3}
          strokeDasharray="2 7"
          strokeLinecap="round"
        />
        <Circle cx="262" cy="206" r="6" fill={Colors.primary} />
        <Circle cx="262" cy="206" r="12" fill={Colors.primary} opacity={0.25} />
        <Rect x="0" y="150" width="400" height="110" fill="url(#msFade)" />
      </Svg>
    </View>
  );
}

