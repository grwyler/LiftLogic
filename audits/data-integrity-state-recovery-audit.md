# Data Integrity and State Recovery Audit

## Cadence

- Conditional and mandatory for persistence-heavy changes

## Trigger conditions

- Workout drafts, logging writes, scheduling writes, delete flows, billing writes, offline handling, retries, reconnect flows, refresh recovery, optimistic updates, persistence contracts

## Required inputs

- Changed write paths across UI, API, storage, jobs, and schemas
- Known incidents or bug reports involving duplicate writes, missing saves, corrupted history, or state divergence
- Repro steps for create, update, delete, skip, refresh, retry, reconnect, and conflict scenarios
- Existing same-run findings and tickets

## Release-gating

- Yes when the audit finds trust-damaging data loss, duplicate writes, corruption, unrecoverable drafts, or state divergence

## Deliverable

For each finding, include:

- Finding type: observed defect, measured regression, inferred risk, or strategic recommendation
- Evidence showing whether the issue is visual lag, actual persistence corruption, or both
- Confidence
- Affected routes, write paths, storage boundaries, and user segments
- Why now
- Root cause or leading hypothesis
- Duplicate or related work check
- Ticket recommendation with severity guidance, owner hint, and verification expectations

Audit focus:

- Creation, update, delete, skip, retry, refresh, reconnect, and recovery semantics
- Idempotency, repeated taps, optimistic updates, retries, and conflict handling
- Draft persistence, edit history, rollback safety, and cross-surface consistency
- Distinguish UI latency from genuine persistence failure before escalating
