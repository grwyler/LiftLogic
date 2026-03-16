# Orchestration Extraction Plan

## Goal

Extract the orchestration prototype into a standalone internal service without
changing its current domain behavior.

## Recommended move set

Move these directories and files into the new repo first:

- `domain/orchestration`
- `server/orchestration`
- `pages/api/signals.ts`
- `pages/api/work-items`
- `pages/work-items`
- `db/orchestration-postgres.sql`
- `docs/orchestration-postgres-schema.md`
- orchestration-focused tests:
  - `tests/unit/orchestrationService.test.ts`
  - `tests/unit/orchestrationWorkflowService.test.ts`
  - `tests/unit/orchestrationApi.test.ts`
  - `tests/unit/orchestrationSerialization.test.ts`
  - `tests/unit/postgresStore.test.ts`
  - `tests/unit/orchestrationTestStore.ts`

## Generic dependencies that can move as-is

- `mongodb`
- `pg`
- `uuid`
- `next`
- `react`
- `@mui/material`
- current orchestration domain types and persistence interfaces

## Current host-app dependencies to replace or isolate

- `pages/*` route wiring is still Next.js pages-router specific
- queue/detail UI currently assumes MUI and Next.js page SSR
- host navigation entry points live in:
  - `components/Header.tsx`
  - `pages/index.tsx`
- current API hosting assumes the Lift Logic Next.js runtime
- current review actor defaults are generic, but not yet tied to standalone auth

## Infrastructure still missing after extraction

- Dockerfile and local container scripts
- GitLab CI pipeline wiring
- Postgres migration/init execution strategy in deployment
- Kubernetes manifests or Helm chart
- standalone auth and service-to-service auth
- ingress, networking, and secret management
- observability wiring for logs, metrics, and tracing

## Recommended extraction order

1. Move `domain/orchestration` and `server/orchestration` into a new package or
   repo and keep the persistence interface unchanged.
2. Move the SQL schema and persistence adapter tests so Postgres remains the
   default portable backend.
3. Recreate the current API surface in the new service using the same request
   and response shapes.
4. Move the queue/detail UI into the new app or replace it with a thin client
   against the extracted API.
5. Replace Lift Logic host navigation links with standalone navigation and app
   shell.
6. Add deployment assets: Docker, CI, migrations, Kubernetes, secrets, and auth.

## Practical notes

- The orchestration persistence layer is already portable across Mongo and
  Postgres through `domain/orchestration/persistence.ts`.
- The remaining extraction work is mostly host-runtime packaging, deployment,
  and auth rather than domain redesign.
- Keep raw `signals` immutable in the extracted service exactly as they work now.
