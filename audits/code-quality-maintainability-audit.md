# Code Quality and Maintainability Audit

Use this prompt to audit the real codebase for maintainability and regression risk, then turn valid findings into backlog work on `/bugs`.

## Goal

Find code-quality, maintainability, and architecture issues that materially increase regression risk, delivery cost, or system fragility. Focus on real code and real tests. Track valid issues in the backlog instead of leaving them only in prose.

## Cadence

- Every sprint for schema, API, workflow, persistence, and complex stateful UI changes

## Trigger conditions

- Schema, API, persistence, or workflow code changed
- Stateful UI or complex component logic changed
- Architecture churn occurred
- Bug-fix-heavy sprints touched fragile code
- Tests became flaky or implementation-detail-heavy

## Required inputs

- Changed files and highest-risk touched systems
- Existing `/bugs` backlog items for the same files, workflows, or root causes
- Related tests and recent regressions
- Shared utilities, contracts, and persistence boundaries

## Release-Gating

- Yes when maintainability issues create immediate regression risk or release risk

## Start Here

Inspect, in order:

1. Changed files and the highest-risk touched systems
2. Existing `/bugs` backlog items for the same files, workflows, or root causes
3. Related tests and recent regressions
4. Shared utilities, contracts, and persistence boundaries

## Inspect In This Order

1. Identify hidden coupling, duplicated logic, and architectural drift.
2. Check state management, validation, error handling, and edge-case safety.
3. Check persistence and data-handling patterns for fragility.
4. Check whether current tests actually protect behavior.
5. Separate high-value maintainability risk from style-only concerns.

## Focus Areas

- Hidden coupling
- Duplicated logic
- Risky persistence or data handling
- Missing safeguards
- Poor state-management patterns
- Overly complex logic
- Fragile or flaky tests
- Missing coverage in high-risk paths
- Violations of existing architectural patterns
- Likely future regression hotspots

## Findings Must Include

- Finding type: `bug`, `tech debt`, `feature request`, `investigation`, or `human task`
- Evidence from code, tests, or failure history
- Confidence
- Affected files, systems, and ownership area if inferable
- Why this matters now
- Root cause or leading hypothesis
- Duplicate or related work check
- Release-gating status if applicable
- Recommended backlog action
- Verification expectations

Mark items as implementation-ready or explicitly `needs-investigation`.

## Backlog Actions

Use `/bugs` as the tracking system.

For each valid finding:

- Create a new item if no existing work item matches the root cause
- Update or merge with an existing item if the root cause is already represented
- Deduplicate aggressively across bugs, tech debt, and repeated audit findings
- Close obsolete or already-completed items if the audit proves they no longer need action
- Create a Human Task when the follow-up cannot be performed directly by Codex

## Ticket Guidance

- Use implementation-oriented titles
- Include specific file paths and systems
- Explain the concrete problem and likely regression risk
- Prefer targeted repairs over broad rewrites
- Use project severity and triage conventions

## Final Output

Provide a concise summary with:

- Findings grouped by risk level
- Backlog items added, updated, merged, deduped, closed, or converted into Human Tasks
- Release-gating issues
- Findings left as `needs-investigation`
- Assumptions and ambiguous cases
