# PaceNation

**Where Every Kilometre Matters.** Compete. Connect. Conquer.

A walking, running and cycling community app for Android and iOS, built with
Expo (React Native + TypeScript) and Firebase.

## Status

Stage 1 of 7 (foundation and identity) is complete:

- PaceNation brand: P+N logo, Summit Night / Altitude Teal / Sunrise Gold palette, original mountain-trail artwork and icon set
- Email sign-up, sign-in, forgot password, persistent sessions
- Profile creation with photo, unique username, bio and optional weight
- Five-tab navigation: Home, Activity, Challenges, Community, Profile
- Home dashboard with weekly, monthly and all-time distance, activity count, level and quick-start buttons
- Live challenge list (weekly and monthly), username search
- Edit profile, privacy settings, password reset, sign out, delete account
- Firestore and Storage security rules for the whole data model, with emulator tests

See the build plan doc for the remaining stages.

## Run it

Requirements: Node 20+, Java 17+ (for the Firebase emulators).

```bash
npm install
npm --prefix firebase install

# Terminal 1: local Firebase (auth, Firestore, Storage)
npm run emulators

# Terminal 2: the app, against the emulators
cp .env.example .env    # set EXPO_PUBLIC_USE_FIREBASE_EMULATOR=1
npx expo start          # press w for web, or scan the QR code with a development build
```

Image picking, GPS and native sign-in need a development build
(`npx eas-cli@latest build --profile development`) rather than Expo Go.

To use a real Firebase project, fill in `.env` from the Firebase console, then deploy the rules:

```bash
firebase/node_modules/.bin/firebase deploy --only firestore,storage --project <your-project-id>
```

## Tests

```bash
npm run typecheck      # TypeScript
npm test               # unit tests (Jest)
npm run test:rules     # Firestore and Storage rules against the emulator
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
