# Performance and Responsiveness Audit

Use this prompt to audit real product responsiveness, then convert valid findings into backlog work on `/bugs`.

## Goal

Find measured or strongly evidenced performance issues that hurt usability, launch confidence, or workflow safety. Focus on real behavior first, then code paths. Track valid issues in the backlog instead of leaving them only in prose.

## Cadence

- Conditional

## Trigger conditions

- Rendering cost increased
- Loading states changed
- Long tasks, slow mutations, retries, or reconnect flows changed
- Large lists, hydration cost, or mobile responsiveness changed
- Users reported slowness in important flows

## Required inputs

- Changed routes, loading states, and mutation paths
- Existing `/bugs` backlog items for the same surfaces
- Real production behavior, traces, or observed slowdowns
- Device-specific impact, especially on lower-powered or mobile devices

## Release-Gating

- Yes only when performance issues block usability, workflow completion, or safe launch confidence

## Start Here

Inspect, in order:

1. Changed routes, loading states, and mutation paths
2. Existing `/bugs` backlog items for the same surfaces
3. Real production behavior, traces, or observed slowdowns
4. Device-specific impact, especially on lower-powered or mobile devices

## Inspect In This Order

1. Identify real slow flows and capture evidence.
2. Separate measured regressions from inferred risk.
3. Trace likely causes in code only after confirming the user-facing slowdown.
4. Prioritize issues that affect critical workflows, not cosmetic micro-optimizations.

## Focus Areas

- Slow route loads
- Loading-state quality
- Long tasks
- Slow mutations
- Retry and reconnect cost
- Heavy lists and large surfaces
- Mobile responsiveness
- Hydration and app-shell cost

## Findings Must Include

- Finding type: `bug`, `tech debt`, `investigation`, or `human task`
- Evidence with metric, trace, or observed slowdown
- Confidence
- Affected routes, devices, and flows
- Why this matters now
- Root cause or leading hypothesis
- Duplicate or related work check
- Release-gating status if applicable
- Recommended backlog action
- Verification expectations

## Backlog Actions

Use `/bugs` as the tracking system.

- Create or update backlog items for real regressions or meaningful risks
- Merge overlapping symptoms into one root-cause ticket where appropriate
- Deduplicate existing performance tickets before adding new ones
- Close obsolete performance tickets if the issue is already fixed or no longer actionable
- Create a Human Task when the remedy requires non-code operational action such as CDN, hosting, or external service configuration

## Final Output

Provide a concise summary with:

- Surfaces audited
- Findings grouped by measured regression versus inferred risk
- Backlog items added, updated, merged, deduped, closed, or converted into Human Tasks
- Release-gating findings
- Assumptions and ambiguous cases
