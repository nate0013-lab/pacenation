// Stage 5 walkthrough with two people: follow, follow requests, feed privacy, cheers, comments, ranking, removing a follower.

const { chromium } = require('playwright');
const OUT = process.argv[2];
const BASE = process.env.BASE_URL ?? 'http://localhost:8082';
const FS = 'http://127.0.0.1:8080/v1/projects/demo-pacenation/databases/(default)/documents';
const errors = [];
let n = 0;
function enc(v) {
  if (v === null) return { nullValue: null };
  if (v instanceof Date) return { timestampValue: v.toISOString() };
  if (typeof v === 'string') return { stringValue: v };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(enc) } };
  return { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k, x]) => [k, enc(x)])) } };
}
function dec(v) {
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('stringValue' in v) return v.stringValue;
  if ('mapValue' in v) return Object.fromEntries(Object.entries(v.mapValue.fields ?? {}).map(([k, x]) => [k, dec(x)]));
  if ('timestampValue' in v) return v.timestampValue;
  return null;
}
async function fsGet(path) {
  const r = await fetch(`${FS}/${path}`, { headers: { Authorization: 'Bearer owner' } });
  if (!r.ok) return null;
  return dec({ mapValue: (await r.json()) });
}
async function fsCreate(collection, id, data) {
  const r = await fetch(`${FS}/${collection}?documentId=${id}`, {
    method: 'POST',
    headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: enc(data).mapValue.fields }),
  });
  if (!r.ok) throw new Error('seed failed ' + (await r.text()));
}
function encodePolyline(pts) {
  let out = '', pl = 0, pg = 0;
  const e = (v) => { v = v < 0 ? ~(v << 1) : v << 1; let s = ''; while (v >= 0x20) { s += String.fromCharCode((0x20 | (v & 0x1f)) + 63); v >>= 5; } return s + String.fromCharCode(v + 63); };
  for (const [la, ln] of pts) { const a = Math.round(la * 1e5), b = Math.round(ln * 1e5); out += e(a - pl) + e(b - pg); pl = a; pg = b; }
  return out;
}
function loop(lat, lng, r, k = 24) {
  return Array.from({ length: k + 1 }, (_, i) => [lat + r * Math.sin((i / k) * 2 * Math.PI) * 0.7, lng + r * Math.cos((i / k) * 2 * Math.PI)]);
}


async function uidOf(email) {
  const r = await (await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: 'trail2026', returnSecureToken: true }) })).json();
  return r.localId;
}
async function seedActivity(uid, id, title, sport, km, visibility, hoursAgo, i) {
  const start = new Date(Date.now() - hoursAgo * 3600_000);
  const mov = Math.round(km * (sport === 'ride' ? 130 : 330));
  const pts = loop(-33.93 + i * 0.01, 18.41 + i * 0.01, 0.006);
  await fsCreate('activities', id, {
    ownerId: uid, sport, title, visibility, startedAt: start, endedAt: new Date(start.getTime() + mov * 1000 + 60000),
    distanceM: Math.round(km * 1000), movingTimeS: mov, elapsedTimeS: mov + 60, avgSpeedMps: (km * 1000) / mov, maxSpeedMps: (km * 1000) / mov * 1.3,
    avgPaceSPerKm: Math.round(mov / km), elevationGainM: 40, calories: Math.round(km * 60), start: null, end: null,
    polyline: encodePolyline(pts), pointCount: 0, likeCount: 0, commentCount: 0, createdAt: start,
  });
}

