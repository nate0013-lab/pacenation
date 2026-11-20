import type { ViewStyle } from 'react-native';

import type { LatLng } from '@/lib/tracking/geo';

export interface RouteMapProps {
  points: LatLng[];
  /** Live position (blue dot) while tracking. */
  current?: LatLng | null;
  /** Keep the camera on the current position. */
  follow?: boolean;
  showEndpoints?: boolean;
  color?: string;
  height?: number;
  style?: ViewStyle;
  interactive?: boolean;
}
