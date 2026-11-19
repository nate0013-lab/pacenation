/**
 * PaceNation design tokens.
 * Palette: deep "Summit Night" navy surfaces, "Altitude Teal" as the brand
 * accent and "Sunrise Gold" for achievements and highlights.
 */
import { Platform } from 'react-native';

export const Colors = {
  bg: '#07111F',
  surface: '#0E1C2F',
  surfaceRaised: '#15283F',
  border: '#22385391',
  borderStrong: '#2E4A6B',
  text: '#F4F7FB',
  textSecondary: '#A5B4C8',
  textMuted: '#6E819A',
  primary: '#19D3B5',
  primaryDeep: '#0E9E88',
  onPrimary: '#03221D',
  gold: '#FFC94A',
  onGold: '#2A1D00',
  danger: '#FF6B6B',
  success: '#4ADE80',
  walk: '#7DD3FC',
  run: '#19D3B5',
  ride: '#FFC94A',
  overlay: 'rgba(3, 9, 18, 0.72)',
} as const;

export const Spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 } as const;
export const Radius = { sm: 8, md: 12, lg: 16, xl: 24, pill: 999 } as const;

export const FontFamily = Platform.select({
  ios: { regular: 'System', display: 'System' },
  android: { regular: 'sans-serif', display: 'sans-serif-condensed' },
  default: {
    regular: 'Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
    display: 'Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
  },
})!;

export const Type = {
  hero: { fontSize: 34, lineHeight: 40, fontWeight: '800' as const, letterSpacing: -0.5 },
  title: { fontSize: 26, lineHeight: 32, fontWeight: '800' as const, letterSpacing: -0.3 },
  heading: { fontSize: 19, lineHeight: 24, fontWeight: '700' as const },
  body: { fontSize: 16, lineHeight: 22, fontWeight: '400' as const },
  bodyStrong: { fontSize: 16, lineHeight: 22, fontWeight: '600' as const },
  small: { fontSize: 14, lineHeight: 19, fontWeight: '400' as const },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '600' as const, letterSpacing: 0.6 },
  stat: { fontSize: 28, lineHeight: 32, fontWeight: '800' as const, letterSpacing: -0.5 },
};

export const MaxContentWidth = 640;