(async () => {
  const b = await chromium.launch();
  const mk = async (who) => {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
    const page = await ctx.newPage();
    page.on('console', (m) => m.type() === 'error' && !/400|403|PERMISSION_DENIED|permission/i.test(m.text()) && errors.push(`${who}: ${m.text()}`));
    page.on('pageerror', (e) => errors.push(`${who} PAGEERROR ${e.message}`));
    const tid = (id) => page.locator(`[data-testid="${id}"]:visible`).first();
    const text = (t) => page.getByText(t).filter({ visible: true }).first();
    const shot = async (name) => { await page.waitForTimeout(700); await page.screenshot({ path: `${OUT}/${String(++n).padStart(2, '0')}-${who}-${name}.png` }); };
    return { ctx, page, tid, text, shot };
  };
  const step = (s) => console.log('STEP', s);
  const stamp = String(Date.now()).slice(-5);

  async function signUp(u, name, username) {
    await u.page.goto(BASE + '/'); await u.tid('welcome-sign-up').click();
    const email = `${username}@example.com`;
    await u.tid('sign-up-email').fill(email); await u.tid('sign-up-password').fill('trail2026'); await u.tid('sign-up-confirm').fill('trail2026'); await u.tid('sign-up-submit').click();
    await u.tid('create-profile-submit').waitFor({ timeout: 15000 });
    await u.tid('profile-display-name').fill(name); await u.tid('profile-username').fill(username);
    await u.text('Available').waitFor({ timeout: 10000 }); await u.tid('create-profile-submit').click();
    await u.tid('home-welcome').waitFor({ timeout: 20000 });
    return uidOf(email);
  }

  const ana = await mk('ana');
  const ben = await mk('ben');
  const anaName = 'ana' + stamp, benName = 'ben' + stamp;
  step('two sign-ups');
  const anaUid = await signUp(ana, 'Ana Coast', anaName);
  const benUid = await signUp(ben, 'Ben Kloof', benName);

  step('Ben makes his profile followers-only');
  await ben.page.getByRole('tab', { name: /Profile/ }).click(); await ben.tid('profile-privacy').click(); await ben.text('Who can see my profile stats').waitFor();
  await ben.page.getByRole('radio', { name: 'Followers' }).first().click(); await ben.text('Saved.').waitFor({ timeout: 10000 }); await ben.tid('header-back').click();

  step('seed activities');
  await seedActivity(anaUid, `ana-pub-${stamp}`, 'Sunrise coastal run', 'run', 8.2, 'public', 3, 0);
  await seedActivity(anaUid, `ana-fol-${stamp}`, 'Tempo with the club', 'run', 6.0, 'followers', 26, 1);
  await seedActivity(anaUid, `ana-priv-${stamp}`, 'Secret hill reps', 'run', 4.0, 'private', 30, 2);
  await seedActivity(benUid, `ben-fol-${stamp}`, 'Kloof Nek ride', 'ride', 28.4, 'followers', 5, 3);
  await seedActivity(benUid, `ben-pub-${stamp}`, 'Evening walk', 'walk', 3.1, 'public', 50, 4);

  step('Ben finds Ana and follows straight away (public profile)');
  await ben.page.getByRole('tab', { name: /Community/ }).click(); await ben.tid('community-search').fill(anaName);
  await ben.tid(`search-result-${anaName}`).waitFor({ timeout: 10000 }); await ben.shot('search');
  await ben.tid(`follow-${anaName}`).click(); await ben.page.getByText('Following', { exact: true }).filter({ visible: true }).first().waitFor({ timeout: 10000 });
  await ben.tid('community-search').fill('');

  step('Ben\'s feed: Ana\'s public and followers-only, never private');
  await ben.text('Sunrise coastal run').waitFor({ timeout: 15000 }); await ben.text('Tempo with the club').waitFor();
  if (await ben.page.getByText('Secret hill reps').count()) throw new Error('private activity leaked into the feed');
  await ben.shot('feed');

  step('Ben cheers and comments');
  await ben.tid(`like-ana-pub-${stamp}`).click(); await ben.page.waitForTimeout(800);
  console.log('like count after cheer:', await ben.tid(`like-count-ana-pub-${stamp}`).innerText());
  await ben.text('Sunrise coastal run').click(); await ben.tid('activity-title').waitFor();
  await ben.tid('activity-owner').waitFor();
  await ben.tid('comment-input').fill('Lovely route, that coastline at sunrise!'); await ben.tid('comment-send').click();
  await ben.text('Lovely route, that coastline at sunrise!').waitFor({ timeout: 10000 });
  console.log('likers:', await ben.tid('activity-likers').innerText());
  await ben.tid('comment-input').scrollIntoViewIfNeeded(); await ben.shot('activity-comments');
  if (await ben.page.locator('[data-testid="activity-edit"]:visible').count()) throw new Error('non-owner sees edit');

  step('Ben opens Ana\'s profile');
  await ben.tid('activity-owner').click(); await ben.tid('user-name').waitFor();
  await ben.text('Sunrise coastal run').waitFor({ timeout: 10000 });
  if (await ben.page.getByText('Secret hill reps').count()) throw new Error('private activity on profile');
  await ben.shot('ana-profile');

  step('Ana asks to follow Ben (followers-only) and sees nothing yet');
  await ana.page.getByRole('tab', { name: /Community/ }).click(); await ana.tid('community-search').fill(benName);
  await ana.tid(`search-result-${benName}`).waitFor({ timeout: 10000 }); await ana.tid(`person-${benName}`).click();
  await ana.tid('user-name').waitFor(); await ana.text('Followers only').waitFor({ timeout: 10000 });
  if (await ana.page.getByText('Kloof Nek ride').count()) throw new Error('followers-only activity visible before approval');
  await ana.tid(`follow-${benName}`).click(); await ana.page.getByText('Requested', { exact: true }).filter({ visible: true }).first().waitFor({ timeout: 10000 });
  await ana.text('Your follow request is waiting for approval.').waitFor(); await ana.shot('requested');

  step('Ben approves');
  await ben.page.goto(BASE + '/community'); await ben.tid('community-requests').waitFor({ timeout: 15000 }); await ben.shot('request-row');
  await ben.tid('community-requests').click(); await ben.tid(`approve-${anaName}`).waitFor({ timeout: 10000 }); await ben.shot('requests');
  await ben.tid(`approve-${anaName}`).click(); await ben.text('No requests').waitFor({ timeout: 10000 });

  step('Ana now sees Ben\'s stats and followers-only ride');
  await ana.page.reload(); await ana.tid('user-name').waitFor({ timeout: 15000 });
  await ana.text('Kloof Nek ride').waitFor({ timeout: 15000 }); await ana.shot('ben-profile-approved');
  console.log('Ben followers count on Ana screen:', await ana.tid('user-followers').innerText());

  step('Ana sees the cheer and comment on her run');
  await ana.page.goto(BASE + `/activity/ana-pub-${stamp}`); await ana.tid('activity-title').waitFor({ timeout: 15000 });
  await ana.text('Lovely route, that coastline at sunrise!').waitFor({ timeout: 10000 });
  console.log('Ana sees likers:', await ana.tid('activity-likers').innerText());

  step('ranking this week');
  await ana.page.goto(BASE + '/community'); await ana.page.getByRole('radio', { name: 'This week' }).first().click();
  await ana.tid(`rank-${benName}`).waitFor({ timeout: 15000 }); await ana.shot('ranking');
  const rows = await ana.page.locator('[data-testid^="rank-"]:visible').allInnerTexts(); console.log('ranking:', rows.map((r) => r.replace(/\n/g, ' ')).join(' | '));

  step('Ben removes Ana as a follower, then she loses access');
  await ben.page.goto(BASE + '/profile'); await ben.tid('profile-followers').click(); await ben.tid(`remove-${anaName}`).waitFor({ timeout: 10000 });
  await ben.tid(`remove-${anaName}`).click(); await ben.tid(`remove-${anaName}`).click(); await ben.text('No followers yet').waitFor({ timeout: 10000 });
  await ana.page.goto(BASE + `/user/${benUid}`); await ana.text('Followers only').waitFor({ timeout: 15000 });

  console.log('ALL STEPS PASSED');
  console.log('CONSOLE ERRORS:', JSON.stringify(errors, null, 1));
  await b.close();
})().catch(async (e) => { console.log('FAILED', e.message.split('\n').slice(0, 6).join('\n')); console.log('CONSOLE ERRORS:', JSON.stringify(errors.slice(0, 10), null, 1)); process.exit(1); });
