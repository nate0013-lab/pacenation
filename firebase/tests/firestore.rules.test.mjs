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
  collection,
  deleteDoc,
  getCountFromServer,
  getDocs,
  query,
  where,
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

  test('owner can edit name, bio and privacy, and xp only with a matching level', async () => {
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
    // 100000 XP is level 27, so level 1 does not match.
    await assertFails(updateDoc(doc(db, 'users', 'alice'), { xp: 100000, updatedAt: serverTimestamp() }));
    await assertFails(updateDoc(doc(db, 'users', 'alice'), { level: 50, updatedAt: serverTimestamp() }));
    await assertFails(updateDoc(doc(db, 'users', 'alice'), { xp: 499, level: 2, updatedAt: serverTimestamp() }));
    await assertFails(updateDoc(doc(db, 'users', 'alice'), { xp: -5, level: 1, updatedAt: serverTimestamp() }));
    await assertSucceeds(updateDoc(doc(db, 'users', 'alice'), { xp: 500, level: 2, updatedAt: serverTimestamp() }));
    await assertSucceeds(updateDoc(doc(db, 'users', 'alice'), { xp: 2350, level: 4, updatedAt: serverTimestamp() }));
    await assertFails(updateDoc(doc(db, 'users', 'alice'), { followerCount: 99, updatedAt: serverTimestamp() }));
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

  const summary = (extra = {}) => ({
    totals: { distanceM: 5000, movingTimeS: 1500, count: 1 },
    bySport: { walk: { distanceM: 0, movingTimeS: 0, count: 0 }, run: { distanceM: 5000, movingTimeS: 1500, count: 1 }, ride: { distanceM: 0, movingTimeS: 0, count: 0 } },
    week: { key: '2026-W47', distanceM: 5000, count: 1 },
    month: { key: '2026-11', distanceM: 5000, count: 1 },
    xp: 375,
    level: 1,
    badges: { 'first-steps': Date.now(), 'run-5k': Date.now() },
    records: { 'run-5k': 1500, 'run-longest': 5000 },
    currentStreak: 1,
    bestStreak: 1,
    updatedAt: serverTimestamp(),
    ...extra,
  });

  test('the owner keeps their own summary up to date', async () => {
    await seedUser('alice', 'public');
    await assertSucceeds(setDoc(doc(as('alice'), 'stats', 'alice'), summary()));
    await assertSucceeds(setDoc(doc(as('alice'), 'stats', 'alice'), summary({ xp: 600, level: 2 })));
    await assertSucceeds(deleteDoc(doc(as('alice'), 'stats', 'alice')));
  });

  test('nobody writes someone else\'s summary, or a malformed one', async () => {
    await seedUser('alice', 'public');
    await assertFails(setDoc(doc(as('bob'), 'stats', 'alice'), summary()));
    await assertFails(setDoc(doc(as('alice'), 'stats', 'alice'), { totals: { distanceM: 1e9 } }));
    await assertFails(setDoc(doc(as('alice'), 'stats', 'alice'), summary({ level: 9 })));
    await assertFails(setDoc(doc(as('alice'), 'stats', 'alice'), summary({ hacked: true })));
    await assertFails(setDoc(doc(as('alice'), 'stats', 'alice'), summary({ updatedAt: Timestamp.fromMillis(0) })));
    await assertFails(deleteDoc(doc(as('bob'), 'stats', 'alice')));
  });
});

