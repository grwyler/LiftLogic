# Release Readiness Audit

## Cadence

- Conditional and mandatory whenever production behavior changed

## Trigger conditions

- Any sprint with user-visible workflow changes, release-gating findings, rollout risk, unresolved severe bugs, monitoring gaps, or launch checklist concerns

## Required inputs

- Findings from regression, performance, data integrity, monetization, accessibility, analytics, maintainability, and backlog audits when applicable
- Current test status, rollback or fallback plan, monitoring readiness, unresolved sev-1 and sev-2 bugs, and deploy context
- Existing same-run tickets and open release blockers

## Release-gating

- Yes

## Deliverable

Start with one explicit release recommendation:

- `ship`
- `ship with conditions`
- `no ship`

Then include:

- Blocking issues before non-blocking improvements
- Evidence for each blocker or condition
- Confidence
- Affected release scope, user segments, and operational surfaces
- Why now
- Root cause or leading hypothesis
- Duplicate or related work check
- Ticket recommendation with required follow-ups, owner hint, and verification expectations

Release decision checklist:

- Rollout risk, monitoring readiness, fallback plans, unresolved severe bugs, and launch-critical regressions
- Test quality, audit coverage gaps, and operational blind spots
- Whether open issues are shippable with conditions or require a no-ship decision
