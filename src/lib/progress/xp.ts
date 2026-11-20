/**
 * XP and levels. Everything is derived from saved activities on the device,
 * so the same activities always give the same XP (no server needed).
 */
import type { Sport } from '../types';

/** XP per kilometre. Rides cover ground faster, so a kilometre is worth less. */
export const XP_PER_KM: Record<Sport, number> = { walk: 30, run: 30, ride: 10 };
export const XP_PER_ACTIVITY = 25;
/** One XP for every 10 m climbed. */
export const XP_PER_10M_CLIMB = 1;

export function xpForActivity(a: { sport: Sport; distanceM: number; elevationGainM?: number | null }): number {
  const km = Math.max(0, a.distanceM) / 1000;
  const climb = Math.max(0, a.elevationGainM ?? 0);
  return Math.round(XP_PER_ACTIVITY + km * XP_PER_KM[a.sport] + Math.floor(climb / 10) * XP_PER_10M_CLIMB);
}

/**
 * Total XP needed to reach a level. Each level takes 250 XP more than the one before:
 * level 2 at 500, level 3 at 1,250, level 4 at 2,250, level 10 at 13,500.
 * Same formula as the Firestore rules: 125 * (L - 1) * (L + 2).
 */
export function xpToReach(level: number): number {
  return 125 * (level - 1) * (level + 2);
}

export function levelForXp(xp: number): { level: number; intoLevel: number; perLevel: number; nextAt: number } {
  const x = Math.max(0, Math.floor(xp));
  let level = Math.max(1, Math.floor((-1 + Math.sqrt(9 + (4 * x) / 125)) / 2) + 1);
  while (xpToReach(level + 1) <= x) level++;
  while (level > 1 && xpToReach(level) > x) level--;
  const base = xpToReach(level);
  const nextAt = xpToReach(level + 1);
  return { level, intoLevel: x - base, perLevel: nextAt - base, nextAt };
}

const TITLES: [number, string][] = [
  [30, 'Apex'],
  [20, 'High Altitude'],
  [15, 'Skyline'],
  [11, 'Peak Chaser'],
  [8, 'Summit Seeker'],
  [5, 'Ridge Walker'],
  [3, 'Pathfinder'],
  [1, 'Trailhead'],
];

export function levelTitle(level: number): string {
  return TITLES.find(([min]) => level >= min)![1];
}
