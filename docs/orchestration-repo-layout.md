# Orchestration Repo Layout

## Intended standalone repo structure

```text
signal-orchestrator/
  pages/
    api/
      signals.ts
      work-items/
    work-items/
  orchestration-app/
    api/
    pages/
    ui/
    routes.ts
  domain/
    orchestration/
  server/
    orchestration/
  utils/
    orchestrationAppConfig.ts
  scripts/
    orchestration-init-postgres.mjs
  db/
    orchestration-postgres.sql
  docs/
    orchestration-postgres-schema.md
    orchestration-standalone-bootstrap.md
    orchestration-ci-bootstrap.md
    orchestration-repo-layout.md
    orchestration-repo-extraction-checklist.md
  tests/
    unit/
  Dockerfile
  .dockerignore
  .env.example
  package.json
  tsconfig.json
  next.config.js
  next-env.d.ts
  vitest.config.ts
```

## Current-to-future mapping

- `orchestration-app/api/*` -> keep as-is
- `orchestration-app/pages/*` -> keep as-is
- `orchestration-app/ui/*` -> keep as-is
- `orchestration-app/routes.ts` -> keep as-is
- `domain/orchestration/*` -> keep as-is
- `server/orchestration/*` -> keep as-is
- `utils/orchestrationAppConfig.ts` -> keep as-is
- `scripts/orchestration-init-postgres.mjs` -> keep as-is
- `db/orchestration-postgres.sql` -> keep as-is
- `orchestration-app/standalone/package.template.json` -> rename to `package.json`
- `orchestration-app/standalone/.env.example` -> move to `.env.example`
- `orchestration-app/standalone/Dockerfile` -> move to `Dockerfile`
- `orchestration-app/standalone/.dockerignore` -> move to `.dockerignore`
- `orchestration-app/standalone/gitlab-ci.yml.example` -> rename to `.gitlab-ci.yml`
- `pages/api/signals.ts` -> copy the thin adapter version into the new repo
- `pages/api/work-items/*` -> copy the thin adapter version into the new repo
- `pages/work-items/*` -> copy the thin adapter version into the new repo
- `components/Header.tsx` -> host-only, do not move
- `pages/index.tsx` -> host-only, do not move

## Router note

The current standalone-ready surface still assumes the Next.js pages router.
The first extracted repo can stay on pages router for speed. Moving to app
router is optional follow-up work, not required for first standalone boot.

## Minimal extracted root files

At first extraction, keep these root files from the current repo:

- `next.config.js`
- `tsconfig.json`
- `next-env.d.ts`
- `vitest.config.ts`
- generated `package-lock.json` after creating the standalone `package.json`
