# Sprint Closeout Audit Orchestrator

Use this file as the Codex-ready orchestrator for sprint closeout and recurring audit runs. Do not run every audit by default. Determine scope first, run only the relevant audits, and make backlog updates part of the audit flow.

## Goal

Run the smallest useful set of audits for the changed scope, generate actionable findings, push trackable work into `/bugs`, and end with a deduped, planning-ready backlog plus an explicit release recommendation when applicable.

## Global Rules

- Inspect the real implementation, real UI, and real flows where relevant. Do not generate abstract strategy commentary without evidence.
- Use `/bugs` as the source of truth for tracking findings.
- Do not leave valid findings only in prose if they should be tracked.
- Create, update, merge, dedupe, reprioritize, or close backlog items as appropriate during the audit run.
- Use Human Tasks for actions that require a person and cannot be completed directly by Codex.
- Prefer implementation-ready tickets. Use `needs-investigation` only when evidence is incomplete.

## Backlog Access Fallback

When backlog inspection or mutation fails through the local app, local API, or direct database access, do not stop at the first failure and do not silently leave the backlog stale.

1. First try the normal local `/bugs` workflow and local authenticated API path.
2. If that fails because the local server cannot reach the database, the API returns auth errors, or the direct database connection times out, try the live authenticated `/bugs` admin surface in the browser session instead.
3. Use the live admin session to inspect, create, update, merge, or close work items when that is the only working source-of-truth path.
4. If read access works but write access still fails, record the exact blocker, the path attempted, and the items that still need mutation. Do not claim backlog updates were completed when they were not.
5. If no path can mutate `/bugs`, finish the audit with an explicit backlog-write failure section that names the affected findings and the exact follow-up needed to apply them.

## Degraded Read Path Mode

If live or local backlog reads fail but authenticated POST/PATCH writes still work:

1. Treat the unreadable backlog as a product issue to track, not as a reason to abandon the audit.
2. Continue creating and updating findings through the working write path.
3. Do best-effort dedupe using:
   - known work item IDs already present in the prompt, related-work sections, or implementation context
   - local repo evidence and recent reconciliation scripts
   - targeted PATCH updates on known items instead of relying on full collection reads
4. Only call dedupe or closeout `blocked` when a specific merge, close, or update could not be applied through any working mutation path.
5. In the final summary, distinguish clearly between:
   - `audit completed with degraded backlog reads`
   - `audit could not write required backlog actions`

Audit runs are not complete until valid findings are either written to `/bugs` or an explicit source-of-truth write blocker is documented.

## Inputs Required Before Any Audit Runs

- Changed routes, APIs, schemas, jobs, and data models
- High-risk product areas touched in the sprint
- Recent incidents, regressions, and overlapping backlog churn
- Existing work item IDs, umbrella tickets, and in-flight work that findings may map to
- Release context: target deploy, fallback plan, monitoring coverage, test status, unresolved severe issues

## Audit Selection Workflow

1. Summarize the changed scope first.
2. Check the applicability matrix below.
3. Run all matching audits and skip the rest explicitly.
4. Run release-gating domain audits before `release-readiness-audit.md`.
5. After each audit, update `/bugs` before moving on.
6. End with the cross-audit dedupe checkpoint from `runner-notes.md`.

## Tier 1: Default Closeout Audits

Run these whenever user-visible or behavior-changing work shipped:

1. `regression-workflow-audit.md`
2. `ux-clarity-visual-polish-audit.md`
3. `code-quality-maintainability-audit.md`

## Tier 2: Conditional Audits

Run only when the changed scope matches:

- `performance-responsiveness-audit.md`
- `retention-habit-loop-audit.md`
- `product-coherence-feature-creep-audit.md`
- `backlog-audit.md`
- `data-integrity-state-recovery-audit.md`
- `release-readiness-audit.md`
- `subscription-paywall-conversion-audit.md`
- `accessibility-mobile-ergonomics-audit.md`
- `analytics-instrumentation-quality-audit.md`
- `test-coverage-regression-defense-audit.md`

## Applicability matrix

