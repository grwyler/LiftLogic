# Sprint Closeout Audit Orchestrator

Use this file as the single sprint-closeout runner spec. Do not run every audit by default.

## Inputs required before any audit runs

- Changed routes, APIs, schemas, jobs, and data models for the sprint
- High-risk product areas touched: workout flow, billing, onboarding, analytics, accessibility, release readiness
- Recent incidents, bug reports, regressions, and backlog churn that overlap the shipped scope
- Existing bug IDs, umbrella tickets, CR/DR links, and in-flight work that findings may map to
- Release context: target deploy, rollback plan, monitoring coverage, test status, unresolved sev-1/sev-2 issues

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
- `data-integrity-state-recovery-audit.md`
- `release-readiness-audit.md`
- `subscription-paywall-conversion-audit.md`
- `accessibility-mobile-ergonomics-audit.md`
- `analytics-instrumentation-quality-audit.md`

## Applicability matrix

| Changed scope | Required audits | Release-gating |
| --- | --- | --- |
| Core workout flow, logging, timers, navigation, onboarding workflow | Regression, UX, Maintainability | Regression |
| Slow queries, large lists, hydration, loading states, mobile responsiveness | Performance, UX, Regression | Performance when the issue can block shipping |
| Pricing, paywalls, billing, entitlements | Regression, UX, Subscription, Maintainability | Regression and Subscription |
| Analytics, lifecycle messaging, comeback flows, engagement loops | Retention, UX, Regression | Retention when the change affects launch confidence |
| Data model, persistence, APIs, migrations, offline or retry logic | Data Integrity, Maintainability, Regression, Performance | Data Integrity and Regression |
| Backlog grooming, ticket churn, audit hygiene, repeated duplicate work | Backlog, Maintainability | Backlog is advisory unless it reveals release blockers |
| Accessibility, legal, dynamic type, motion safety, mobile ergonomics | Accessibility, UX, Regression | Accessibility when the issue creates compliance or workflow risk |
| Analytics, funnel instrumentation, alerting, adoption metrics, checkout telemetry | Analytics, Retention, Regression | Analytics when measurement gaps block launch confidence |
| Production behavior, release checklist, unresolved blockers, rollout or monitoring risk | Release Readiness, Regression, Maintainability | Release Readiness |

### Mandatory trigger rules

- Run `data-integrity-state-recovery-audit.md` whenever workout logging, scheduling, billing writes, persistence contracts, retries, offline handling, or draft recovery behavior changed.
- Run `release-readiness-audit.md` whenever the sprint changes production behavior or any release-gating audit produced meaningful findings.
- Run `subscription-paywall-conversion-audit.md` whenever pricing, prompts, entitlement logic, checkout flow, or billing management changed.
- Run `accessibility-mobile-ergonomics-audit.md` whenever meaningful UI, copy, navigation, or component-system changes shipped.
- Run `analytics-instrumentation-quality-audit.md` whenever analytics events, funnel tracking, reminders, upgrade behavior, or reliability telemetry changed.

## Skip rules

- Skip an audit only if none of its trigger conditions match the changed scope.
- When skipping, record the reason explicitly in the final audit summary.
- Never skip regression coverage for user-visible workflow changes.
- Never skip maintainability coverage for schema, persistence, or API changes.

## Required run order

1. Determine changed scope and map it through the applicability matrix.
2. Run only the matching audits, with release-gating domain audits first.
3. Run dependency audits before `release-readiness-audit.md` so the release call can consume regression, performance, data-integrity, monetization, and backlog findings.
4. Require every audit to produce findings using the shared evidence schema.
5. Before any new ticket is proposed, compare the finding against tickets created by prior audits in the same run.
6. Resolve collisions using the merge/link/split rules below.
7. End with one final cross-audit dedupe checkpoint from `runner-notes.md`.

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

- Ship, ship with conditions, or no-ship recommendation when any release-gating audit ran
- Blocking findings first
- List of skipped audits with reasons
- Final cross-audit dedupe checkpoint confirmation
