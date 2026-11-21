import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { timeAgo } from '../format';

describe('timeAgo', () => {
  const now = Date.UTC(2026, 10, 21, 12, 0, 0);
  it('reads naturally', () => {
    expect(timeAgo(now - 10_000, now)).toBe('just now');
    expect(timeAgo(now - 5 * 60_000, now)).toBe('5 min ago');
    expect(timeAgo(now - 3 * 3600_000, now)).toBe('3 h ago');
    expect(timeAgo(now - 2 * 86400_000, now)).toBe('2 d ago');
    expect(timeAgo(now - 30 * 86400_000, now)).toMatch(/Oct/);
  });
});

describe('social sign-in config', () => {
  const saved = { ...process.env };
  afterEach(() => {
    process.env = { ...saved };
    jest.resetModules();
  });

  it('has Google on the web, and hides phone Google and Apple until configured', () => {
    delete process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
    delete process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;
    delete process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
    delete process.env.EXPO_PUBLIC_APPLE_SIGN_IN;
    const c = require('../social-auth-config');
    expect(c.googleEnabled('web')).toBe(true);
    expect(c.googleEnabled('android')).toBe(false);
    expect(c.googleEnabled('ios')).toBe(false);
    expect(c.appleEnabled('ios')).toBe(false);
  });

  it('needs a platform client ID on phones', () => {
    process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID = 'web.apps.googleusercontent.com';
    process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID = 'android.apps.googleusercontent.com';
    process.env.EXPO_PUBLIC_APPLE_SIGN_IN = '1';
    const c = require('../social-auth-config');
    expect(c.googleEnabled('web')).toBe(true);
    expect(c.googleEnabled('android')).toBe(true);
    expect(c.googleEnabled('ios')).toBe(false);
    expect(c.appleEnabled('ios')).toBe(true);
    expect(c.appleEnabled('android')).toBe(false);
  });
});
