/**
 * Leaderboards without a server. Each person's device writes its own entry
 * on every board it belongs to (this week, this month and all time, for each
 * sport and for all sports together). Boards are read sorted by distance.
 */
import { Timestamp, collection, doc, getCountFromServer, onSnapshot, orderBy, query, serverTimestamp, where, limit, writeBatch } from 'firebase/firestore';

import { db } from './firebase';
import { isoWeekKey, monthKey } from './format';
import type { Sport, UserProfile } from './types';

export type BoardPeriod = 'week' | 'month' | 'all';
export type BoardSport = Sport | 'any';
export const BOARD_SPORTS: BoardSport[] = ['any', 'walk', 'run', 'ride'];
export const BOARD_PERIODS: BoardPeriod[] = ['week', 'month', 'all'];

export function boardId(period: BoardPeriod, sport: BoardSport, now: Date = new Date()): string {
  if (period === 'week') return `week-${isoWeekKey(now)}-${sport}`;
  if (period === 'month') return `month-${monthKey(now)}-${sport}`;
  return `all-time-${sport}`;
}

export interface BoardRow {
  board: string;
  distanceM: number;
  count: number;
}

export interface BoardEntry {
  uid: string;
  displayName: string;
  username: string;
  level: number;
  distanceM: number;
  count: number;
  updatedAt: number;
}

/** My totals for every current board. */
export function myBoardRows(acts: { sport: Sport; distanceM: number; startedAt: { toMillis(): number } }[], now: Date = new Date()): BoardRow[] {
  const week = isoWeekKey(now);
  const month = monthKey(now);
  const rows = new Map<string, BoardRow>();
  for (const p of BOARD_PERIODS) for (const s of BOARD_SPORTS) rows.set(boardId(p, s, now), { board: boardId(p, s, now), distanceM: 0, count: 0 });
  for (const a of acts) {
    const d = new Date(a.startedAt.toMillis());
    const periods: BoardPeriod[] = ['all'];
    if (isoWeekKey(d) === week) periods.push('week');
    if (monthKey(d) === month) periods.push('month');
    for (const p of periods) {
      for (const s of ['any', a.sport] as BoardSport[]) {
        const r = rows.get(boardId(p, s, now))!;
        r.distanceM += a.distanceM;
        r.count += 1;
      }
    }
  }
  return [...rows.values()].map((r) => ({ ...r, distanceM: Math.round(r.distanceM) }));
}

/** Writes my entries, or removes them when I have opted out of leaderboards. Boards with no distance are skipped. */
export async function syncBoards(me: UserProfile, rows: BoardRow[], show: boolean): Promise<void> {
  const b = writeBatch(db);
  for (const r of rows) {
    const ref = doc(db, 'leaderboards', r.board, 'entries', me.uid);
    if (!show || r.distanceM <= 0) b.delete(ref);
    else
      b.set(ref, {
        displayName: me.displayName,
        username: me.username,
        level: me.level,
        distanceM: r.distanceM,
        count: r.count,
        updatedAt: serverTimestamp(),
      });
  }
  await b.commit();
}

export function watchBoard(board: string, cb: (list: BoardEntry[]) => void, onError?: () => void, max = 50): () => void {
  return onSnapshot(
    query(collection(db, 'leaderboards', board, 'entries'), orderBy('distanceM', 'desc'), limit(max)),
    (snap) =>
      cb(
        snap.docs.map((d) => {
          const x = d.data();
          return { uid: d.id, displayName: x.displayName, username: x.username, level: x.level ?? 1, distanceM: x.distanceM ?? 0, count: x.count ?? 0, updatedAt: (x.updatedAt as Timestamp | null)?.toMillis() ?? 0 };
        }),
      ),
    () => onError?.(),
  );
}

export async function boardRank(board: string, distanceM: number): Promise<{ rank: number; total: number }> {
  const col = collection(db, 'leaderboards', board, 'entries');
  const [ahead, total] = await Promise.all([getCountFromServer(query(col, where('distanceM', '>', distanceM))), getCountFromServer(col)]);
  return { rank: ahead.data().count + 1, total: total.data().count };
}
