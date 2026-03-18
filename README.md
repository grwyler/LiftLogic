## Environment variables

Use a local `.env.local` file for secrets and environment-specific values.
Do not commit real credentials to this repository.
If any credential was ever exposed in a local file, rotate it in the provider dashboard before reusing this project for beta users.

Example PowerShell session:

```powershell
$env:NEXT_PUBLIC_ENV="local"
$env:MONGODB_DB="LiftLogic"
$env:MONGODB_URI="mongodb+srv://<username>:<password>@<cluster-host>/<database>"
$env:NEXTAUTH_SECRET="<generate-a-long-random-secret>"
$env:NEXTAUTH_URL="http://localhost:3000"
$env:NEXT_PUBLIC_RAPIDAPI_KEY="<rapidapi-key>"
$env:NEXT_PUBLIC_RAPIDAPI_HOST="exercisedb.p.rapidapi.com"
$env:OPENAI_API_KEY="<openai-api-key>"
$env:AI_GATEWAY_API_KEY="<vercel-ai-gateway-key>"
$env:PORT=3000
```

## Deploy

```powershell
vercel --prod
```

## Android shell

Lift Logic includes a Capacitor Android wrapper that targets the deployed web app. See [docs/android-capacitor-shell.md](/Users/Grwyl/VSCode%20Projects/lift-logic/docs/android-capacitor-shell.md) for the production target, local dev workflow, and Android Studio steps.

## Android QA

Use [docs/android-qa-checklist.md](/Users/Grwyl/VSCode%20Projects/lift-logic/docs/android-qa-checklist.md) for the repeatable Android smoke pass covering auth, routines, setup, recurring rules, coach flows, dialogs, and feedback capture.
