# PaceNation

**Where Every Kilometre Matters.** Compete. Connect. Conquer.

A walking, running and cycling community app for Android and iOS, built with
Expo (React Native + TypeScript) and Firebase.

## Status

All seven stages are built. Stage 1 (foundation and identity):

- PaceNation brand: P+N logo, Summit Night / Altitude Teal / Sunrise Gold palette, original mountain-trail artwork and icon set
- Email sign-up, sign-in, forgot password, persistent sessions
- Profile creation with photo, unique username, bio and optional weight
- Five-tab navigation: Home, Activity, Challenges, Community, Profile
- Home dashboard with weekly, monthly and all-time distance, activity count, level and quick-start buttons
- Live challenge list (weekly and monthly), username search
- Edit profile, privacy settings, password reset, sign out, delete account
- Firestore security rules for the whole data model, with emulator tests

Stage 2 (live tracking):

- Walk, run and ride tracker: start, pause, resume, finish, discard
- Live route map, distance, moving time, current and average pace, speed, calories
- GPS accuracy filtering (drops inaccurate fixes, impossible jumps and standing-still jitter)
- Background tracking on Android and iOS with the screen off; an unfinished activity survives the app closing
- Activities saved with their full GPS route; offline saves queue on the phone and upload later
- Activity history, a summary page for every activity, and Home and Profile totals from saved activities

Stage 3 (activity detail):

- Animated route replay with play/pause, 1x/2x/4x speed and a tap-to-jump scrubber
- Start and finish markers, per-kilometre splits, elevation profile when the phone recorded altitude
- Download the route as a GPX file (share sheet on phones, file download on web)
- Share an activity summary, rename it and change who can see it

Stage 4 (progress):

- XP for every activity (distance, climbing and badges) and levels with titles, from Trailhead to Apex
- 24 original badges in bronze, silver and gold across milestones, distance, consistency and exploring
- Personal records: fastest 1 km, 5 km, 10 km, half and full marathon runs, ride efforts, longest walk, run and ride, biggest climb
- Home: last 7 days chart, streaks, latest badges and the badges you are closest to
- Profile: weekly distance chart, stats by sport, records and badges; a full badges screen with progress
- Everything is worked out on the phone from saved activities; the public summary is kept in `stats/{uid}`

Stage 5 (community):

- Search people, follow public profiles at once, and send follow requests to followers-only and private profiles
- Approve or decline requests, remove followers, see anyone's followers and following lists
- Feed of your own and followed people's activities, filtered by each activity's visibility
- Cheers and comments on activities; activity owners can delete any comment on their activity
- Profiles of other people show stats, badges, records and activities only when their privacy settings allow
- This week's ranking among the people you follow, and a Discover list of new members
- "Only me" activities are left out of shared totals and records

Stage 6 (challenges and leaderboards):

- Ten built-in challenges that renew every Monday and on the 1st: run, walk and ride distances, a five-activity week, a monthly climb, and two community challenges with one shared total
- Join and leave; activities already saved in the period count straight away; progress, ranking and completion date per challenge
- Challenge badges (complete 1, 5 and 20 challenges)
- Leaderboards for this week, this month and all time, for all sports or walk, run or ride, with your position
- People who turn off "Show me on leaderboards" are removed from every board; "Only me" activities never count
- No server: each phone writes its own challenge entry and leaderboard places, checked by the security rules

Stage 7 (events, notifications, launch):

- Group events: host a walk, run or ride with a time, meeting point, optional map pin, distance and number of spaces; edit or cancel it
- Join and leave events, see who is going, open the meeting point in maps; Upcoming events on Home and an Events list with a Going filter
- In-app notifications for new followers, follow requests, cheers, comments, event joins, changes and cancellations, with a bell and unread count on Home
- Notification settings to hide each kind; the security rules check every notification matches something that really happened
- Google sign-in (web and phones) and Apple sign-in (iPhone), switched on by configuration so the buttons only appear once they work
- Phone builds with EAS (`eas.json`): development, preview and production profiles; see `docs/LAUNCH.md`

## Firebase plan

PaceNation runs on the free Spark plan: Authentication and Firestore only.
Profile photos are stored as small JPEG images inside the profile document
(`src/lib/avatar.ts` is the one place to change to use Cloud Storage later),
and there are no Cloud Functions. Rules are published by pasting
`firebase/firestore.rules` into the Firebase console. No composite indexes are needed.

Store builds and release steps: `docs/LAUNCH.md`.

## Run it

Requirements: Node 20+, Java 17+ (for the Firebase emulators).

```bash
npm install
npm --prefix firebase install

# Terminal 1: local Firebase (auth, Firestore)
npm run emulators

# Terminal 2: the app, against the emulators
cp .env.example .env    # set EXPO_PUBLIC_USE_FIREBASE_EMULATOR=1
npx expo start          # press w for web, or scan the QR code with a development build
```

Image picking, GPS and native sign-in need a development build
(`npx eas-cli@latest build --profile development`) rather than Expo Go.

Without `.env` the app talks to the live pacenation-958d2 project.

Android maps need a Google Maps API key, read at build time from `GOOGLE_MAPS_ANDROID_KEY` (see `app.config.js`). iOS uses Apple Maps and needs no key.

Google and Apple sign-in are configured with the `EXPO_PUBLIC_GOOGLE_*` and `EXPO_PUBLIC_APPLE_SIGN_IN` values in `.env.example`.

## Tests

```bash
npm run typecheck      # TypeScript
npm test               # unit tests (Jest)
npm run test:rules     # Firestore rules against the emulator
# browser walkthroughs: see e2e/README.md
```

## Layout

```
src/app/            screens (Expo Router: every file is a route)
  (auth)/           welcome, sign-in, sign-up, forgot-password
  (tabs)/           home, activity, challenges, community, profile
  settings/         edit-profile, privacy, account
  create-profile    first-run profile setup
src/components/     logo, artwork, icons, UI kit
src/lib/            Firebase, auth, services, validation, formatting
firebase/           security rules, indexes, rules tests
```
