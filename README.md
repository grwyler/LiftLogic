## Environment variables

Use a local `.env.local` file for secrets and environment-specific values.
Do not commit real credentials to this repository.

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
