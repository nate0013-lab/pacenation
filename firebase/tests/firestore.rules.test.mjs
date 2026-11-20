// Firestore rules tests. Run with: npm test (inside /firebase), which starts the emulator.
import { after, before, beforeEach, describe, test } from 'node:test';
import { readFileSync } from 'node:fs';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  Timestamp,
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';

let env;
const PRIVACY = { profileVisibility: 'public', activityVisibility: 'followers', showOnLeaderboards: true };

function card(username, extra = {}) {
  return {
    username,
    usernameLower: username.toLowerCase(),
    displayName: 'Test Athlete',
    bio: '',
    photoURL: null,
    xp: 0,
    level: 1,
    followerCount: 0,
    followingCount: 0,
    privacy: PRIVACY,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    ...extra,
  };
}

async function createProfile(db, uid, username, extra) {
  const b = writeBatch(db);
  b.set(doc(db, 'usernames', username.toLowerCase()), { uid });
  b.set(doc(db, 'users', uid), card(username, extra));
  return b.commit();
}

/** Seed data bypassing rules. */
async function seed(fn) {
  await env.withSecurityRulesDisabled(async (ctx) => fn(ctx.firestore()));
}

function activity(ownerId, visibility, extra = {}) {
  const start = Timestamp.fromMillis(Date.now() - 3600_000);
  return {
    ownerId,
    sport: 'run',
    title: 'Morning run',
    visibility,
    distanceM: 5000,
    movingTimeS: 1500,
    elapsedTimeS: 1600,
    startedAt: start,
    endedAt: Timestamp.fromMillis(Date.now() - 600_000),
    likeCount: 0,
    commentCount: 0,
    ...extra,
  };
}

before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-pacenation',
    firestore: { rules: readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8') },
  });
});
after(async () => env?.cleanup());
beforeEach(async () => env.clearFirestore());

const as = (uid, token) => env.authenticatedContext(uid, token).firestore();
const anon = () => env.unauthenticatedContext().firestore();

