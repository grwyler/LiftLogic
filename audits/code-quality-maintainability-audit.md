# Code Quality and Maintainability Audit

## Cadence

- Every sprint for schema, API, workflow, and complex UI changes

## Trigger conditions

- Persistence changes, state management, fragile tests, missing safeguards, hidden coupling, duplicated logic

## Required inputs

- Changed files, tests, recent bug history, same-run tickets

## Release-gating

- Yes when maintainability issues create immediate regression or release risk

## Deliverable

Each finding must include:

- Finding type
- Evidence from code or tests
- Confidence
- Affected files, services, and ownership area
- Why now
- Root cause
- Duplicate or related work check
- Ticket recommendation that is implementation-ready or explicitly `needs-investigation`