describe('follows', () => {
  beforeEach(async () => {
    await seed(async (db) => {
      await setDoc(doc(db, 'users', 'alice'), { ...card('alice'), createdAt: null, updatedAt: null });
      await setDoc(doc(db, 'users', 'bob'), { ...card('bob'), createdAt: null, updatedAt: null });
      await setDoc(doc(db, 'users', 'priya'), { ...card('priya'), privacy: { ...PRIVACY, profileVisibility: 'followers' }, createdAt: null, updatedAt: null });
    });
  });
  const follow = (db, me, target) => {
    const b = writeBatch(db);
    b.set(doc(db, 'users', me, 'following', target), { createdAt: serverTimestamp() });
    b.set(doc(db, 'users', target, 'followers', me), { createdAt: serverTimestamp() });
    return b.commit();
  };

  test('public profiles: following writes both edges in one batch', async () => {
    await assertSucceeds(follow(as('bob'), 'bob', 'alice'));
    // and unfollowing removes both
    const db = as('bob');
    const b = writeBatch(db);
    b.delete(doc(db, 'users', 'bob', 'following', 'alice'));
    b.delete(doc(db, 'users', 'alice', 'followers', 'bob'));
    await assertSucceeds(b.commit());
  });

  test('a single edge on its own is refused', async () => {
    await assertFails(setDoc(doc(as('bob'), 'users', 'alice', 'followers', 'bob'), { createdAt: serverTimestamp() }));
    await assertFails(setDoc(doc(as('bob'), 'users', 'bob', 'following', 'alice'), { createdAt: serverTimestamp() }));
  });

  test('cannot add a follower edge on behalf of someone else', async () => {
    await assertFails(follow(as('mallory'), 'bob', 'alice'));
  });

  test('cannot follow yourself', async () => {
    await assertFails(follow(as('bob'), 'bob', 'bob'));
  });

  test('profiles that are not public need an approved request', async () => {
    await assertFails(follow(as('bob'), 'bob', 'priya'));
    await assertSucceeds(setDoc(doc(as('bob'), 'users', 'priya', 'followRequests', 'bob'), { createdAt: serverTimestamp() }));
    // the requester cannot approve their own request
    const sneaky = as('bob');
    const s1 = writeBatch(sneaky);
    s1.set(doc(sneaky, 'users', 'bob', 'following', 'priya'), { createdAt: serverTimestamp() });
    s1.set(doc(sneaky, 'users', 'priya', 'followers', 'bob'), { createdAt: serverTimestamp() });
    s1.delete(doc(sneaky, 'users', 'priya', 'followRequests', 'bob'));
    await assertFails(s1.commit());
    // the owner approves: both edges plus removing the request
    const db = as('priya');
    const b = writeBatch(db);
    b.set(doc(db, 'users', 'bob', 'following', 'priya'), { createdAt: serverTimestamp() });
    b.set(doc(db, 'users', 'priya', 'followers', 'bob'), { createdAt: serverTimestamp() });
    b.delete(doc(db, 'users', 'priya', 'followRequests', 'bob'));
    await assertSucceeds(b.commit());
  });

  test('approval without a request is refused', async () => {
    const db = as('priya');
    const b = writeBatch(db);
    b.set(doc(db, 'users', 'bob', 'following', 'priya'), { createdAt: serverTimestamp() });
    b.set(doc(db, 'users', 'priya', 'followers', 'bob'), { createdAt: serverTimestamp() });
    await assertFails(b.commit());
  });

  test('requests are visible only to the two people involved', async () => {
    await setDoc(doc(as('bob'), 'users', 'priya', 'followRequests', 'bob'), { createdAt: serverTimestamp() });
    await assertSucceeds(getDoc(doc(as('priya'), 'users', 'priya', 'followRequests', 'bob')));
    await assertSucceeds(getDoc(doc(as('bob'), 'users', 'priya', 'followRequests', 'bob')));
    await assertFails(getDoc(doc(as('alice'), 'users', 'priya', 'followRequests', 'bob')));
    await assertFails(setDoc(doc(as('alice'), 'users', 'priya', 'followRequests', 'bob'), { createdAt: serverTimestamp() }));
    await assertSucceeds(deleteDoc(doc(as('priya'), 'users', 'priya', 'followRequests', 'bob')));
  });

  test('the profile owner can remove a follower', async () => {
    await follow(as('bob'), 'bob', 'alice');
    const db = as('alice');
    const b = writeBatch(db);
    b.delete(doc(db, 'users', 'alice', 'followers', 'bob'));
    b.delete(doc(db, 'users', 'bob', 'following', 'alice'));
    await assertSucceeds(b.commit());
  });
});

