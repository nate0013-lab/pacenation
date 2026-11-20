// Stage 4 walkthrough: seeds a few weeks of activities straight into the emulator,
// then checks the dashboard, profile stats, records, XP, level and badges, and that
// a newly tracked activity updates XP and the public stats summary.
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

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, permissions: ['geolocation'], geolocation: { latitude: -33.9249, longitude: 18.4241, accuracy: 6 } });
  const page = await ctx.newPage();
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message));
  const shot = async (name, full = false) => { await page.waitForTimeout(700); await page.screenshot({ path: `${OUT}/${String(++n).padStart(2, '0')}-${name}.png`, fullPage: full }); };
  const tid = (id) => page.locator(`[data-testid="${id}"]:visible`);
  const text = (t) => page.getByText(t).filter({ visible: true }).first();
  const step = (s) => console.log('STEP', s);
  const txt = async (id) => (await tid(id).first().innerText()).trim();

  step('sign up'); await page.goto(BASE + '/'); await tid('welcome-sign-up').click();
  const email = `xp${Date.now()}@example.com`;
  await tid('sign-up-email').fill(email); await tid('sign-up-password').fill('trail2026'); await tid('sign-up-confirm').fill('trail2026'); await tid('sign-up-submit').click();
  await tid('create-profile-submit').waitFor({ timeout: 15000 });
  await tid('profile-display-name').fill('Thandi Ridge'); await tid('profile-username').fill('thandi' + String(Date.now()).slice(-5));
  await text('Available').waitFor({ timeout: 10000 }); await tid('create-profile-submit').click();
  await tid('home-welcome').waitFor({ timeout: 20000 });
  step('empty state'); console.log('level', await txt('level-label'), '|', await txt('level-xp'), '| streak', await txt('home-streak'));
  await shot('home-empty', true);

  step('seed activities');
  const login = await (await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: 'trail2026', returnSecureToken: true }) })).json();
  const uid = login.localId;
  const day = (ago, h, m = 0) => { const d = new Date(); d.setDate(d.getDate() - ago); d.setHours(h, m, 0, 0); return d; };
  const seeds = [
    // [daysAgo, hour, sport, km, movingS, climb, efforts, title]
    [40, 7, 'walk', 4.2, 2900, 30, { '1k': 640 }, 'Sea Point promenade'],
    [33, 6, 'run', 5.4, 1780, 45, { '1k': 305, '5k': 1630 }, 'Dawn 5K'],
    [26, 17, 'ride', 31.5, 4300, 420, { '10k': 1260, '20k': 2580 }, 'Chapman loop'],
    [19, 6, 'run', 8.1, 2700, 80, { '1k': 298, '5k': 1610 }, 'Green Point tempo'],
    [12, 9, 'walk', 11.3, 8100, 610, { '1k': 610, '5k': 3300, '10k': 6750 }, 'Lions Head hike'],
    [5, 18, 'run', 10.4, 3330, 120, { '1k': 289, '5k': 1555, '10k': 3190 }, 'Friday 10K'],
    [4, 6, 'run', 5.1, 1590, 40, { '1k': 292, '5k': 1560 }, 'Recovery run'],
    [3, 16, 'ride', 52.4, 7600, 890, { '10k': 1180, '20k': 2450, '40k': 5600 }, 'Cape Point ride'],
    [2, 7, 'walk', 3.6, 2450, 25, { '1k': 650 }, 'Kirstenbosch stroll'],
    [1, 6, 'run', 6.2, 1950, 55, { '1k': 284, '5k': 1540 }, 'Hill repeats'],
  ];
  let i = 0;
  for (const [ago, h, sport, km, mov, climb, efforts, title] of seeds) {
    const start = day(ago, h, 10);
    const end = new Date(start.getTime() + (mov + 120) * 1000);
    const pts = loop(-33.92 + i * 0.004, 18.42 + i * 0.003, 0.004 + km / 4000);
    await fsCreate('activities', `seed-${uid.slice(0, 6)}-${i++}`, {
      ownerId: uid, sport, title, visibility: 'followers', startedAt: start, endedAt: end,
      distanceM: Math.round(km * 1000), movingTimeS: mov, elapsedTimeS: mov + 120, avgSpeedMps: (km * 1000) / mov, maxSpeedMps: (km * 1000) / mov * 1.4,
      avgPaceSPerKm: Math.round(mov / km), elevationGainM: climb, calories: Math.round(km * 60), start: { lat: pts[0][0], lng: pts[0][1] }, end: { lat: pts[0][0], lng: pts[0][1] },
      polyline: encodePolyline(pts), pointCount: 0, likeCount: 0, commentCount: 0, bestEfforts: efforts, createdAt: end,
    });
  }

  step('dashboard updates live'); await page.waitForTimeout(2500);
  const lvl = await txt('level-label'); const xp = await txt('level-xp');
  console.log('level', lvl, '|', xp, '| streak', await txt('home-streak'), '| week', await txt('home-week-distance'));
  if (/Level 1 /.test(lvl)) throw new Error('level did not rise');
  await tid('home-latest-badges').waitFor(); await shot('home-dashboard');
  await tid('home-latest-badges').scrollIntoViewIfNeeded(); await shot('home-achievements');

  step('stats summary synced to Firestore'); await page.waitForTimeout(1500);
  const stats = await fsGet(`stats/${uid}`); const user = await fsGet(`users/${uid}`);
  console.log('stats doc xp', stats?.xp, 'level', stats?.level, 'badges', Object.keys(stats?.badges ?? {}).length, 'records', JSON.stringify(stats?.records));
  console.log('profile xp', user?.xp, 'level', user?.level);
  if (!stats || stats.xp !== user.xp) throw new Error('stats not synced');

  step('profile: records, weekly chart, badges'); await page.getByRole('tab', { name: /Profile/ }).click(); await tid('profile-name').waitFor();
  await tid('record-run-5k').waitFor(); console.log('5k record row:', (await txt('record-run-5k')).replace(/\n/g, ' '));
  await shot('profile');
  await tid('profile-weeks-chart').scrollIntoViewIfNeeded(); await shot('profile-weekly');
  await tid('record-run-5k').scrollIntoViewIfNeeded(); await shot('profile-records');
  await tid('profile-badge-strip').scrollIntoViewIfNeeded(); await shot('profile-badges');
  step('record opens its activity'); await tid('record-run-10k').click(); await tid('activity-title').waitFor(); console.log('record activity:', await txt('activity-title'));
  await tid('activity-badges').waitFor(); console.log('badges on this activity:', (await txt('activity-badges')).replace(/\n/g, ', '));
  await tid('activity-badges').scrollIntoViewIfNeeded(); await shot('activity-with-badge');
  await tid('header-back').click(); await tid('profile-name').waitFor();

  step('badges screen'); await tid('profile-badges').click(); await tid('badges-earned-count').waitFor();
  console.log('earned', (await txt('badges-earned-count')).replace(/\s+/g, ''));
  await tid('badge-first-steps-earned').waitFor(); await shot('badges-all', true);
  await page.getByRole('radio', { name: 'Locked' }).first().click(); await page.waitForTimeout(300);
  if (await tid('badge-first-steps').count()) throw new Error('earned badge shown under Locked');
  await shot('badges-locked');
  await page.getByRole('radio', { name: 'Earned' }).first().click(); await page.waitForTimeout(300);
  console.log('earned rows', await page.locator('[data-testid^="badge-"][data-testid$="-earned"]:visible').count());

  step('track a new activity: XP rises'); const xpBefore = (await fsGet(`users/${uid}`)).xp;
  await page.goto(BASE + '/'); await tid('home-welcome').waitFor({ timeout: 15000 }); await tid('quick-walk').click(); await tid('track-start').waitFor({ timeout: 15000 });
  await ctx.setGeolocation({ latitude: -33.9249, longitude: 18.4241, accuracy: 5 }); await tid('gps-strong').waitFor({ timeout: 15000 });
  await tid('track-start').click(); let lat = -33.9249;
  for (let k = 0; k < 20; k++) { lat += 0.000012; await ctx.setGeolocation({ latitude: lat, longitude: 18.4241, accuracy: 5 }); await page.waitForTimeout(1000); }
  await tid('track-pause').click(); await tid('track-finish').click(); await tid('track-save').click();
  await tid('activity-title').waitFor({ timeout: 15000 }); await text(/XP added/).waitFor(); console.log('banner:', await text(/XP added/).innerText());
  await page.waitForTimeout(2000); const xpAfter = (await fsGet(`users/${uid}`)).xp; console.log('xp', xpBefore, '->', xpAfter);
  if (!(xpAfter > xpBefore)) throw new Error('xp did not rise');
  await page.goto(BASE + '/'); await tid('home-welcome').waitFor({ timeout: 15000 }); console.log('streak now', await txt('home-streak'));

  console.log('ALL STEPS PASSED');
  console.log('CONSOLE ERRORS:', JSON.stringify(errors, null, 1));
  await b.close();
})().catch(async (e) => { console.log('FAILED', e.message.split('\n').slice(0, 6).join('\n')); console.log('CONSOLE ERRORS:', JSON.stringify(errors.slice(0, 10), null, 1)); process.exit(1); });
