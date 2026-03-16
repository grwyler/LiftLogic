# Android QA Checklist

Use this checklist as the repeatable Android smoke pass before shipping mobile-facing changes or cutting a Play Store candidate. Prefer running it against the deployed environment through the Capacitor shell or installed PWA so auth, server routes, billing, and feedback APIs behave like production.

## Test setup

- Device or emulator:
  - Android viewport around `412x915` or a comparable phone profile.
  - Chrome and Capacitor shell available when relevant.
- Environment:
  - Production deployment preferred.
  - If local is necessary, use the Android-accessible host flow from [android-capacitor-shell.md](/Users/Grwyl/VSCode%20Projects/lift-logic/docs/android-capacitor-shell.md).
- Accounts:
  - One fresh tracker-first account.
  - One fresh planner/assistant account.
  - One returning account with an existing routine and prior feedback history.
- Preconditions:
  - Network available for the main pass.
  - Optional spot check with network disabled after initial load to confirm shell/offline fallback behavior.

## 1. Sign-in and auth shell

- Open the app from the Android home screen or Capacitor shell.
- Confirm the landing page renders without clipped hero copy, overlapping buttons, or hidden safe-area content.
- Go to sign-up and create a new account with credentials.
- Sign out, then sign back in with the same credentials.
- If Google auth is enabled in the target environment, confirm the Google entry point opens correctly and returns to `/routines`.
- Verify Android back behavior from sign-in and sign-up does not strand the user on a blank page or broken redirect loop.

Pass when:
- Auth routes are reachable, keyboard interaction does not hide the submit action, and successful auth lands on `/routines`.

## 2. Setup dialog and first-run intent split

- On a fresh account, confirm the first-run setup flow appears on `/routines`.
- Test the tracker-first path:
  - Choose the “just track workouts” option.
  - Confirm the app stays usable without assistant setup.
- Test the planner path on another fresh account:
  - Enter name, goal, training frequency, and at least one equipment option.
  - Save assistant setup.
  - Confirm the opening coach response appears and the screen remains scrollable with the keyboard open.

Pass when:
- The setup dialog is readable on Android, buttons remain tappable above the keyboard, and both tracker-first and planner-first paths complete successfully.

## 3. Routines day flow and workout logging

- Open `/routines`.
- Move between days with the day switcher and calendar/date controls.
- In tracker mode, use `Add First Exercise` and `Quick Add`.
- Confirm the newly added exercise auto-opens directly into logging mode.
- Verify the first incomplete set is selected by default.
- Log the first set and confirm the exercise and workout progress update immediately.
- Close the exercise detail view and reopen it.
- Add another set if needed and confirm the logging view still targets the next incomplete set.

Pass when:
- Workout logging starts without extra taps, set entry fields stay visible with the Android keyboard open, and state updates without duplicate or missing entries.

## 4. Dialogs, sheets, and date selection

- Open and close:
  - The clear program dialog.
  - Exercise delete dialog.
  - Repeat schedule dialog.
  - Upgrade prompt dialog if using a free account.
- In the repeat schedule flow:
  - Save a schedule with an end date.
  - Reopen it and edit the end date.
- Verify Android back closes the topmost dialog instead of navigating away unexpectedly.
- Confirm date inputs and pickers remain usable in portrait orientation and do not render off-screen.

Pass when:
- Modal stacking is stable, dialogs are scrollable on smaller Android screens, and end dates save and reopen correctly.

## 5. Recurring rules and drag interactions

- Add at least two exercises to a workout.
- Reorder scheduled exercises with drag and drop.
- Confirm the new order persists after refresh or revisit.
- Apply a recurring rule to one exercise.
- Apply a repeating schedule to the full workout if the account has access.
- Navigate across future days to confirm recurring items appear where expected.

Pass when:
- Drag handles are usable on touch, reordering persists, and recurring rules populate future workout days without broken layout or duplicate entries.

## 6. Coach and AI-assisted flows

- On an assistant-enabled account:
  - Generate a plan from the setup flow.
  - Open the coach panel.
  - Ask for a revision or rebuild scenario.
  - Submit thumbs-up and thumbs-down feedback on coach responses.
- On a free account:
  - Trigger an assistant generation or plan revision gate.
  - Confirm the contextual upgrade prompt appears and declining keeps the user in the free flow.

Pass when:
- Coach messages render cleanly on Android, feedback dialogs are usable, and premium gating never traps the user or claims a blocked plan change succeeded.

## 7. Feedback capture and bug reporting

- Open `/feedback` while signed in.
- Submit a bug report with title and reproduction details.
- Confirm the success toast appears and the new report shows up in recent submissions.
- If using the dev bug recorder or admin workflow in a non-production environment, confirm those overlays do not block primary mobile actions.

Pass when:
- Feedback submission works on Android without clipped form fields, hidden submit buttons, or broken toasts.

## 8. PWA and shell-specific checks

- If testing the PWA:
  - Confirm install metadata is present and the app can be added to the home screen.
  - Re-open from the installed icon and verify standalone presentation.
- If testing the Capacitor shell:
  - Launch from Android Studio or an installed debug build.
  - Confirm remote navigation stays inside the shell and returns to the app after auth.
- Optional offline spot check:
  - Load the app once.
  - Disable network.
  - Attempt a navigation to confirm the offline fallback appears instead of a browser error page.

Pass when:
- Installed/shelled entry feels native enough for smoke coverage and network failure falls back gracefully.

## Release sign-off summary

Capture these before marking Android smoke as complete:

- Build tested:
  - PWA, Capacitor debug shell, or both.
- Environment tested:
  - Production or local Android host.
- Devices tested:
  - Emulator name/version and any physical device model.
- Result:
  - Pass, pass with notes, or blocked.
- Notes:
  - Any UI clipping, keyboard overlap, auth redirect, dialog, drag, AI, or feedback issues found during the pass.
