# Analytics and Instrumentation Quality Audit

Use this prompt to audit real analytics, telemetry, and observability behavior, then turn valid findings into backlog work on `/bugs`.

## Goal

Verify that product analytics and operational telemetry are trustworthy enough to support product decisions, funnel analysis, and incident detection. Focus on real implementation, not intended tracking. Track valid gaps in the backlog instead of leaving them only in prose.

## Cadence

- Conditional

## Trigger conditions

- Analytics events changed
- Funnel steps changed
- Reminder or lifecycle messaging changed
- Upgrade, pricing, checkout, or retention flows changed
- Reliability telemetry, alerting, or observability changed

## Required inputs

- Changed routes, APIs, jobs, and instrumentation paths
- The current `/bugs` backlog for analytics, funnels, alerts, reminders, billing, and reliability
- Real event emission points and expected trigger flows
- Dashboards, alerts, and reporting surfaces used for launch confidence

## Release-Gating

- Yes when measurement gaps block launch confidence, incident detection, or trust in business-critical decisions

## Start Here

Inspect, in order:

1. Changed routes, APIs, jobs, and instrumentation paths
2. Existing `/bugs` backlog items related to analytics, funnels, alerts, reminders, billing, and reliability
3. Real event emission points in code and the actual product flows that should trigger them
4. Dashboards, alerting paths, and any reporting surfaces used for launch confidence

Distinguish product analytics from operational telemetry throughout the audit.

## Inspect In This Order

1. Map core journeys: acquisition, signup, onboarding, first workout, repeat workout, upgrade, checkout, and billing management.
2. Confirm that expected events exist and fire at the correct moments.
3. Check naming consistency, property completeness, and event trustworthiness.
4. Check for duplicated, missing, misleading, or low-signal instrumentation.
5. Check whether dashboards and alerts can actually detect workout failures and checkout regressions.
6. Check whether measurement is sufficient for product decisions, not just raw event presence.

## Focus Areas

- Event naming consistency
- Property completeness and quality
- Funnel continuity
- Missing events
- Duplicate events
- Misleading or low-trust instrumentation
- Dashboard usefulness
- Alertability for workout failures
- Alertability for checkout regressions
- Separation between product analytics and operational telemetry

## Findings Must Include

- Finding type: `bug`, `feature request`, `tech debt`, `investigation`, or `human task`
- Concrete evidence for missing, duplicated, misleading, or low-trust instrumentation
- Confidence
- Affected funnels, dashboards, alerts, and systems
- Affected user segments or environments
- Why this matters now
- Root cause or observability gap
- Duplicate or related work check
- Release-gating status if applicable
- Recommended backlog action that targets concrete observability gaps
- Verification expectations

## Backlog Actions

Use `/bugs` as the tracking system.

For each valid finding:

- Create or update the backlog item that best matches the root cause
- Merge overlapping instrumentation findings into a single clearer source of truth when appropriate
- Deduplicate aggressively across monetization, retention, and reliability findings
- Close obsolete analytics tickets if the audit proves they are already implemented or superseded
- Create a Human Task when the required action must happen in an external analytics or alerting system

Do not leave trackable findings only in the audit prose.

## Ticket Guidance

- Prefer implementation-oriented titles over generic "improve tracking" language
- State the exact gap in instrumentation, dashboarding, or alerting
- Include affected funnel stage, event path, and operational consequence
- Use existing severity and triage conventions
- Mark launch-confidence and incident-detection blockers clearly

## Final Output

Provide a concise summary with:

- The flows and systems audited
- Findings grouped by severity or business risk
- Backlog items added, updated, merged, deduped, closed, or converted into Human Tasks
- Release-gating findings
- Assumptions and ambiguous cases
