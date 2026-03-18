# Data Integrity and State Recovery Audit

Use this prompt to audit write safety, state recovery, and persistence trust, then turn valid findings into backlog work on `/bugs`.

## Goal

Find real data-integrity, persistence, recovery, and state-divergence issues before they damage user trust. Focus on actual write paths, retry behavior, refresh recovery, and conflict scenarios. Track valid issues in the backlog instead of leaving them only in prose.

## Cadence

- Conditional and mandatory for persistence-heavy changes

## Trigger conditions

- Workout drafts, logging writes, scheduling writes, or billing writes changed
- Delete, skip, retry, reconnect, or offline flows changed
- Optimistic updates or persistence contracts changed
- Refresh recovery or state resumption changed

## Required inputs

- Changed write paths across UI, API, jobs, storage, and schemas
- Existing `/bugs` backlog items related to data integrity, retries, recovery, drafts, idempotency, and corruption
- Known incidents involving duplicate writes, missing saves, corrupted history, or state divergence
- Repro steps for create, update, delete, skip, refresh, retry, reconnect, and conflict scenarios

## Release-Gating

- Yes when the audit finds data loss, duplicate writes, corruption, unrecoverable drafts, or state divergence

## Start Here

Inspect, in order:

1. Changed write paths across UI, API, jobs, storage, and schemas
2. Existing `/bugs` backlog items related to data integrity, retries, recovery, drafts, idempotency, and corruption
3. Known incidents involving duplicate writes, missing saves, corrupted history, or state divergence
4. Repro steps for create, update, delete, skip, refresh, retry, reconnect, and conflict scenarios

## Inspect In This Order

1. Verify create, update, delete, and skip semantics.
2. Check repeated taps, retries, reconnect behavior, and idempotency.
3. Check optimistic updates versus persisted truth.
4. Check refresh recovery, resume behavior, and rollback safety.
5. Distinguish UI lag from actual persistence failure before escalating.

## Focus Areas

- Creation, update, delete, skip, retry, refresh, reconnect, and recovery semantics
- Idempotency and repeated taps
- Optimistic updates and conflict handling
- Draft persistence and rollback safety
- Edit history and cross-surface consistency
- State divergence across UI, API, and storage

## Findings Must Include

- Finding type: `bug`, `tech debt`, `investigation`, or `human task`
- Evidence showing whether the issue is visual lag, actual persistence corruption, or both
- Confidence
- Affected routes, write paths, storage boundaries, and user segments
- Why this matters now
- Root cause or leading hypothesis
- Duplicate or related work check
- Release-gating status if applicable
- Recommended backlog action
- Verification expectations

## Backlog Actions

Use `/bugs` as the tracking system.

For each valid finding:

- Create or update the best matching backlog item
- Merge related symptoms into the same root-cause ticket where appropriate
- Deduplicate repeated persistence failures across routes
- Close obsolete or already-fixed items when the audit proves they are no longer active
- Create a Human Task when external operational recovery or manual data repair is required

## Ticket Guidance

- Use titles that describe the failure mode, not just the symptom
- Include affected write path and failure scenario
- Mark trust-damaging issues clearly
- Use `needs-investigation` when evidence is incomplete but risk is real

## Final Output

Provide a concise summary with:

- What write paths and recovery scenarios were audited
- Findings grouped by severity or trust risk
- Backlog items added, updated, merged, deduped, closed, or converted into Human Tasks
- Release-gating findings
- Assumptions and ambiguous cases