describe('profiles and usernames', () => {
  test('a user can create their own profile with a reserved username', async () => {
    await assertSucceeds(createProfile(as('alice'), 'alice', 'Alice_Runs'));
  });

  test('profile creation fails without reserving the username', async () => {
    await assertFails(setDoc(doc(as('alice'), 'users', 'alice'), card('alice')));
  });

  test('cannot create a profile for someone else', async () => {
    const db = as('mallory');
    const b = writeBatch(db);
    b.set(doc(db, 'usernames', 'alice'), { uid: 'alice' });
    b.set(doc(db, 'users', 'alice'), card('alice'));
    await assertFails(b.commit());
  });

  test('cannot claim a username someone else owns', async () => {
    await createProfile(as('alice'), 'alice', 'alice');
    await assertFails(createProfile(as('bob'), 'bob', 'alice'));
  });

  test('cannot start with extra XP or followers', async () => {
    await assertFails(createProfile(as('alice'), 'alice', 'alice', { xp: 5000 }));
    await assertFails(createProfile(as('alice'), 'alice', 'alice', { followerCount: 99 }));
  });

  test('profile photos may be small JPEG data URLs or https links only', async () => {
    const jpeg = 'data:image/jpeg;base64,' + 'A'.repeat(30000);
    await assertSucceeds(createProfile(as('alice'), 'alice', 'alice', { photoURL: jpeg }));
    await assertFails(createProfile(as('bob'), 'bob', 'bob', { photoURL: 'javascript:alert(1)' }));
    await assertFails(createProfile(as('carol'), 'carol', 'carol', { photoURL: 'data:image/jpeg;base64,' + 'A'.repeat(250000) }));
  });

  test('invalid usernames are rejected', async () => {
    await assertFails(createProfile(as('alice'), 'alice', 'a!'));
    await assertFails(createProfile(as('alice'), 'alice', 'ab'));
  });

  test('owner can edit name, bio and privacy but not xp or level', async () => {
    await createProfile(as('alice'), 'alice', 'alice');
    const db = as('alice');
    await assertSucceeds(
      updateDoc(doc(db, 'users', 'alice'), {
        displayName: 'Alice R',
        bio: 'Hills',
        privacy: { ...PRIVACY, profileVisibility: 'private' },
        updatedAt: serverTimestamp(),
      }),
    );
    await assertFails(updateDoc(doc(db, 'users', 'alice'), { xp: 100000, updatedAt: serverTimestamp() }));
    await assertFails(updateDoc(doc(db, 'users', 'alice'), { level: 50, updatedAt: serverTimestamp() }));
  });

  test('others cannot edit my profile', async () => {
    await createProfile(as('alice'), 'alice', 'alice');
    await assertFails(updateDoc(doc(as('bob'), 'users', 'alice'), { bio: 'hacked', updatedAt: serverTimestamp() }));
  });

  test('renaming moves the username reservation atomically', async () => {
    await createProfile(as('alice'), 'alice', 'alice');
    const db = as('alice');
    const b = writeBatch(db);
    b.delete(doc(db, 'usernames', 'alice'));
    b.set(doc(db, 'usernames', 'alice2'), { uid: 'alice' });
    b.update(doc(db, 'users', 'alice'), { username: 'alice2', usernameLower: 'alice2', updatedAt: serverTimestamp() });
    await assertSucceeds(b.commit());
  });

  test('a username cannot be released while the profile still uses it', async () => {
    await createProfile(as('alice'), 'alice', 'alice');
    await assertFails(deleteDoc(doc(as('alice'), 'usernames', 'alice')));
  });

  test('account deletion batch removes profile and username together', async () => {
    await createProfile(as('alice'), 'alice', 'alice');
    const db = as('alice');
    const b = writeBatch(db);
    b.delete(doc(db, 'users', 'alice', 'private', 'settings'));
    b.delete(doc(db, 'usernames', 'alice'));
    b.delete(doc(db, 'users', 'alice'));
    await assertSucceeds(b.commit());
  });

  test('profile cards need sign-in to read', async () => {
    await createProfile(as('alice'), 'alice', 'alice');
    await assertSucceeds(getDoc(doc(as('bob'), 'users', 'alice')));
    await assertFails(getDoc(doc(anon(), 'users', 'alice')));
  });

  test('private settings are owner-only', async () => {
    const mine = doc(as('alice'), 'users', 'alice', 'private', 'settings');
    await assertSucceeds(setDoc(mine, { email: 'a@example.com', weightKg: 70, units: 'metric', notifications: {} }));
    await assertFails(getDoc(doc(as('bob'), 'users', 'alice', 'private', 'settings')));
    await assertFails(setDoc(mine, { email: 'a@example.com', weightKg: 900, units: 'metric', notifications: {} }));
  });
});

describe('privacy of stats', () => {
  async function seedUser(uid, profileVisibility) {
    await seed(async (db) => {
      await setDoc(doc(db, 'users', uid), { ...card(uid), privacy: { ...PRIVACY, profileVisibility }, createdAt: null, updatedAt: null });
      await setDoc(doc(db, 'stats', uid), { totals: { distanceM: 1000, movingTimeS: 300, count: 1 } });
    });
  }

  test('public stats are readable by any signed-in user', async () => {
    await seedUser('alice', 'public');
    await assertSucceeds(getDoc(doc(as('bob'), 'stats', 'alice')));
  });

  test('followers-only stats need a follow edge', async () => {
    await seedUser('alice', 'followers');
    await assertFails(getDoc(doc(as('bob'), 'stats', 'alice')));
    await seed((db) => setDoc(doc(db, 'users', 'alice', 'followers', 'bob'), { createdAt: Timestamp.now() }));
    await assertSucceeds(getDoc(doc(as('bob'), 'stats', 'alice')));
  });

  test('private stats are visible only to the owner', async () => {
    await seedUser('alice', 'private');
    await seed((db) => setDoc(doc(db, 'users', 'alice', 'followers', 'bob'), { createdAt: Timestamp.now() }));
    await assertFails(getDoc(doc(as('bob'), 'stats', 'alice')));
    await assertSucceeds(getDoc(doc(as('alice'), 'stats', 'alice')));
  });

  test('nobody can write stats from a device', async () => {
    await seedUser('alice', 'public');
    await assertFails(setDoc(doc(as('alice'), 'stats', 'alice'), { totals: { distanceM: 1e9 } }));
  });
});

