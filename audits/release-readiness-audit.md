# Release Readiness Audit

Use this prompt to make an explicit ship decision for the current release scope and to push any blocker or required follow-up into the backlog on `/bugs`.

## Goal

Decide whether the current release should ship, ship with conditions, or not ship. Base the decision on real evidence from upstream audits, test status, rollout readiness, and unresolved risks. Track every actionable blocker or condition in the backlog.

## Cadence

- Conditional and mandatory whenever production behavior changed

## Trigger conditions

- Production behavior changed
- Any release-gating audit ran
- Unresolved severe bugs or rollout risks exist
- Monitoring, fallback, or launch checklist confidence is uncertain

## Required inputs

- Findings from applicable upstream audits
- Current test status and recent failures
- Rollback or fallback plan
- Monitoring and alerting readiness
- Open severe bugs, open Human Tasks, and unresolved launch blockers
- Target deploy or release context

## Release-Gating

- Yes

## Start Here

Inspect, in order:

1. Findings from regression, performance, data-integrity, accessibility, monetization, analytics, test-defense, maintainability, and backlog audits that apply
2. Current test status and recent failures
3. Rollback or fallback plan
4. Monitoring and alerting readiness
5. Open severe bugs, open Human Tasks, and unresolved launch blockers
6. Target deploy or release context

## Required Decision

Start the output with exactly one recommendation:

- `ship`
- `ship with conditions`
- `no ship`

## Inspect In This Order

1. Identify blockers before non-blockers.
2. Confirm whether each blocker is already tracked on `/bugs`.
3. Confirm whether release conditions are concrete and verifiable.
4. Check whether open risks are acceptable for the intended release scope.

## Findings Must Include

- Finding type: `bug`, `tech debt`, `investigation`, `human task`, or `release condition`
- Concrete evidence
- Confidence
- Affected release scope, routes, systems, user segments, or operational surfaces
- Why this matters now
- Root cause or leading hypothesis
- Duplicate or related work check
- Release-gating status
- Recommended backlog action
- Verification expectations

## Backlog Actions

Use `/bugs` as the source of truth.

- Create or update backlog items for every blocker or required release condition
- Merge overlapping blockers into a single clearer root-cause item when appropriate
- Create Human Tasks for manual rollout, credential, vendor, approval, or operational actions
- Close obsolete release blockers if the audit proves they are no longer active

## Release Decision Checklist

- Rollout risk
- Monitoring readiness
- Rollback or fallback plan
- Unresolved severe bugs
- Launch-critical regressions
- Test quality and coverage gaps
- Operational blind spots

## Final Output

Provide:

- The explicit ship recommendation
- Blocking issues before non-blocking issues
- Which backlog items were added, updated, merged, deduped, closed, or converted into Human Tasks
- Release conditions if shipping with conditions
- Assumptions and ambiguous cases