describe('feed queries', () => {
  beforeEach(async () => {
    await seed(async (db) => {
      await setDoc(doc(db, 'activities', 'pub'), activity('alice', 'public'));
      await setDoc(doc(db, 'activities', 'fol'), activity('alice', 'followers'));
      await setDoc(doc(db, 'activities', 'priv'), activity('alice', 'private'));
      await setDoc(doc(db, 'users', 'alice', 'followers', 'carol'), { createdAt: Timestamp.now() });
    });
  });
  const visible = (db, owner, vis) => getDocs(query(collection(db, 'activities'), where('ownerId', '==', owner), where('visibility', 'in', vis)));

  test('a follower can list public and followers-only activities', async () => {
    const snap = await assertSucceeds(visible(as('carol'), 'alice', ['public', 'followers']));
    if (snap.size !== 2) throw new Error('expected 2, got ' + snap.size);
  });
  test('a stranger can list public activities only', async () => {
    await assertSucceeds(visible(as('bob'), 'alice', ['public']));
    await assertFails(visible(as('bob'), 'alice', ['public', 'followers']));
  });
  test('nobody else can list private activities', async () => {
    await assertFails(visible(as('carol'), 'alice', ['private']));
    await assertFails(getDocs(query(collection(as('carol'), 'activities'), where('ownerId', '==', 'alice'))));
  });
  test('likes and comments can be counted by anyone who can see the activity', async () => {
    await assertSucceeds(getCountFromServer(collection(as('bob'), 'activities', 'pub', 'likes')));
    await assertFails(getCountFromServer(collection(as('bob'), 'activities', 'fol', 'likes')));
    await assertSucceeds(getCountFromServer(collection(as('carol'), 'activities', 'fol', 'comments')));
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

  const entry = (extra = {}) => ({
    displayName: 'Bob', username: 'bob', progress: 0,
    endsAt: Timestamp.fromMillis(Date.now() + 3 * 86400_000), joinedAt: serverTimestamp(), updatedAt: serverTimestamp(), ...extra,
  });
  const join = (db, uid, id, extra) => {
    const b = writeBatch(db);
    b.set(doc(db, 'challenges', id, 'participants', uid), entry(extra));
    b.set(doc(db, 'users', uid, 'challenges', id), { joinedAt: serverTimestamp(), endsAt: Timestamp.fromMillis(Date.now() + 3 * 86400_000) });
    return b.commit();
  };

  test('people join catalogue challenges with zero progress, for themselves only', async () => {
    await assertSucceeds(join(as('bob'), 'bob', 'run-25-2026-W47'));
    await assertFails(join(as('carol'), 'carol', 'run-25-2026-W48', { progress: 99999 }));
    await assertFails(join(as('carol'), 'bob', 'run-25-2026-W48'));
    await assertFails(join(as('carol'), 'carol', 'not a challenge'));
    await assertFails(join(as('carol'), 'carol', 'run-25-2026-W49', { endsAt: Timestamp.fromMillis(Date.now() - 1000) }));
    await assertFails(setDoc(doc(as('carol'), 'users', 'carol', 'challenges', 'run-25-2026-W47'), { joinedAt: serverTimestamp(), endsAt: Timestamp.now() }));
  });

  test('progress is updated by its owner only, as a whole number', async () => {
    await join(as('bob'), 'bob', 'run-25-2026-W47');
    const ref = (db) => doc(db, 'challenges', 'run-25-2026-W47', 'participants', 'bob');
    await assertSucceeds(updateDoc(ref(as('bob')), { progress: 12500, updatedAt: serverTimestamp() }));
    await assertFails(updateDoc(ref(as('bob')), { progress: -5, updatedAt: serverTimestamp() }));
    await assertFails(updateDoc(ref(as('bob')), { progress: 12.5, updatedAt: serverTimestamp() }));
    await assertFails(updateDoc(ref(as('bob')), { endsAt: Timestamp.fromMillis(Date.now() + 90 * 86400_000), updatedAt: serverTimestamp() }));
    await assertFails(updateDoc(ref(as('carol')), { progress: 0, updatedAt: serverTimestamp() }));
    await assertSucceeds(getDoc(ref(as('carol'))));
  });

  test('progress stops syncing three days after a challenge ends', async () => {
    await seed((db) => setDoc(doc(db, 'challenges', 'run-25-2026-W40', 'participants', 'bob'), { ...entry({ endsAt: Timestamp.fromMillis(Date.now() - 4 * 86400_000) }), joinedAt: Timestamp.now(), updatedAt: Timestamp.now() }));
    await assertFails(updateDoc(doc(as('bob'), 'challenges', 'run-25-2026-W40', 'participants', 'bob'), { progress: 100, updatedAt: serverTimestamp() }));
  });

  test('only admins create challenge documents', async () => {
    await assertFails(setDoc(doc(as('bob'), 'challenges', 'x'), { title: 'Mine' }));
    await assertSucceeds(setDoc(doc(as('boss', { admin: true }), 'challenges', 'x'), { title: 'Official' }));
  });

  test('leaderboard entries: own entry only, and only when shown on leaderboards', async () => {
    await seed(async (db) => {
      await setDoc(doc(db, 'users', 'bob'), { ...card('bob'), createdAt: null, updatedAt: null });
      await setDoc(doc(db, 'users', 'hidden'), { ...card('hidden'), privacy: { ...PRIVACY, showOnLeaderboards: false }, createdAt: null, updatedAt: null });
    });
    const e = (extra = {}) => ({ displayName: 'Bob', username: 'bob', level: 2, distanceM: 12000, count: 2, updatedAt: serverTimestamp(), ...extra });
    await assertSucceeds(setDoc(doc(as('bob'), 'leaderboards', 'week-2026-W47-run', 'entries', 'bob'), e()));
    await assertSucceeds(getDoc(doc(as('carol'), 'leaderboards', 'week-2026-W47-run', 'entries', 'bob')));
    await assertFails(setDoc(doc(as('carol'), 'leaderboards', 'week-2026-W47-run', 'entries', 'bob'), e()));
    await assertFails(setDoc(doc(as('bob'), 'leaderboards', 'my-own-board', 'entries', 'bob'), e()));
    await assertFails(setDoc(doc(as('bob'), 'leaderboards', 'all-time-any', 'entries', 'bob'), e({ distanceM: 1.5 })));
    await assertFails(setDoc(doc(as('bob'), 'leaderboards', 'all-time-any', 'entries', 'bob'), e({ extra: 1 })));
    await assertFails(setDoc(doc(as('hidden'), 'leaderboards', 'all-time-any', 'entries', 'hidden'), e({ displayName: 'H', username: 'hidden' })));
    await assertSucceeds(deleteDoc(doc(as('hidden'), 'leaderboards', 'all-time-any', 'entries', 'hidden')));
    await assertFails(setDoc(doc(as('bob'), 'leaderboards', 'all-time-any'), { title: 'x' }));
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
