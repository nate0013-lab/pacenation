# Launching PaceNation

Everything here runs on the free Firebase Spark plan. Builds are made in the
cloud with EAS (Expo Application Services), so no Mac is needed for iPhone builds.

## 1. One-time setup

| What | Where | Cost |
| --- | --- | --- |
| Expo account | expo.dev/signup | Free (30 builds a month) |
| Google Play Console | play.google.com/console | US$25 once |
| Apple Developer Program | developer.apple.com/programs | US$99 a year |

```bash
npm i -g eas-cli
eas login
eas init                 # links the project to your Expo account and fills extra.eas.projectId
```

## 2. Secrets for builds

Maps need no key (free OpenFreeMap tiles) and the Google web client ID is built in. Store these as EAS environment variables (`eas env:create`), visible to the
`preview` and `production` environments:

- `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID`: Google Cloud OAuth client of type Android, package `app.pacenation`, with the SHA-1 from `eas credentials`
- `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`: Google Cloud OAuth client of type iOS, bundle ID `app.pacenation`
- `EXPO_PUBLIC_APPLE_SIGN_IN=1`: after enabling Apple in Firebase Authentication (needs the Apple Developer account)

The Google and Apple buttons stay hidden in any build that is missing its value.

## 3. Firebase

- Authentication > Sign-in method: Email/Password (on), Google, Apple
- Authentication > Settings > Authorized domains: add any web domain you host on
- Firestore > Rules: paste `firebase/firestore.rules` and publish

## 4. Builds

**From GitHub (no computer setup):** add an `EXPO_TOKEN` repository secret
(expo.dev > Account settings > Access tokens > Create; then GitHub repo >
Settings > Secrets and variables > Actions > New repository secret), and run
the "Phone test build" workflow from the Actions tab. When it finishes, its
summary links the APK and the Expo build page with an install QR code.

**From a computer:**

```bash
eas build --profile development --platform android   # test build with the dev menu, installs as an APK
eas build --profile preview --platform all           # test builds that behave like the store version
eas build --profile production --platform all        # store builds (Android App Bundle, iOS archive)
eas submit --profile production --platform android   # uploads to the Play internal testing track
eas submit --profile production --platform ios       # uploads to TestFlight
```

`production` raises the build number automatically. Raise `version` in
`app.json` for each public release.

## 5. Store listing

- **Name:** PaceNation
- **Subtitle / short description:** Where every kilometre matters.
- **Category:** Health & Fitness
- **Description:**
  Track your walks, runs and rides with GPS, see your route, splits and climbing,
  and earn XP, levels and badges as you go. Join weekly and monthly challenges,
  climb the leaderboards, follow friends, cheer their activities and meet up at
  community events. You decide who sees your profile and every activity.
- **Keywords:** running, walking, cycling, GPS tracker, challenges, leaderboard, fitness community
- **Screenshots:** phone screenshots of Home, tracking, activity detail, challenges, community and events (1080x1920 or larger)
- **Privacy policy URL:** required by both stores (the app collects location, email and profile data)
- **Data safety / App privacy:** location (app functionality), email (account), name and photo (profile), fitness data (app functionality); data is not sold; people can delete their account in the app (Profile > Account)
- **Background location (Google Play):** declaration and a short video showing tracking with the screen off, as the app uses location only during an activity the person started

## 6. Before each release

- `npm run typecheck && npm test && npm run test:rules`
- Browser walkthroughs in `e2e/README.md`
- Install the preview build on an Android phone and an iPhone and track a real walk with the screen off
- Publish the current `firebase/firestore.rules`
