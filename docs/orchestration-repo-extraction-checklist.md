# Orchestration Repo Extraction Checklist

## Copy first

- `orchestration-app/`
- `domain/orchestration/`
- `server/orchestration/`
- `utils/orchestrationAppConfig.ts`
- `scripts/orchestration-init-postgres.mjs`
- `db/orchestration-postgres.sql`
- `docs/orchestration-postgres-schema.md`
- `docs/orchestration-standalone-bootstrap.md`
- `docs/orchestration-ci-bootstrap.md`
- `docs/orchestration-repo-layout.md`
- `tests/unit/orchestration*.test.ts`
- `tests/unit/postgresStore.test.ts`
- `tests/unit/orchestrationTestStore.ts`
- `next.config.js`
- `tsconfig.json`
- `next-env.d.ts`
- `vitest.config.ts`

## Do not copy

- `components/Header.tsx`
- `pages/index.tsx`
- unrelated host-app pages, tests, and app features

## Copy thin route adapters

- `pages/api/signals.ts`
- `pages/api/work-items/index.ts`
- `pages/api/work-items/[id].ts`
- `pages/api/work-items/[id]/duplicate.ts`
- `pages/work-items/index.tsx`
- `pages/work-items/[id].tsx`

## Rename immediately after copy

- `orchestration-app/standalone/package.template.json` -> `package.json`
- `orchestration-app/standalone/.env.example` -> `.env.example`
- `orchestration-app/standalone/Dockerfile` -> `Dockerfile`
- `orchestration-app/standalone/.dockerignore` -> `.dockerignore`
- `orchestration-app/standalone/gitlab-ci.yml.example` -> `.gitlab-ci.yml`

## First commands

1. `npm ci`
2. `npm run type-check`
3. `npm run test:unit`
4. `node scripts/orchestration-init-postgres.mjs`
5. `npm run build`
6. `npm run start`

## Required env for first boot

- `ORCHESTRATION_STORE_BACKEND=postgres`
- `ORCHESTRATION_POSTGRES_URL=postgres://...`
- `ORCHESTRATION_POSTGRES_SCHEMA_PATH=./db/orchestration-postgres.sql`
- `ORCHESTRATION_ENABLE_SEED_DATA=false`

## Optional env for local evaluation

- `NEXT_PUBLIC_ORCHESTRATION_PLATFORM_NAME=Signal Orchestrator`
- `NEXT_PUBLIC_ORCHESTRATION_QUEUE_LABEL=Work Queue`
- `ORCHESTRATION_PLATFORM_NAME=Signal Orchestrator`
- `ORCHESTRATION_QUEUE_LABEL=Work Queue`

## Postgres init

Run:

`node scripts/orchestration-init-postgres.mjs`

Optionally override the SQL file:

`node scripts/orchestration-init-postgres.mjs ./db/orchestration-postgres.sql`

## First boot verification

1. Open `/work-items`
2. Open one `/work-items/[id]` detail page
3. POST a sample signal to `/api/signals`
4. Confirm a work item appears in the queue
5. Confirm review edits and duplicate actions work

## Manual API checks

- `GET /api/work-items`
- `GET /api/work-items/<id>`
- `POST /api/signals`

## Success criteria

- app starts without host-only imports
- queue page renders
- detail page renders
- Postgres-backed persistence works
- `npm run build` passes
