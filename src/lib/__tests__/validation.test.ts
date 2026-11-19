import { describe, expect, test } from '@jest/globals';
import {
  authErrorMessage,
  normalizeUsername,
  parseWeight,
  validateBio,
  validateDisplayName,
  validateEmail,
  validatePassword,
  validatePasswordConfirm,
  validateUsername,
} from '../validation';

describe('validation', () => {
  test('email', () => {
    expect(validateEmail('')).toBeTruthy();
    expect(validateEmail('runner@')).toBeTruthy();
    expect(validateEmail(' runner@pace.app ')).toBeNull();
  });

  test('password needs 8 chars with a letter and a number', () => {
    expect(validatePassword('short1')).toBeTruthy();
    expect(validatePassword('allletters')).toBeTruthy();
    expect(validatePassword('12345678')).toBeTruthy();
    expect(validatePassword('trail2026')).toBeNull();
    expect(validatePasswordConfirm('a', 'b')).toBeTruthy();
    expect(validatePasswordConfirm('a', 'a')).toBeNull();
  });

  test('usernames are normalised and validated like the security rules', () => {
    expect(normalizeUsername(' @Trail_Alex ')).toBe('trail_alex');
    expect(validateUsername('@Trail_Alex')).toBeNull();
    expect(validateUsername('ab')).toBeTruthy();
    expect(validateUsername('a'.repeat(21))).toBeTruthy();
    expect(validateUsername('bad name')).toBeTruthy();
    expect(validateUsername('admin')).toBeTruthy();
  });

  test('name and bio limits', () => {
    expect(validateDisplayName('  ')).toBeTruthy();
    expect(validateDisplayName('x'.repeat(41))).toBeTruthy();
    expect(validateDisplayName('Alex Rivera')).toBeNull();
    expect(validateBio('x'.repeat(161))).toBeTruthy();
    expect(validateBio('Hills every Sunday')).toBeNull();
  });

  test('weight is optional and bounded', () => {
    expect(parseWeight('')).toEqual({ value: null, error: null });
    expect(parseWeight('72,5')).toEqual({ value: 72.5, error: null });
    expect(parseWeight('12').error).toBeTruthy();
    expect(parseWeight('abc').error).toBeTruthy();
  });

  test('auth errors become friendly messages', () => {
    expect(authErrorMessage({ code: 'auth/invalid-credential' })).toBe('Email or password is incorrect.');
    expect(authErrorMessage(new Error('PN:That username was just taken. Try another.'))).toBe('That username was just taken. Try another.');
    expect(authErrorMessage(new Error('boom'))).toBe('Something went wrong. Please try again.');
  });
});
