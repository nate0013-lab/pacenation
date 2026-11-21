import { View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';

import { Icon, type IconName } from '@/components/icons';
import { Colors } from '@/constants/theme';
import type { BadgeIcon, BadgeTier } from '@/lib/progress/badges';

export const TIER_COLOR: Record<BadgeTier, { light: string; dark: string; label: string }> = {
  bronze: { light: '#F0B27F', dark: '#A8622F', label: 'Bronze' },
  silver: { light: '#E8EEF6', dark: '#8C9AAE', label: 'Silver' },
  gold: { light: '#FFE08A', dark: '#D69A10', label: 'Gold' },
};

const ICON: Record<BadgeIcon, IconName> = {
  flag: 'flag', route: 'route', run: 'run', walk: 'walk', ride: 'ride', flame: 'flame',
  calendar: 'calendar', mountain: 'mountain', sun: 'sun', moon: 'moon', compass: 'compass', trophy: 'trophy',
};

// A rounded hexagon on a 100x100 grid, with a smaller one inside.
const HEX = 'M50 4 L88 26 Q91 28 91 32 L91 68 Q91 72 88 74 L50 96 L12 74 Q9 72 9 68 L9 32 Q9 28 12 26 Z';
const INNER = 'M50 15 L80 32 L80 68 L50 85 L20 68 L20 32 Z';

/** Original hexagon medal: tier colour rim, night-blue face, line icon. Locked medals are muted. */
export function BadgeMedal({ tier, icon, size = 64, locked = false, id }: { tier: BadgeTier; icon: BadgeIcon; size?: number; locked?: boolean; id: string }) {
  const c = TIER_COLOR[tier];
  const gid = `rim-${id}`;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center', opacity: locked ? 0.85 : 1 }}>
      <Svg width={size} height={size} viewBox="0 0 100 100" style={{ position: 'absolute', top: 0, left: 0 }}>
        <Defs>
          <LinearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={locked ? Colors.surfaceRaised : c.light} />
            <Stop offset="1" stopColor={locked ? Colors.surface : c.dark} />
          </LinearGradient>
        </Defs>
        <Path d={HEX} fill={`url(#${gid})`} stroke={locked ? Colors.textSecondary : c.dark} strokeOpacity={locked ? 0.35 : 1} strokeWidth={2} />
        <Path d={INNER} fill={Colors.bg} stroke={locked ? Colors.border : c.light} strokeOpacity={0.5} strokeWidth={1.5} />
      </Svg>
      <View style={{ zIndex: 1 }}>
        <Icon name={ICON[icon]} size={size * 0.38} color={locked ? Colors.textSecondary : c.light} strokeWidth={2.2} />
      </View>
    </View>
  );
}
