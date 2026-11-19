/** Pure validators shared by the screens. Each returns an error message or null. */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const USERNAME_RE = /^[a-z0-9_]{3,20}$/;
const RESERVED = new Set(['admin', 'pacenation', 'support', 'help', 'official', 'moderator', 'staff', 'root', 'system']);

export function validateEmail(email: string): string | null {
  const v = email.trim();
  if (!v) return 'Enter your email address.';
  if (!EMAIL_RE.test(v)) return 'That email address does not look right.';
  return null;
}

export function validatePassword(password: string): string | null {
  if (password.length < 8) return 'Use at least 8 characters.';
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) return 'Use at least one letter and one number.';
  return null;
}

export function validatePasswordConfirm(password: string, confirm: string): string | null {
  return password === confirm ? null : 'Passwords do not match.';
}

export function normalizeUsername(raw: string): string {
  return raw.trim().replace(/^@/, '').toLowerCase();
}

export function validateUsername(raw: string): string | null {
  const v = normalizeUsername(raw);
  if (v.length < 3) return 'Usernames need at least 3 characters.';
  if (v.length > 20) return 'Usernames can be at most 20 characters.';
  if (!USERNAME_RE.test(v)) return 'Use only letters, numbers and underscores.';
  if (RESERVED.has(v)) return 'That username is reserved.';
  return null;
}

export function validateDisplayName(name: string): string | null {
  const v = name.trim();
  if (!v) return 'Enter your name.';
  if (v.length > 40) return 'Keep your name under 40 characters.';
  return null;
}

export function validateBio(bio: string): string | null {
  return bio.trim().length > 160 ? 'Keep your bio under 160 characters.' : null;
}

/** Weight is optional and only used for calorie estimates. */
export function parseWeight(raw: string): { value: number | null; error: string | null } {
  const v = raw.trim().replace(',', '.');
  if (!v) return { value: null, error: null };
  const n = Number(v);
  if (!Number.isFinite(n) || n < 30 || n > 250) return { value: null, error: 'Enter a weight between 30 and 250 kg.' };
  return { value: Math.round(n * 10) / 10, error: null };
}

const AUTH_ERRORS: Record<string, string> = {
  'auth/invalid-email': 'That email address does not look right.',
  'auth/user-disabled': 'This account has been disabled.',
  'auth/user-not-found': 'Email or password is incorrect.',
  'auth/wrong-password': 'Email or password is incorrect.',
  'auth/invalid-credential': 'Email or password is incorrect.',
  'auth/email-already-in-use': 'An account with this email already exists. Try signing in.',
  'auth/weak-password': 'Choose a stronger password.',
  'auth/too-many-requests': 'Too many attempts. Wait a moment and try again.',
  'auth/network-request-failed': 'No connection. Check your internet and try again.',
  'auth/requires-recent-login': 'For your security, enter your password again.',
  'auth/missing-password': 'Enter your password.',
};

export function authErrorMessage(err: unknown): string {
  const code = typeof err === 'object' && err && 'code' in err ? String((err as { code: unknown }).code) : '';
  if (code && AUTH_ERRORS[code]) return AUTH_ERRORS[code];
  if (err instanceof Error && err.message.startsWith('PN:')) return err.message.slice(3);
  return 'Something went wrong. Please try again.';
}
