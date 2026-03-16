# Android Capacitor Shell

Lift Logic now includes a Capacitor Android shell that wraps the deployed web app instead of trying to embed a local Next.js build. This is the lowest-risk Android path for the current architecture because server routes, auth, billing, and admin tools continue to run from the deployed site.

## What is included

- `capacitor.config.ts` points Android at the production deployment by default.
- `android/` contains the generated native Android host project.
- `public/capacitor-shell/index.html` is a minimal placeholder bundle used only so Capacitor can sync native assets.
- `package.json` includes Android helper scripts for sync, open, and run flows.

## Default production target

The shell points at:

```text
https://liftlogic.vercel.app
```

You can override that target at sync time with `CAPACITOR_SERVER_URL`.

## Local Android development workflow

1. Start the Next.js app on a host your Android emulator or device can reach.

PowerShell example for emulator-safe local access:

```powershell
$env:HOST="0.0.0.0"
$env:PORT="3000"
npm run dev -- --hostname 0.0.0.0 --port 3000
```

2. Point Capacitor at that reachable URL and sync Android.

Android emulator example:

```powershell
$env:CAPACITOR_SERVER_URL="http://10.0.2.2:3000"
npm run android:sync
```

Physical device on the same LAN example:

```powershell
$env:CAPACITOR_SERVER_URL="http://192.168.1.50:3000"
npm run android:sync
```

3. Open the native project in Android Studio.

```powershell
npm run android:open
```

4. Run the app from Android Studio, or use the Capacitor CLI if your Android toolchain is already configured.

```powershell
npm run android:run
```

## Notes

- `cleartext` is enabled automatically for local `http://` development targets.
- Production syncs should use the default `https://liftlogic.vercel.app` target unless the team intentionally changes the deployed host.
- Because this shell uses a live remote URL, Android validation should focus on session behavior, redirects, deep links, and network resilience rather than static asset bundling.
- Run the manual mobile pass in [android-qa-checklist.md](/Users/Grwyl/VSCode%20Projects/lift-logic/docs/android-qa-checklist.md) before calling an Android release candidate ready.
