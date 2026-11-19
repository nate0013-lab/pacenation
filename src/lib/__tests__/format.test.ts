import { describe, expect, test } from '@jest/globals';
import { formatDistanceKm, formatDuration, formatPace, formatSpeedKmh, greeting, isoWeekKey, levelForXp, monthKey } from '../format';

describe('format', () => {
  test('distance in km with sensible precision', () => {
    expect(formatDistanceKm(0)).toBe('0.00');
    expect(formatDistanceKm(5234)).toBe('5.23');
    expect(formatDistanceKm(42195)).toBe('42.2');
    expect(formatDistanceKm(160934)).toBe('161');
    expect(formatDistanceKm(25000, 0)).toBe('25');
  });

  test('duration', () => {
    expect(formatDuration(0)).toBe('0:00');
    expect(formatDuration(65)).toBe('1:05');
    expect(formatDuration(3725)).toBe('1:02:05');
  });

  test('pace and speed', () => {
    expect(formatPace(312)).toBe('5:12');
    expect(formatPace(0)).toBe('--:--');
    expect(formatPace(null)).toBe('--:--');
    expect(formatPace(Infinity)).toBe('--:--');
    expect(formatSpeedKmh(5)).toBe('18.0');
  });

  test('greeting by hour', () => {
    expect(greeting(new Date(2026, 0, 1, 7))).toBe('Good morning');
    expect(greeting(new Date(2026, 0, 1, 14))).toBe('Good afternoon');
    expect(greeting(new Date(2026, 0, 1, 21))).toBe('Good evening');
  });

  test('ISO week and month keys', () => {
    expect(isoWeekKey(new Date(2026, 10, 19))).toBe('2026-W47');
    expect(isoWeekKey(new Date(2027, 0, 1))).toBe('2026-W53');
    expect(isoWeekKey(new Date(2026, 0, 1))).toBe('2026-W01');
    expect(monthKey(new Date(2026, 10, 19))).toBe('2026-11');
  });

  test('levels every 1000 XP', () => {
    expect(levelForXp(0)).toEqual({ level: 1, intoLevel: 0, perLevel: 1000 });
    expect(levelForXp(2350)).toEqual({ level: 3, intoLevel: 350, perLevel: 1000 });
  });
});
