# Play Store Submission Kit

This draft is based on the current Lift Logic codebase as of March 16, 2026. Verify it against your final production configuration before submitting in Google Play Console.

## Store listing

### App name

Lift Logic

### Short description

Plan workouts, track sets, and adapt your training week with less friction.

### Full description

Lift Logic is a workout planning and training log app built for lifters who want a cleaner daily flow than a spreadsheet and more flexibility than a one-size-fits-all fitness app.

Use Lift Logic to:

- build and adjust weekly workout routines
- log sets and reps with a faster workout flow
- keep recurring workout days organized
- tailor your setup around your schedule, equipment, and limitations
- use AI-assisted planning and coaching features when available

Lift Logic is designed to help you move from planning to training with less friction. Open today's session, follow the next set, log what actually happened, and keep your routine aligned with real life.

Core features include:

- workout logging with set-by-set progress
- recurring schedules for training days and exercises
- quick add flows for faster routine setup
- equipment-aware workout planning
- assistant-guided onboarding and workout recommendations
- in-app feedback tools for reporting issues and improving the product

Lift Logic supports both a tracker-first workflow and a planner-first workflow. You can keep things simple and just log workouts, or save more profile details to build a more tailored plan.

Some advanced planning and recurring scheduling features may require a paid plan.

## Privacy policy URL

Hosted app route:

`https://liftlogic.vercel.app/privacy`

If you publish from a different production domain, use that domain's `/privacy` URL.

## Data Safety draft

Recommended answers based on the current app implementation:

### Data collected

- Personal info
  - Name: optional
  - Email address: collected for OAuth and billing-related flows when available
  - User IDs / account identifiers: yes
- Health and fitness
  - Workout plans, workout entries, exercise selections, training goals, schedule, equipment access, limitations, notes, preferred units, experience level, and related training profile data
- Messages
  - Feedback submissions and coach chat prompts/messages
- Financial info
  - Purchase history / subscription status metadata
  - Stripe customer and subscription identifiers
  - Payment card data is not stored directly by Lift Logic
- App activity / diagnostics
  - Feedback and bug-report context such as route, app version, viewport, user agent, errors, and interaction logs

### Data shared with third parties

- Personal info
  - Email address may be shared with Stripe for checkout and with Google/Facebook for optional sign-in
- Health and fitness
  - Relevant workout profile and prompt context may be sent to OpenAI or a configured AI gateway when AI planning or coaching is used
- Financial info
  - Billing is processed by Stripe

### Data not collected by the current Android app manifest

- Location
- Contacts
- Photos or videos from device storage
- Audio files or microphone recordings
- SMS or call logs
- Calendar events
- Health Connect / medical records from the device

### Security / handling

- Data is transmitted over network connections used by the hosted web app and third-party providers
- The current Android manifest only requests `INTERNET`
- Users do not currently have a self-service in-app deletion flow; deletion requests should go through support/contact

## Content rating notes

Recommended starting answers:

- Violence: none
- Sexual content: none
- Profanity: none or very limited user-generated text
- Gambling: none
- Controlled substances: none
- User-generated content: limited text input in notes, chat, and feedback

## Target audience

Recommended:

- Adults
- Not designed specifically for children

## App access

If Play asks whether all functionality is available without an account:

- Answer: no
- Reason: core personalized planning, workout storage, and subscription features require account-based data

## Ads

Recommended answer:

- No, Lift Logic does not serve third-party ads in the current implementation

## Release notes draft

Version 1.0.0

- First Android release of Lift Logic
- Track workouts and log sets with a faster workout flow
- Save training preferences and schedule around real-life constraints
- Use assistant-guided setup and planning features where available
- Submit in-app feedback to help improve the beta

## Asset checklist

- App icon: 512 x 512 PNG
- Feature graphic: 1024 x 500 PNG
- Phone screenshots: at least 2, ideally 4 to 8
- Optional tablet screenshots if you want tablet listing support
- Privacy policy URL

## Remaining manual Console work

- Upload [app-release.aab](/C:/Users/Grwyl/VSCode%20Projects/lift-logic/android/app/build/outputs/bundle/release/app-release.aab)
- Enable Play App Signing
- Complete Data Safety form
- Complete Content rating questionnaire
- Complete App access answers
- Add screenshots and graphics
- Publish the privacy policy URL
