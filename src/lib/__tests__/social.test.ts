import { describe, expect, jest, test } from '@jest/globals';
jest.mock('../firebase', () => ({ db: {} }));
import { visibleTo } from '../social-service';

describe('visibleTo', () => {
  test('owners see everything, followers see followers-only, others public only', () => {
    expect(visibleTo('a', 'a', false)).toEqual(['public', 'followers', 'private']);
    expect(visibleTo('b', 'a', true)).toEqual(['public', 'followers']);
    expect(visibleTo('c', 'a', false)).toEqual(['public']);
  });
});

import { validateEvent } from '../events-service';
jest.mock('../notifications-service', () => ({ notify: jest.fn() }));

describe('validateEvent', () => {
  const now = Date.now();
  const ok = { title: 'Sunday long run', description: '', sport: 'run' as const, startsAt: now + 86400_000, durationMin: 90, distanceM: 15000, meetingPoint: 'Main gate', location: null, capacity: 20 };
  test('accepts a good draft and explains bad ones', () => {
    expect(validateEvent(ok, now)).toBeNull();
    expect(validateEvent({ ...ok, title: 'ab' }, now)).toMatch(/title/);
    expect(validateEvent({ ...ok, meetingPoint: '' }, now)).toMatch(/meet/);
    expect(validateEvent({ ...ok, startsAt: now - 1 }, now)).toMatch(/future/);
    expect(validateEvent({ ...ok, capacity: 1 }, now)).toMatch(/Spaces/);
  });
});