describe('follows', () => {
  beforeEach(async () => {
    await seed(async (db) => {
      await setDoc(doc(db, 'users', 'alice'), { ...card('alice'), createdAt: null, updatedAt: null });
      await setDoc(doc(db, 'users', 'bob'), { ...card('bob'), createdAt: null, updatedAt: null });
    });
  });

  test('following writes both edges in one batch', async () => {
    const db = as('bob');
    const b = writeBatch(db);
    b.set(doc(db, 'users', 'bob', 'following', 'alice'), { createdAt: serverTimestamp() });
    b.set(doc(db, 'users', 'alice', 'followers', 'bob'), { createdAt: serverTimestamp() });
    await assertSucceeds(b.commit());
  });

  test('cannot add a follower edge on behalf of someone else', async () => {
    await assertFails(setDoc(doc(as('mallory'), 'users', 'alice', 'followers', 'bob'), { createdAt: serverTimestamp() }));
  });

  test('cannot follow yourself', async () => {
    const db = as('bob');
    const b = writeBatch(db);
    b.set(doc(db, 'users', 'bob', 'following', 'bob'), { createdAt: serverTimestamp() });
    b.set(doc(db, 'users', 'bob', 'followers', 'bob'), { createdAt: serverTimestamp() });
    await assertFails(b.commit());
  });
});

describe('activities', () => {
  beforeEach(async () => {
    await seed(async (db) => {
      await setDoc(doc(db, 'activities', 'pub'), activity('alice', 'public'));
      await setDoc(doc(db, 'activities', 'fol'), activity('alice', 'followers'));
      await setDoc(doc(db, 'activities', 'priv'), activity('alice', 'private'));
      await setDoc(doc(db, 'users', 'alice', 'followers', 'carol'), { createdAt: Timestamp.now() });
    });
  });

  test('visibility is enforced on reads', async () => {
    await assertSucceeds(getDoc(doc(as('bob'), 'activities', 'pub')));
    await assertFails(getDoc(doc(as('bob'), 'activities', 'fol')));
    await assertSucceeds(getDoc(doc(as('carol'), 'activities', 'fol')));
    await assertFails(getDoc(doc(as('carol'), 'activities', 'priv')));
    await assertSucceeds(getDoc(doc(as('alice'), 'activities', 'priv')));
    await assertFails(getDoc(doc(anon(), 'activities', 'pub')));
  });

  test('owners create valid activities only', async () => {
    await assertSucceeds(setDoc(doc(as('alice'), 'activities', 'new'), activity('alice', 'public')));
    await assertFails(setDoc(doc(as('bob'), 'activities', 'fake'), activity('alice', 'public')));
    await assertFails(setDoc(doc(as('alice'), 'activities', 'liked'), activity('alice', 'public', { likeCount: 500 })));
    await assertFails(setDoc(doc(as('alice'), 'activities', 'far'), activity('alice', 'public', { distanceM: 5e6 })));
  });

  test('an activity and its GPS points save together in one batch', async () => {
    const db = as('alice');
    const b = writeBatch(db);
    b.set(doc(db, 'activities', 'batch1'), activity('alice', 'followers'));
    b.set(doc(db, 'activities', 'batch1', 'routeChunks', '0000'), { index: 0, points: [{ la: 1, ln: 2, al: null, t: 1, ac: 5, sg: 0 }] });
    await assertSucceeds(b.commit());
    // nobody else can add points to it
    await assertFails(setDoc(doc(as('bob'), 'activities', 'batch1', 'routeChunks', '0001'), { index: 1, points: [] }));
  });

  test('owners can retitle but not change distance', async () => {
    await assertSucceeds(updateDoc(doc(as('alice'), 'activities', 'pub'), { title: 'Sunrise 5K' }));
    await assertFails(updateDoc(doc(as('alice'), 'activities', 'pub'), { distanceM: 42195 }));
    await assertFails(updateDoc(doc(as('bob'), 'activities', 'pub'), { title: 'mine now' }));
  });

  test('likes and comments follow activity visibility', async () => {
    await assertSucceeds(setDoc(doc(as('bob'), 'activities', 'pub', 'likes', 'bob'), { createdAt: serverTimestamp() }));
    await assertFails(setDoc(doc(as('bob'), 'activities', 'fol', 'likes', 'bob'), { createdAt: serverTimestamp() }));
    await assertFails(setDoc(doc(as('bob'), 'activities', 'pub', 'likes', 'carol'), { createdAt: serverTimestamp() }));
    await assertSucceeds(
      setDoc(doc(as('bob'), 'activities', 'pub', 'comments', 'c1'), { authorId: 'bob', text: 'Great pace!', createdAt: serverTimestamp() }),
    );
    await assertFails(
      setDoc(doc(as('bob'), 'activities', 'pub', 'comments', 'c2'), { authorId: 'bob', text: '', createdAt: serverTimestamp() }),
    );
    await assertSucceeds(deleteDoc(doc(as('alice'), 'activities', 'pub', 'comments', 'c1')));
  });

  test('route points are hidden with the activity', async () => {
    await seed((db) => setDoc(doc(db, 'activities', 'priv', 'routeChunks', '0'), { index: 0, points: [] }));
    await assertFails(getDoc(doc(as('carol'), 'activities', 'priv', 'routeChunks', '0')));
    await assertSucceeds(getDoc(doc(as('alice'), 'activities', 'priv', 'routeChunks', '0')));
  });
});

