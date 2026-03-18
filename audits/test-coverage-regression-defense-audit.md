# Test Coverage and Regression Defense Audit

Use this prompt to audit whether current automated defenses actually protect the changed risk areas, then track valid findings in the backlog on `/bugs`.

## Goal

Map the sprint's risky changes to current automated defense and identify the highest-value gaps. Prefer behavior-focused, workflow-protecting test work over generic "more tests" recommendations.

## Cadence

- Conditional

## Trigger conditions

- Critical workflows changed
- Architecture churn occurred
- Persistence, billing, auth, or entitlement logic changed
- Bug-fix-heavy sprints touched fragile code
- Repeated regressions suggest weak automated defense

## Required inputs

- Changed routes, APIs, stateful utilities, and recently fixed incidents
- Existing `/bugs` backlog items related to tests, regressions, or flaky coverage
- Current automated tests mapped to the changed risk areas
- Known flaky tests and implementation-detail-heavy tests

## Release-Gating

- Yes when missing or brittle coverage leaves launch-critical behavior effectively undefended

## Start Here

Inspect, in order:

1. Changed routes, APIs, stateful utilities, and recently fixed incidents
2. Existing `/bugs` backlog items related to tests, regressions, or flaky coverage
3. Current automated tests mapped to the changed risk areas
4. Known flaky tests and implementation-detail-heavy tests

## Inspect In This Order

1. Identify the highest-risk changed behaviors.
2. Check whether current tests defend those behaviors meaningfully.
3. Separate useful behavioral coverage from brittle implementation-detail tests.
4. Prefer a small number of high-value coverage repairs over broad wishlists.

Distinguish meaningful behavioral coverage from brittle implementation-detail tests.

## Findings Must Include

- Finding type: `bug`, `tech debt`, `investigation`, or `human task`
- Evidence that maps changed risk areas to current automated defense or an important gap
- Confidence
- Affected workflows, files, systems, and user segments
- Why this matters now
- Root cause or regression-defense gap
- Duplicate or related work check
- Release-gating status if applicable
- Recommended backlog action
- Verification expectations

## Backlog Actions

Use `/bugs` as the tracking system.

- Create or update backlog items for meaningful coverage gaps or brittle defenses
- Merge duplicate test-gap findings that share the same root cause
- Deduplicate against maintainability and regression-workflow tickets
- Close obsolete coverage tickets if the audit proves the defense already exists
- Create Human Tasks for external QA, device-lab, or manual test-matrix work that Codex cannot complete directly

## Ticket Guidance

- Prefer concrete titles tied to the missing defense
- Specify the workflow, failure mode, and recommended test layer
- Avoid generic "write more tests" wording

## Final Output

Provide a concise summary with:

- Changed risk areas audited
- Findings grouped by severity or shipping risk
- Backlog items added, updated, merged, deduped, closed, or converted into Human Tasks
- Release-gating findings
- Assumptions and ambiguous cases