| Changed scope | Required audits | Release-gating |
| --- | --- | --- |
| Core workout flow, logging, timers, navigation, onboarding workflow | Regression, UX, Maintainability | Regression |
| Slow queries, large lists, hydration, loading states, mobile responsiveness | Performance, UX, Regression | Performance when it threatens usability |
| Pricing, paywalls, billing, entitlements | Regression, UX, Subscription, Maintainability | Regression and Subscription |
| Analytics, reminders, comeback loops, engagement flows | Retention, UX, Regression, Analytics | Retention or Analytics when launch confidence is affected |
| Product sprawl, overlapping bets, audience-fit drift, complexity growth | Product Coherence, UX, Backlog | Product Coherence when the release is hard to understand or operate |
| Data model, persistence, migrations, retries, offline handling | Data Integrity, Maintainability, Regression, Performance | Data Integrity and Regression |
| Architecture churn, repeated regressions, high-risk bug-fix sprint | Test Coverage, Maintainability, Regression | Test Coverage when missing defense threatens shipping confidence |
| Backlog cleanup, ticket churn, duplicate work | Backlog | Advisory unless it hides blockers |
| Accessibility, mobile ergonomics, dynamic type, motion safety | Accessibility, UX, Regression | Accessibility when compliance or workflow risk exists |
| Production behavior, rollout risk, unresolved blockers, monitoring readiness | Release Readiness, Regression, Maintainability | Release Readiness |

## Mandatory trigger rules

- Always run `data-integrity-state-recovery-audit.md` when write semantics, retries, drafts, offline handling, or recovery behavior changed.
- Always run `release-readiness-audit.md` when production behavior changed or any release-gating audit found meaningful issues.
- Always run `subscription-paywall-conversion-audit.md` when pricing, prompts, entitlement logic, checkout flow, or billing management changed.
- Always run `accessibility-mobile-ergonomics-audit.md` when meaningful UI, copy, navigation, or component-system changes shipped.
- Always run `analytics-instrumentation-quality-audit.md` when analytics, reminders, upgrade behavior, funnel tracking, or reliability telemetry changed.
- Always run `test-coverage-regression-defense-audit.md` when the sprint includes architecture churn, repeated regressions, or critical workflow changes with uncertain automated defense.

## Skip Rules

- Skip an audit only when none of its trigger conditions match the changed scope.
- Record the skip reason explicitly in the final summary.
- Never skip regression coverage for user-visible workflow changes.
- Never skip maintainability coverage for schema, API, or persistence changes.

## Shared Finding Schema

Every audit finding must include:

- Finding type: `bug`, `feature request`, `tech debt`, `investigation`, or `human task`
- Evidence
- Confidence
- Affected scope: routes, flows, files, systems, and user segments
- Why this matters now
- Root cause or leading hypothesis
- Duplicate or related work check
- Recommended backlog action
- Verification expectations

## Cross-audit dedupe protocol

Before creating a new ticket for any finding:

1. State the root cause in one sentence.
2. Check `/bugs` for existing matching or umbrella work.
3. Choose one of:
   - `merge into existing umbrella`
   - `link as related`
   - `split into separate ticket`
4. Explain that choice briefly.

Merge when multiple audits describe the same underlying fix. Link when the context overlaps but the work is independently shippable. Split only when the fixes truly ship separately and the acceptance criteria do not overlap.

## Umbrella-ticket rules

- Create or update an umbrella ticket when one root cause creates meaningful fallout across multiple audit domains.
- Put shared evidence and root cause in the umbrella ticket.
- Use linked child tickets only when domain-specific follow-up is independently actionable.
- Update an existing umbrella ticket instead of creating a duplicate parent ticket when possible.

## Required End State

By the end of the run:

- Every valid finding that should be tracked exists on `/bugs`
- Duplicates are merged or linked instead of left parallel
- Obsolete or already-fixed items encountered during the run are closed
- Human-only work is represented in Human Tasks
- A release recommendation exists when any release-gating audit ran

## Final output requirements

Provide:

- Audits run and audits skipped with reasons
- Findings grouped by blocker versus non-blocker
- Backlog changes made during the run
- Human Tasks created if any
- Final dedupe checkpoint confirmation
- Ship, ship with conditions, or no-ship recommendation when applicable
