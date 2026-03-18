# Regression Workflow Audit

Use this prompt to audit changed user-visible workflows for regressions, then track valid findings in the backlog on `/bugs`.

## Goal

Find regressions in real user workflows and persistence behavior before they ship or linger. This is a practical audit: inspect the real flows, reproduce issues where possible, and push valid findings into the backlog.

## Cadence

- Every sprint when user-visible workflows or persistence behavior changed

## Trigger conditions

- User-visible workflows changed
- Persistence behavior changed
- Workout flow, onboarding, auth, billing, logging, navigation, or scheduling changed

## Required inputs

- Changed routes, APIs, and workflow entry points
- Existing `/bugs` backlog items for the same flows or root causes
- Real repro steps for the touched workflow
- High-risk error, loading, retry, and recovery states

## Release-Gating

- Yes

## Start Here

Inspect, in order:

1. Changed routes, APIs, and workflow entry points
2. Existing `/bugs` backlog items for the same flows or root causes
3. Real repro steps for the touched workflow
4. High-risk error, loading, retry, and recovery states

## Inspect In This Order

1. Re-run the primary workflow end to end.
2. Re-run adjacent states: loading, empty, error, retry, refresh, cancel, and completion.
3. Check persistence or state transitions that the flow depends on.
4. Compare against recent regressions and already-open umbrella tickets before creating new work.

## Findings Must Include

- Finding type: `bug`, `investigation`, `feature request`, or `human task`
- Concrete evidence from the workflow
- Confidence
- Affected routes, files, and flows
- Why this matters now
- Root cause or leading hypothesis
- Duplicate or related work check
- Release-gating status if applicable
- Recommended backlog action
- Verification expectations

Use `needs-investigation` when evidence is incomplete but the risk is real.

## Backlog Actions

Use `/bugs` as the tracking system.

- Create new backlog items only when no existing item covers the root cause
- Update or merge into an existing umbrella item when the regression is already represented
- Close stale or no-longer-reproducible items when the audit proves they are obsolete
- Create Human Tasks only for external, manual, or operational follow-up

## Final Output

Provide a concise summary with:

- Workflows audited
- Findings grouped by severity or workflow risk
- Backlog items added, updated, merged, deduped, closed, or converted into Human Tasks
- Release-gating findings
- Assumptions and ambiguous cases
