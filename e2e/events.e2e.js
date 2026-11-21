// Stage 7 walkthrough with two people: follow, cheer and comment notifications, hosting and joining an event, edits and cancellation, inbox settings.

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
  async function inbox(u) {
    await u.page.goto(BASE + '/notifications'); await u.tid('notifications-unread').waitFor({ timeout: 15000 }); await u.page.waitForTimeout(1500);
    return (await u.page.locator('[data-testid^="notification-"]:visible').allInnerTexts()).map((t) => t.replace(/\n/g, ' '));
  }

  const ana = await mk('ana');
  const ben = await mk('ben');
  const anaName = 'eana' + stamp, benName = 'eben' + stamp;
  step('two sign-ups');
  const anaUid = await signUp(ana, 'Ana Coast', anaName);
  await signUp(ben, 'Ben Kloof', benName);
  const actId = `eana-1-${stamp}`;
  await seedActivity(anaUid, actId, 'Harbour loop', 'run', 8.4, 'public', 3, 0);

  step('Home shows the bell and the empty events section');
  await ana.tid('home-bell').waitFor(); await ana.tid('home-host-event').scrollIntoViewIfNeeded(); await ana.shot('home-no-events');

  step('Ben follows Ana, cheers and comments on her run');
  await ben.page.goto(BASE + `/user/${anaUid}`); await ben.tid(`follow-${anaName}`).click(); await ben.page.waitForTimeout(1500);
  await ben.page.goto(BASE + `/activity/${actId}`); await ben.tid(`like-${actId}`).click(); await ben.page.waitForTimeout(800);
  await ben.tid('comment-input').fill('Strong finish on that hill!'); await ben.tid('comment-send').click(); await ben.text('Strong finish on that hill!').waitFor({ timeout: 10000 });

  step('Ana sees an unread count on the bell and three notifications');
  await ana.page.goto(BASE + '/'); await ana.tid('home-bell-unread').waitFor({ timeout: 15000 });
  console.log('bell:', await ana.tid('home-bell-unread').innerText()); await ana.shot('home-bell');
  let items = await inbox(ana); console.log('Ana inbox:', items.join(' | '));
  if (items.length !== 3) throw new Error('expected 3 notifications, got ' + items.length);
  await ana.shot('inbox');
  step('tapping the comment opens the activity and marks it read');
  await ana.tid('notification-comment').click(); await ana.page.waitForURL(/activity\//, { timeout: 10000 }); await ana.text('Strong finish on that hill!').waitFor();
  await ana.page.goBack(); await ana.tid('notifications-unread').waitFor(); await ana.page.waitForTimeout(1000); console.log('after tap:', await ana.tid('notifications-unread').innerText());

  step('Ana hosts an event from the Challenges tab');
  await ana.page.goto(BASE + '/challenges'); await ana.tid('open-events').click(); await ana.tid('events-host').click();
  await ana.tid('event-title').waitFor(); await ana.tid('event-save').click(); await ana.page.waitForTimeout(500); await ana.shot('event-form-errors');
  await ana.tid('event-sport-run').click(); await ana.tid('event-title').fill('Saturday sunrise run');
  await ana.tid('event-meeting').fill('Sea Point Pavilion'); await ana.tid('day-2').click(); await ana.tid('hour-minus').click();
  await ana.tid('event-distance').fill('10'); await ana.tid('event-capacity').fill('12'); await ana.tid('event-description').fill('Easy 6:00/km, coffee after.');
  await ana.shot('event-form');
  await ana.tid('event-save').click(); await ana.tid('event-title-text').waitFor({ timeout: 15000 });
  const eventId = ana.page.url().split('/events/')[1];
  console.log('event:', eventId, '| going', await ana.tid('event-going-count').innerText()); await ana.shot('event-detail-host');

  step('Ben finds it on Home and joins');
  await ben.page.goto(BASE + '/'); await ben.tid(`event-${eventId}`).waitFor({ timeout: 15000 }); await ben.tid(`event-${eventId}`).scrollIntoViewIfNeeded(); await ben.shot('home-events');
  await ben.tid(`event-${eventId}`).click(); await ben.tid('event-join').click(); await ben.tid('event-leave').waitFor({ timeout: 10000 });
  console.log('Ben going; count', await ben.tid('event-going-count').innerText()); await ben.tid(`attendee-${benName}`).waitFor(); await ben.shot('event-joined');
  step('the Going filter shows it');
  await ben.page.goto(BASE + '/events'); await ben.page.getByRole('radio', { name: 'Going' }).first().click(); await ben.tid(`event-${eventId}`).waitFor({ timeout: 10000 }); await ben.shot('events-going');

  step('Ana gets an event join notification that opens the event');
  items = await inbox(ana); console.log('Ana inbox:', items.slice(0, 2).join(' | '));
  await ana.tid('notification-event_join').click(); await ana.tid(`attendee-${benName}`).waitFor({ timeout: 10000 });

  step('Ana edits the event; Ben is told');
  await ana.tid('event-edit').click(); await ana.tid('event-title').fill('Saturday sunrise 10K'); await ana.tid('event-save').click();
  await ana.text('Saturday sunrise 10K').waitFor({ timeout: 10000 });
  step('Ana cancels the event; Ben is told');
  await ana.tid('event-cancel').click(); await ana.tid('event-cancel').click(); await ana.text(/cancelled/i).waitFor({ timeout: 10000 }); await ana.shot('event-cancelled');
  items = await inbox(ben); console.log('Ben inbox:', items.join(' | '));
  if (!items.some((t) => /cancelled/.test(t)) || !items.some((t) => /changed the details/.test(t))) throw new Error('Ben missing event notifications');
  await ben.shot('inbox-events');

  step('Ben turns off event notifications and they disappear');
  await ben.tid('notifications-settings').click(); await ben.tid('notif-events').waitFor(); await ben.page.getByRole('switch', { name: 'Events' }).click();
  await ben.text('Saved.').waitFor({ timeout: 10000 }); await ben.shot('notification-settings');
  items = await inbox(ben); console.log('Ben inbox after turning off events:', items.length);
  if (items.length !== 0) throw new Error('event notifications still shown');

  step('Ana marks everything read');
  await inbox(ana); if (await ana.page.locator('[data-testid="notifications-read-all"]:visible').count()) await ana.tid('notifications-read-all').click();
  await ana.text('You are all caught up').waitFor({ timeout: 10000 });
  await ana.page.goto(BASE + '/'); await ana.tid('home-bell').waitFor(); await ana.page.waitForTimeout(1500);
  if (await ana.page.locator('[data-testid="home-bell-unread"]:visible').count()) throw new Error('bell still shows unread');

  step('profile links to notification settings');
  await ana.page.goto(BASE + '/profile'); await ana.tid('profile-notifications').click(); await ana.tid('notif-followers').waitFor();

  console.log('ALL STEPS PASSED');
  console.log('CONSOLE ERRORS:', JSON.stringify(errors, null, 1));
  await b.close();
})().catch(async (e) => { console.log('FAILED', e.message.split('\n').slice(0, 6).join('\n')); console.log('CONSOLE ERRORS:', JSON.stringify(errors.slice(0, 10), null, 1)); process.exit(1); });
