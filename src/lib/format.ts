/** Display helpers. Distances are stored in metres, times in seconds. */

export function formatDistanceKm(metres: number, digits?: number): string {
  const km = metres / 1000;
  const d = digits ?? (km >= 100 ? 0 : km >= 10 ? 1 : 2);
  return km.toFixed(d);
}

export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = h > 0 ? String(m).padStart(2, '0') : String(m);
  return h > 0 ? `${h}:${mm}:${String(sec).padStart(2, '0')}` : `${mm}:${String(sec).padStart(2, '0')}`;
}

/** Pace in seconds per km, shown as m:ss. Returns a placeholder when unknown. */
export function formatPace(secondsPerKm: number | null | undefined): string {
  if (!secondsPerKm || !Number.isFinite(secondsPerKm) || secondsPerKm <= 0 || secondsPerKm > 60 * 60) return '--:--';
  const total = Math.round(secondsPerKm);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

export function formatSpeedKmh(metresPerSecond: number): string {
  return (metresPerSecond * 3.6).toFixed(1);
}

export function greeting(date: Date = new Date()): string {
  const h = date.getHours();
  if (h < 5) return 'Good evening';
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

/** ISO week key such as `2026-W47`, matching the leaderboard period keys. */
export function isoWeekKey(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

export function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

/** XP needed to reach a level: 1000 XP per level, levels start at 1. */
export function levelForXp(xp: number): { level: number; intoLevel: number; perLevel: number } {
  const perLevel = 1000;
  const level = Math.floor(Math.max(0, xp) / perLevel) + 1;
  return { level, intoLevel: Math.max(0, xp) % perLevel, perLevel };
}
