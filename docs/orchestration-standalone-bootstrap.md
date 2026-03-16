# Orchestration Standalone Bootstrap

## What this repo now contains

The orchestration slice now has a standalone-oriented boundary:

- domain logic in `domain/orchestration`
- persistence and runtime wiring in `server/orchestration`
- orchestration-owned page composition in `orchestration-app/pages`
- orchestration-owned API handlers in `orchestration-app/api`
- orchestration-owned route metadata in `orchestration-app/routes.ts`
- thin Next.js host bindings in `pages/work-items` and `pages/api/*`

## What still needs to move into a new repo

Copy these first:

- `domain/orchestration`
- `server/orchestration`
- `orchestration-app`
- `db/orchestration-postgres.sql`
- `docs/orchestration-postgres-schema.md`
- orchestration-focused tests
- `utils/orchestrationAppConfig.ts`

## Current command and config assumptions

- package scripts currently come from the current host Next.js app
- the current host runtime is Next.js pages router
- the backing store is selected with `ORCHESTRATION_STORE_BACKEND`
- Postgres uses `ORCHESTRATION_POSTGRES_URL`
- Postgres schema SQL defaults to `./db/orchestration-postgres.sql` and can be overridden with `ORCHESTRATION_POSTGRES_SCHEMA_PATH`
- Mongo uses `ORCHESTRATION_MONGODB_URI` and `ORCHESTRATION_MONGODB_DB`
- seed behavior is controlled by `ORCHESTRATION_ENABLE_SEED_DATA`
- a standalone package template lives at `orchestration-app/standalone/package.template.json`
- a standalone env template lives at `orchestration-app/standalone/.env.example`
- a standalone Dockerfile lives at `orchestration-app/standalone/Dockerfile`

## Postgres-first bootstrap path

Recommended standalone defaults:

1. Set `ORCHESTRATION_STORE_BACKEND=postgres`
2. Set `ORCHESTRATION_POSTGRES_URL`
3. Run `node scripts/orchestration-init-postgres.mjs`
4. Disable seeds outside local development with `ORCHESTRATION_ENABLE_SEED_DATA=false`
5. Keep the current API and page composition unchanged for the first standalone cut

## Required env vars

- `ORCHESTRATION_STORE_BACKEND`
- `ORCHESTRATION_POSTGRES_URL` for the recommended Postgres path
- `ORCHESTRATION_POSTGRES_SCHEMA_PATH` only if the SQL file is stored elsewhere

## Optional env vars

- `ORCHESTRATION_ENABLE_SEED_DATA`
- `ORCHESTRATION_PLATFORM_NAME`
- `ORCHESTRATION_QUEUE_LABEL`
- `NEXT_PUBLIC_ORCHESTRATION_PLATFORM_NAME`
- `NEXT_PUBLIC_ORCHESTRATION_QUEUE_LABEL`
- `ORCHESTRATION_MONGODB_URI`
- `ORCHESTRATION_MONGODB_DB`

## Build and start commands

Recommended standalone commands:

1. `npm ci`
2. `npm run config:check`
3. `npm run type-check`
4. `npm run test:unit`
5. `node scripts/orchestration-init-postgres.mjs`
6. `npm run build`
7. `npm run start`

## Container bootstrap

- use `orchestration-app/standalone/Dockerfile` as the extracted-repo Dockerfile baseline
- use `orchestration-app/standalone/.dockerignore` as the extracted-repo `.dockerignore`
- the container assumes `npm run build` and `npm run start`
- the schema init step is expected to run before app startup, not implicitly during request handling
- run `npm run config:check` before your first local or CI boot

## CI bootstrap

- see `orchestration-app/standalone/gitlab-ci.yml.example`
- see `docs/orchestration-ci-bootstrap.md`
- use `docs/orchestration-repo-layout.md` for the extracted repo target layout
- use `docs/orchestration-repo-extraction-checklist.md` for the copy-out sequence

## Temporary host-app adapters

These files are now host bindings rather than the real orchestration app:

- `pages/api/signals.ts`
- `pages/api/work-items/index.ts`
- `pages/api/work-items/[id].ts`
- `pages/api/work-items/[id]/duplicate.ts`
- `pages/work-items/index.tsx`
- `pages/work-items/[id].tsx`
- host navigation links in `components/Header.tsx`
- host landing-page links in `pages/index.tsx`

## First tasks after extraction

- rename `orchestration-app/standalone/package.template.json` to `package.json`
- move `orchestration-app/standalone/Dockerfile` to the extracted repo root or keep it in `/deploy`
- enable GitLab CI using `orchestration-app/standalone/gitlab-ci.yml.example`
- keep `scripts/orchestration-init-postgres.mjs` as the first schema bootstrap command
- copy the thin route adapters from `pages/` into the extracted repo
- add Kubernetes deployment manifests or Helm
- add standalone auth or service-to-service auth
- add ingress, secrets, and environment management

## Troubleshooting

- `Invalid ORCHESTRATION_STORE_BACKEND`: set `ORCHESTRATION_STORE_BACKEND` to `postgres` or `mongo` only.
- `requires ORCHESTRATION_POSTGRES_URL`: you selected the Postgres backend without a connection string.
- `requires ORCHESTRATION_MONGODB_URI` or `...MONGODB_DB`: you selected the Mongo backend without both required values.
- `Schema file not found`: set `ORCHESTRATION_POSTGRES_SCHEMA_PATH` or place the SQL file at `./db/orchestration-postgres.sql`.
- `Unable to initialize orchestration Postgres schema`: the DB is reachable but the SQL failed to apply; confirm permissions and database selection.
- `Unable to connect to orchestration MongoDB`: verify the Mongo URI, database name, and network access.
- build succeeds but `/work-items` fails at runtime: rerun `npm run config:check` and confirm the runtime env matches the selected backend.
- queue is empty unexpectedly: check `ORCHESTRATION_ENABLE_SEED_DATA`; local demos may want `true`, standalone environments usually want `false`.

## Remaining blockers before repo extraction

- the app shell still depends on the current Next.js and MUI host stack
- navigation entry points still live in the current host app files
- ingress, secrets, and environment management are still external
- auth and service-to-service intake auth are still undefined
- Helm or Kubernetes deployment manifests are still not present
