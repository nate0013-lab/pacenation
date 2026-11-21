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
