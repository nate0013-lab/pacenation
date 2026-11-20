# Browser walkthroughs

End-to-end checks that drive the web build against the Firebase emulators with Playwright.

```bash
npm run emulators                                   # terminal 1
EXPO_PUBLIC_USE_FIREBASE_EMULATOR=1 EXPO_PUBLIC_EMULATOR_HOST=127.0.0.1 \
  npx expo export -p web --output-dir dist          # build once
node e2e/serve.js "$PWD/dist" 8082 &                # serve the build
mkdir -p e2e/out
node e2e/accounts.e2e.js e2e/out                    # sign-up, profile, tabs, privacy, sign-in, delete account
node e2e/tracking.e2e.js e2e/out                    # GPS tracking, save, replay, GPX download, edit, history, delete
node e2e/progress.e2e.js e2e/out                    # seeded history: dashboard, XP, levels, records, badges, stats sync
```

Screenshots land in the folder you pass. Playwright must be installed (`npm i -D playwright`).
