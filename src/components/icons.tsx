import Svg, { Circle, Path } from 'react-native-svg';

/** Original line icon set for PaceNation, drawn on a 24x24 grid. */
export type IconName =
  | 'home'
  | 'activity'
  | 'challenges'
  | 'community'
  | 'profile'
  | 'walk'
  | 'run'
  | 'ride'
  | 'settings'
  | 'camera'
  | 'chevron-right'
  | 'back'
  | 'lock'
  | 'mail'
  | 'logout'
  | 'shield'
  | 'trophy'
  | 'bell'
  | 'map';

const paths: Record<IconName, string[]> = {
  home: ['M3 11 L12 3.5 L21 11', 'M5.5 9.5 V20 H10 V14.5 H14 V20 H18.5 V9.5'],
  activity: ['M3 12 H7 L9.5 6 L14 18 L16.5 12 H21'],
  challenges: ['M7 4 H17 V9 A5 5 0 0 1 7 9 Z', 'M12 14 V18', 'M8 20.5 H16', 'M7 6 H4 V7.5 A3 3 0 0 0 7 10.5', 'M17 6 H20 V7.5 A3 3 0 0 1 17 10.5'],
  community: ['M2.5 20 A6.5 6.5 0 0 1 15.5 20', 'M16 13.7 A5.5 5.5 0 0 1 21.5 19'],
  profile: ['M4.5 21 A7.5 7.5 0 0 1 19.5 21'],
  walk: ['M12 8 L10 14 L13 17 L14 21', 'M10 14 L8 21', 'M11 9.5 L7.5 12', 'M12.5 9.5 L15.5 12.5'],
  run: ['M10.5 9 L8 15 L12 17 L11 21', 'M8 15 L4.5 16.5', 'M10.5 9 L14.5 9 L17 12', 'M10.5 9 L7 11'],
  ride: ['M6 17 L10 10 H15 L18 17', 'M10 10 L12.5 17 H6', 'M14 7 H16.5'],
  settings: ['M12 2.5 V5', 'M12 19 V21.5', 'M2.5 12 H5', 'M19 12 H21.5', 'M5.3 5.3 L7 7', 'M17 17 L18.7 18.7', 'M5.3 18.7 L7 17', 'M17 7 L18.7 5.3'],
  camera: ['M4 8 H7.5 L9 5.5 H15 L16.5 8 H20 V19 H4 Z'],
  'chevron-right': ['M9.5 5.5 L16 12 L9.5 18.5'],
  back: ['M14.5 5.5 L8 12 L14.5 18.5'],
  lock: ['M6 11 H18 V20.5 H6 Z', 'M8.5 11 V8 A3.5 3.5 0 0 1 15.5 8 V11'],
  mail: ['M3.5 6 H20.5 V18 H3.5 Z', 'M3.5 6.5 L12 13 L20.5 6.5'],
  logout: ['M14 4 H19.5 V20 H14', 'M10 8 L6 12 L10 16', 'M6 12 H15'],
  shield: ['M12 3 L19.5 6 V11.5 C19.5 16 16 19.5 12 21 C8 19.5 4.5 16 4.5 11.5 V6 Z', 'M8.5 12 L11 14.5 L15.5 10'],
  trophy: ['M7 4 H17 V9 A5 5 0 0 1 7 9 Z', 'M12 14 V18', 'M8 20.5 H16'],
  bell: ['M6 16.5 V11 A6 6 0 0 1 18 11 V16.5 L19.5 18 H4.5 Z', 'M10 20.5 H14'],
  map: ['M3.5 6 L9 4 L15 6 L20.5 4 V18 L15 20 L9 18 L3.5 20 Z', 'M9 4 V18', 'M15 6 V20'],
};

const circles: Partial<Record<IconName, [number, number, number][]>> = {
  community: [[9, 9, 3.6], [16.5, 8.5, 2.8]],
  profile: [[12, 8.5, 4]],
  walk: [[13, 5, 1.8]],
  run: [[13.5, 5.5, 1.8]],
  ride: [[6, 17, 3.5], [18, 17, 3.5]],
  settings: [[12, 12, 3.5]],
  camera: [[12, 13.2, 3.4]],
  map: [],
};

export function Icon({ name, size = 24, color = '#fff', strokeWidth = 1.9 }: { name: IconName; size?: number; color?: string; strokeWidth?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {paths[name].map((d) => (
        <Path key={d} d={d} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      ))}
      {(circles[name] ?? []).map(([cx, cy, r]) => (
        <Circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} stroke={color} strokeWidth={strokeWidth} />
      ))}
    </Svg>
  );
}