describe('challenges, leaderboards and events', () => {
  beforeEach(async () => {
    await seed(async (db) => {
      await setDoc(doc(db, 'challenges', 'open'), { title: 'Week 47 Run 25K', endsAt: Timestamp.fromMillis(Date.now() + 86400_000) });
      await setDoc(doc(db, 'challenges', 'done'), { title: 'Old', endsAt: Timestamp.fromMillis(Date.now() - 86400_000) });
      await setDoc(doc(db, 'events', 'e1'), { title: 'Trail 10K', startsAt: Timestamp.fromMillis(Date.now() + 7 * 86400_000) });
    });
  });

  test('users join open challenges with zero progress only', async () => {
    const join = { joinedAt: serverTimestamp(), progressM: 0, displayName: 'Bob', photoURL: null };
    await assertSucceeds(setDoc(doc(as('bob'), 'challenges', 'open', 'participants', 'bob'), join));
    await assertFails(setDoc(doc(as('bob'), 'challenges', 'done', 'participants', 'bob'), join));
    await assertFails(setDoc(doc(as('carol'), 'challenges', 'open', 'participants', 'carol'), { ...join, progressM: 99999 }));
    await assertFails(setDoc(doc(as('carol'), 'challenges', 'open', 'participants', 'bob'), join));
  });

  test('only admins create challenges', async () => {
    await assertFails(setDoc(doc(as('bob'), 'challenges', 'x'), { title: 'Mine' }));
    await assertSucceeds(setDoc(doc(as('boss', { admin: true }), 'challenges', 'x'), { title: 'Official' }));
  });

  test('leaderboards are read-only from devices', async () => {
    await assertSucceeds(getDoc(doc(as('bob'), 'leaderboards', 'w-2026-47_run', 'entries', 'bob')));
    await assertFails(setDoc(doc(as('bob'), 'leaderboards', 'w-2026-47_run', 'entries', 'bob'), { distanceM: 1e9 }));
  });

  test('users register for upcoming events themselves', async () => {
    await assertSucceeds(setDoc(doc(as('bob'), 'events', 'e1', 'registrations', 'bob'), { registeredAt: serverTimestamp() }));
    await assertFails(setDoc(doc(as('bob'), 'events', 'e1', 'registrations', 'carol'), { registeredAt: serverTimestamp() }));
    await assertFails(setDoc(doc(as('bob'), 'events', 'e1'), { title: 'Edited' }));
  });

  test('notifications: owner reads and marks read, cannot create', async () => {
    await seed((db) => setDoc(doc(db, 'users', 'bob', 'notifications', 'n1'), { type: 'follow', read: false }));
    await assertSucceeds(updateDoc(doc(as('bob'), 'users', 'bob', 'notifications', 'n1'), { read: true }));
    await assertFails(updateDoc(doc(as('bob'), 'users', 'bob', 'notifications', 'n1'), { type: 'other' }));
    await assertFails(getDoc(doc(as('carol'), 'users', 'bob', 'notifications', 'n1')));
    await assertFails(setDoc(doc(as('bob'), 'users', 'bob', 'notifications', 'n2'), { type: 'fake' }));
  });
});
