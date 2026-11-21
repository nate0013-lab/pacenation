// Stage 6 walkthrough with two people: join challenges, progress from activities, community totals, challenge badge, leaderboards and opting out.

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
  // Hours ago, but never before this Monday, so seeded activities land in this week.
  const monday = new Date(); monday.setHours(0, 0, 0, 0); monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  const recent = (h) => Math.min(h, (Date.now() - monday.getTime()) / 3600_000 - 0.2);

  const ana = await mk('ana');
  const ben = await mk('ben');
  const anaName = 'cana' + stamp, benName = 'cben' + stamp;
  step('two sign-ups');
  const anaUid = await signUp(ana, 'Ana Coast', anaName);
  const benUid = await signUp(ben, 'Ben Kloof', benName);
  step('seed this week');
  await seedActivity(anaUid, `cana-1-${stamp}`, 'Harbour loop', 'run', 8.4, 'public', recent(3), 0);
  await seedActivity(anaUid, `cana-2-${stamp}`, 'Easy shakeout', 'run', 6.1, 'followers', recent(20), 1);
  await seedActivity(anaUid, `cana-3-${stamp}`, 'Secret tempo', 'run', 9.0, 'private', recent(10), 2);
  await seedActivity(benUid, `cben-1-${stamp}`, 'Long Sunday run', 'run', 18.2, 'public', recent(6), 3);
  await seedActivity(benUid, `cben-2-${stamp}`, 'Track session', 'run', 9.3, 'public', recent(30), 4);
  await ana.page.waitForTimeout(2500); await ben.page.waitForTimeout(2500);

  step('Ana: Challenges tab lists this week\'s challenges');
  await ana.page.getByRole('tab', { name: /Challenges/ }).click(); await ana.tid('challenge-run-25').waitFor({ timeout: 10000 }); await ana.shot('challenges-tab');
  step('Ana opens Run 25 km and sees what she already has (private run left out)');
  await ana.tid('challenge-run-25').click(); await ana.tid('challenge-title').waitFor();
  console.log('Ana before joining:', (await ana.tid('challenge-my-progress').innerText()).replace(/\n/g, ' '));
  await ana.tid('challenge-join').click(); await ana.tid('challenge-leave').waitFor({ timeout: 10000 });
  await ana.page.waitForTimeout(1500);
  console.log('Ana after joining:', (await ana.tid('challenge-my-progress').innerText()).replace(/\n/g, ' '), '|', await ana.tid('challenge-status').innerText());
  await ana.shot('challenge-joined');

  step('Ben joins the same challenge and completes it');
  await ben.page.goto(BASE + `/challenge/run-25-${(await ana.page.url()).split('run-25-')[1]}`); await ben.tid('challenge-join').click();
  await ben.tid('challenge-leave').waitFor({ timeout: 10000 }); await ben.text(/Completed/).waitFor({ timeout: 10000 });
  console.log('Ben status:', await ben.tid('challenge-status').innerText());
  await ben.tid(`participant-${anaName}`).waitFor({ timeout: 10000 });
  const board = await ben.page.locator('[data-testid^="participant-"]:visible').allInnerTexts(); console.log('challenge board:', board.map((r) => r.replace(/\n/g, ' ')).join(' | '));
  await ben.shot('challenge-completed');

  step('Ben earns the Challenge Accepted badge');
  await ben.page.goto(BASE + '/badges'); await ben.tid('badge-challenge-1-earned').waitFor({ timeout: 10000 }); await ben.tid('badge-challenge-1').scrollIntoViewIfNeeded(); await ben.shot('challenge-badge');

  step('community challenge: both join, the total adds up');
  const together = `together-2000-${(await ana.page.url()).split('run-25-')[1]}`;
  await ana.page.goto(BASE + `/challenge/${together}`); await ana.tid('challenge-join').click(); await ana.tid('challenge-leave').waitFor({ timeout: 10000 });
  await ben.page.goto(BASE + `/challenge/${together}`); await ben.tid('challenge-join').click(); await ben.tid('challenge-leave').waitFor({ timeout: 10000 });
  await ana.page.waitForTimeout(2500); await ana.page.reload(); await ana.tid('challenge-community-total').waitFor({ timeout: 15000 }); await ana.page.waitForTimeout(2000);
  console.log('community total:', (await ana.tid('challenge-community-total').innerText()).replace(/\n/g, ' '));
  await ana.shot('community-challenge');

  step('leaderboards: this week, all sports and running');
  await ana.page.goto(BASE + '/leaderboards'); await ana.tid(`board-row-${benName}`).waitFor({ timeout: 15000 }); await ana.tid(`board-row-${anaName}`).waitFor();
  await ana.page.waitForTimeout(1200); console.log('Ana rank:', await ana.tid('board-my-rank').innerText());
  const rows = await ana.page.locator('[data-testid^="board-row-"]:visible').allInnerTexts(); console.log('week board:', rows.slice(0, 5).map((r) => r.replace(/\n/g, ' ')).join(' | '));
  await ana.shot('leaderboard-week');
  await ana.tid('board-sport-ride').click(); await ana.text('Nobody on this board yet').waitFor({ timeout: 10000 });
  await ana.tid('board-sport-run').click(); await ana.tid(`board-row-${benName}`).waitFor({ timeout: 10000 });
  await ana.page.getByRole('radio', { name: 'All time' }).first().click(); await ana.tid(`board-row-${anaName}`).waitFor({ timeout: 10000 }); await ana.shot('leaderboard-alltime-run');

  step('Ben opts out of leaderboards and disappears');
  await ben.page.goto(BASE + '/profile'); await ben.tid('profile-privacy').click(); await ben.text('Who can see my profile stats').waitFor();
  await ben.page.getByRole('switch').first().click(); await ben.text('Saved.').waitFor({ timeout: 10000 });
  await ana.page.waitForTimeout(3000);
  await ana.page.getByRole('radio', { name: 'This week' }).first().click(); await ana.page.waitForTimeout(2000);
  if (await ana.page.locator(`[data-testid="board-row-${benName}"]:visible`).count()) throw new Error('opted-out user still on leaderboard');
  console.log('Ben gone from leaderboard; Ana rank now', await ana.tid('board-my-rank').innerText());

  step('Ana leaves Run 25 km');
  await ana.page.goto(BASE + `/challenge/run-25-${together.split('together-2000-')[1]}`); await ana.tid('challenge-leave').click(); await ana.tid('challenge-leave').click(); await ana.tid('challenge-join').waitFor({ timeout: 10000 });

  step('Home shows current challenges');
  await ana.page.goto(BASE + '/'); await ana.tid('home-welcome').waitFor({ timeout: 15000 }); await ana.tid('challenge-together-2000').scrollIntoViewIfNeeded(); await ana.shot('home-challenges');

  console.log('ALL STEPS PASSED');
  console.log('CONSOLE ERRORS:', JSON.stringify(errors, null, 1));
  await b.close();
})().catch(async (e) => { console.log('FAILED', e.message.split('\n').slice(0, 6).join('\n')); console.log('CONSOLE ERRORS:', JSON.stringify(errors.slice(0, 10), null, 1)); process.exit(1); });
