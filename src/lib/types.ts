import type { Timestamp } from 'firebase/firestore';

export type Sport = 'walk' | 'run' | 'ride';
export const SPORTS: Sport[] = ['walk', 'run', 'ride'];
export const SPORT_LABEL: Record<Sport, string> = { walk: 'Walk', run: 'Run', ride: 'Ride' };

/** Who can see a profile's stats, or an activity. */
export type Visibility = 'public' | 'followers' | 'private';

export interface PrivacySettings {
  profileVisibility: Visibility;
  activityVisibility: Visibility;
  showOnLeaderboards: boolean;
}

export const DEFAULT_PRIVACY: PrivacySettings = {
  profileVisibility: 'public',
  activityVisibility: 'followers',
  showOnLeaderboards: true,
};

/** `users/{uid}`: the public profile card. */
export interface UserProfile {
  uid: string;
  username: string;
  usernameLower: string;
  displayName: string;
  bio: string;
  photoURL: string | null;
  xp: number;
  level: number;
  followerCount: number;
  followingCount: number;
  privacy: PrivacySettings;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

/** `users/{uid}/private/settings`: visible to the owner only. */
export interface PrivateSettings {
  email: string;
  weightKg: number | null;
  units: 'metric';
  notifications: {
    followers: boolean;
    likesAndComments: boolean;
    challenges: boolean;
    events: boolean;
    milestones: boolean;
  };
}

export interface SportTotals {
  distanceM: number;
  movingTimeS: number;
  count: number;
}

/** Totals summed from activities; the public copy lives in `stats/{uid}`. */
export interface UserStats {
  totals: SportTotals;
  bySport: Record<Sport, SportTotals>;
  week: { key: string; distanceM: number; count: number };
  month: { key: string; distanceM: number; count: number };
}

export const EMPTY_TOTALS: SportTotals = { distanceM: 0, movingTimeS: 0, count: 0 };

/** `activities/{id}` */
export interface Activity {
  id: string;
  ownerId: string;
  sport: Sport;
  title: string;
  visibility: Visibility;
  startedAt: Timestamp;
  endedAt: Timestamp;
  distanceM: number;
  movingTimeS: number;
  elapsedTimeS: number;
  avgSpeedMps: number;
  maxSpeedMps: number;
  avgPaceSPerKm: number | null;
  elevationGainM: number | null;
  calories: number;
  start: { lat: number; lng: number } | null;
  end: { lat: number; lng: number } | null;
  /** Simplified route as a Google encoded polyline, for previews. */
  polyline: string;
  pointCount: number;
  /** Fastest moving time (s) over set distances inside this activity, such as `{ '1k': 290, '5k': 1530 }`. */
  bestEfforts?: Partial<Record<string, number>>;
  likeCount: number;
  commentCount: number;
  createdAt: Timestamp | null;
}

/** A stored GPS point inside `activities/{id}/routeChunks/{n}`. Short keys keep documents small. */
export interface StoredPoint {
  la: number;
  ln: number;
  al: number | null;
  t: number;
  ac: number;
  sg: number;
}
