# Sprint Closeout Audit Orchestrator

Use this file as the single sprint-closeout runner spec. Do not run every audit by default.

## Inputs required before any audit runs

- Changed routes, APIs, schemas, jobs, and data models for the sprint
- High-risk product areas touched: workout flow, billing, onboarding, analytics, accessibility, release readiness
- Recent incidents, bug reports, regressions, and backlog churn that overlap the shipped scope
- Existing bug IDs, umbrella tickets, CR/DR links, and in-flight work that findings may map to

## Audit tiers

### Tier 1: Always-run closeout audits

1. `regression-workflow-audit.md`
2. `ux-clarity-visual-polish-audit.md`
3. `code-quality-maintainability-audit.md`

### Tier 2: Conditional audits

Run these only when the change triggers below apply.

- `performance-responsiveness-audit.md`
- `retention-behavior-product-coherence-audit.md`
- `backlog-audit.md`

## Applicability matrix

| Changed scope | Required audits | Release-gating |
| --- | --- | --- |
| Core workout flow, logging, timers, navigation, onboarding workflow | Regression, UX, Maintainability | Regression |
| Slow queries, large lists, hydration, loading states, mobile responsiveness | Performance, UX, Regression | Performance when the issue can block shipping |
| Pricing, paywalls, billing, entitlements | Regression, UX, Retention, Maintainability | Regression and Retention |
| Analytics, lifecycle messaging, comeback flows, engagement loops | Retention, UX, Regression | Retention when the change affects launch confidence |
| Data model, persistence, APIs, migrations, offline or retry logic | Maintainability, Regression, Performance | Regression |
| Backlog grooming, ticket churn, audit hygiene, repeated duplicate work | Backlog, Maintainability | Backlog is advisory unless it reveals release blockers |
| Accessibility, legal, release-readiness, launch checklist concerns | Regression, UX, Maintainability | Regression |

## Skip rules

- Skip an audit only if none of its trigger conditions match the changed scope.
- When skipping, record the reason explicitly in the final audit summary.
- Never skip regression coverage for user-visible workflow changes.
- Never skip maintainability coverage for schema, persistence, or API changes.

## Required run order

1. Determine changed scope and map it through the applicability matrix.
2. Run only the matching audits, with release-gating audits first.
3. Require every audit to produce findings using the shared evidence schema.
4. Before any new ticket is proposed, compare the finding against tickets created by prior audits in the same run.
5. Resolve collisions using the merge/link/split rules below.
6. End with one final cross-audit dedupe checkpoint from `runner-notes.md`.

## Cross-audit dedupe protocol

Every audit must include a `Duplicate or related work check` section before creating tickets.

For each finding:

- Identify the root cause in one sentence.
- List existing work item IDs, umbrella tickets, or same-run findings that might already cover it.
- Decide one of: `merge into existing umbrella`, `link as related`, `split into separate ticket`.
- Explain why that choice is correct.

Use these rules:

- Merge when multiple findings describe the same underlying fix, even if the user impact shows up across workflow, UX, retention, or maintainability.
- Link as related when the findings share context but still need separate owners, milestones, or verification paths.
- Split only when fixes can ship independently without blocking each other and the acceptance criteria do not overlap.

## Umbrella-ticket rules

- Create or update an umbrella ticket when one root cause creates meaningful fallout across multiple audit domains.
- Put the root cause, blocked surfaces, and shared evidence in the umbrella ticket.
- Put domain-specific follow-up work under linked child tickets only if the follow-up is independently actionable.
- If an umbrella ticket already exists, update it instead of filing a duplicate parent ticket.

## Shared finding schema

Each audit finding must include:

- Finding type: observed defect, measured regression, inferred risk, or strategic recommendation
- Evidence: concrete reproduction, metrics, screenshots, traces, or code references
- Confidence: high, medium, or low
- Affected scope: routes, flows, files, systems, and user segments
- Why now: why this matters for the current sprint or release
- Root cause or leading hypothesis
- Duplicate or related work check
- Ticket recommendation: implementation-ready fix ticket or explicitly labeled investigation ticket

## Final output requirements

- Ship or no-ship recommendation when any release-gating audit ran
- Blocking findings first
- List of skipped audits with reasons
- Final cross-audit dedupe checkpoint confirmation
