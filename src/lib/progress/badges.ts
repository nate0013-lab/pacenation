/**
 * Badge catalogue. Badges are worked out from the activity history on the
 * device: a badge's date is when the activity that unlocked it started.
 */
import type { Sport } from '../types';

export type BadgeTier = 'bronze' | 'silver' | 'gold';
export type BadgeIcon = 'flag' | 'route' | 'run' | 'walk' | 'ride' | 'flame' | 'calendar' | 'mountain' | 'sun' | 'moon' | 'compass' | 'trophy';

export const TIER_XP: Record<BadgeTier, number> = { bronze: 100, silver: 250, gold: 500 };

/** Running totals after each activity, oldest first. */
export interface Tally {
  count: number;
  distanceM: number;
  climbM: number;
  sports: Set<Sport>;
  bestStreak: number;
  /** The activity just added. */
  last: { sport: Sport; distanceM: number; climbM: number; hour: number };
  /** Longest single activity per sport, and the biggest single climb. */
  longest: Record<Sport, number>;
  biggestClimb: number;
  early: number;
  late: number;
  /** Individual challenges completed (worked out separately, see computeProgress). */
  challenges: number;
}

export interface BadgeDef {
  id: string;
  name: string;
  description: string;
  category: 'Milestones' | 'Distance' | 'Consistency' | 'Explorer' | 'Challenges';
  tier: BadgeTier;
  icon: BadgeIcon;
  /** Progress towards the badge as current / target, in the given unit. */
  progress: (t: Tally) => { current: number; target: number };
  unit?: 'km' | 'm' | 'days' | 'activities' | 'sports' | 'challenges';
}

const km = (m: number) => m / 1000;

function total(id: string, name: string, kmTarget: number, tier: BadgeTier): BadgeDef {
  return {
    id, name, tier, icon: 'route', category: 'Milestones', unit: 'km',
    description: `Cover ${kmTarget.toLocaleString('en')} km in total across all your activities.`,
    progress: (t) => ({ current: km(t.distanceM), target: kmTarget }),
  };
}
function single(id: string, name: string, sport: Sport, kmTarget: number, tier: BadgeTier, verb: string): BadgeDef {
  return {
    id, name, tier, icon: sport, category: 'Distance', unit: 'km',
    description: `${verb} ${kmTarget % 1 ? kmTarget.toFixed(1) : kmTarget} km or more in a single activity.`,
    progress: (t) => ({ current: km(t.longest[sport]), target: kmTarget }),
  };
}
function count(id: string, name: string, n: number, tier: BadgeTier): BadgeDef {
  return {
    id, name, tier, icon: 'flag', category: 'Consistency', unit: 'activities',
    description: `Save ${n} activities.`,
    progress: (t) => ({ current: t.count, target: n }),
  };
}
function streak(id: string, name: string, days: number, tier: BadgeTier): BadgeDef {
  return {
    id, name, tier, icon: 'flame', category: 'Consistency', unit: 'days',
    description: `Get out ${days} days in a row.`,
    progress: (t) => ({ current: t.bestStreak, target: days }),
  };
}

export const BADGES: BadgeDef[] = [
  { id: 'first-steps', name: 'First Steps', description: 'Save your first activity.', category: 'Milestones', tier: 'bronze', icon: 'flag', unit: 'activities', progress: (t) => ({ current: t.count, target: 1 }) },
  total('total-50', 'Fifty Up', 50, 'bronze'),
  total('total-100', 'Century Trail', 100, 'silver'),
  total('total-500', 'Long Haul', 500, 'silver'),
  total('total-1000', 'Thousand Club', 1000, 'gold'),
  single('run-5k', '5K Finisher', 'run', 5, 'bronze', 'Run'),
  single('run-10k', '10K Finisher', 'run', 10, 'silver', 'Run'),
  single('run-half', 'Half Marathoner', 'run', 21.0975, 'gold', 'Run'),
  single('run-full', 'Marathoner', 'run', 42.195, 'gold', 'Run'),
  single('walk-10k', 'Long Walker', 'walk', 10, 'bronze', 'Walk'),
  single('walk-20k', 'Trail Trekker', 'walk', 20, 'silver', 'Walk'),
  single('ride-50k', 'Half Century Ride', 'ride', 50, 'silver', 'Ride'),
  single('ride-100k', 'Century Ride', 'ride', 100, 'gold', 'Ride'),
  count('count-10', 'Regular', 10, 'bronze'),
  count('count-50', 'Committed', 50, 'silver'),
  count('count-100', 'Hundred Outings', 100, 'gold'),
  streak('streak-3', 'On a Roll', 3, 'bronze'),
  streak('streak-7', 'Week Unbroken', 7, 'silver'),
  streak('streak-30', 'Iron Habit', 30, 'gold'),
  { id: 'all-rounder', name: 'All-Rounder', description: 'Walk, run and ride at least once each.', category: 'Explorer', tier: 'silver', icon: 'compass', unit: 'sports', progress: (t) => ({ current: t.sports.size, target: 3 }) },
  { id: 'early-riser', name: 'Early Riser', description: 'Start an activity before 7 AM.', category: 'Explorer', tier: 'bronze', icon: 'sun', progress: (t) => ({ current: t.early, target: 1 }) },
  { id: 'night-owl', name: 'Night Owl', description: 'Start an activity after 9 PM.', category: 'Explorer', tier: 'bronze', icon: 'moon', progress: (t) => ({ current: t.late, target: 1 }) },
  { id: 'climb-500', name: 'Hill Seeker', description: 'Climb 500 m or more in a single activity.', category: 'Explorer', tier: 'silver', icon: 'mountain', unit: 'm', progress: (t) => ({ current: t.biggestClimb, target: 500 }) },
  { id: 'challenge-1', name: 'Challenge Accepted', description: 'Complete your first challenge.', category: 'Challenges', tier: 'bronze', icon: 'trophy', unit: 'challenges', progress: (t) => ({ current: t.challenges, target: 1 }) },
  { id: 'challenge-5', name: 'Challenge Hunter', description: 'Complete 5 challenges.', category: 'Challenges', tier: 'silver', icon: 'trophy', unit: 'challenges', progress: (t) => ({ current: t.challenges, target: 5 }) },
  { id: 'challenge-20', name: 'Challenge Champion', description: 'Complete 20 challenges.', category: 'Challenges', tier: 'gold', icon: 'trophy', unit: 'challenges', progress: (t) => ({ current: t.challenges, target: 20 }) },
  { id: 'climb-total-5000', name: 'Mountain Legs', description: 'Climb 5,000 m in total.', category: 'Explorer', tier: 'gold', icon: 'mountain', unit: 'm', progress: (t) => ({ current: t.climbM, target: 5000 }) },
];

export const BADGE_BY_ID: Record<string, BadgeDef> = Object.fromEntries(BADGES.map((b) => [b.id, b]));

export interface BadgeState {
  badge: BadgeDef;
  /** Epoch ms when earned, or null while locked. */
  earnedAt: number | null;
  /** Id of the activity that unlocked it. */
  activityId: string | null;
  current: number;
  target: number;
  ratio: number;
}

export function isEarned(b: BadgeDef, t: Tally): boolean {
  const p = b.progress(t);
  return p.current >= p.target - 1e-9;
}
