# Orchestration CI Bootstrap

## Baseline jobs

Use this minimum pipeline in a standalone repo:

- install dependencies
- type-check
- unit tests
- production build
- optional Postgres schema init check
- optional container build

## Starter config

A GitLab-oriented starter file lives at:

- `orchestration-app/standalone/gitlab-ci.yml.example`

It is intentionally generic and avoids any Lift Logic-specific steps.

## Recommended follow-up once extracted

- add a dedicated Postgres service container for integration checks
- add a container registry push step
- gate deployments on build and schema checks
- add environment-specific deploy jobs later for staging and production
