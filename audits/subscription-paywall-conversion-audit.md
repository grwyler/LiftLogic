# Subscription and Paywall Conversion Audit

Use this prompt to audit the real premium path, then track valid findings in the backlog on `/bugs`.

## Goal

Find trust, clarity, timing, pricing, checkout, entitlement, cancellation, and churn-defense issues across the premium path. Focus on real product behavior and real flows. Track valid issues in the backlog instead of leaving them only in prose.

## Cadence

- Conditional

## Trigger conditions

- Pricing or paywall copy changed
- Entitlement messaging changed
- Upgrade prompts changed
- Checkout or billing flow changed
- Billing management or cancellation handling changed
- Churn-prevention surfaces changed

## Required inputs

- Pricing, paywall, upgrade-prompt, checkout, billing-management, and cancellation surfaces
- Existing `/bugs` backlog items related to monetization, checkout, entitlements, and billing trust
- The actual premium path from first exposure through post-purchase management
- Entitlement and billing state transitions in code where necessary

## Release-Gating

- Yes when monetization changes create trust, billing, or launch-confidence risk

## `/bugs` Access Fallback

- Use the normal local `/bugs` or local authenticated API path first.
- If local `/api/feedback` or direct DB access fails, fall back to the live authenticated `/bugs` admin workflow in the browser.
- If live backlog reads time out but authenticated POST/PATCH writes still work, continue writing findings and status updates through those working browser-backed mutations.
- Do not claim backlog actions were completed unless they were actually written to `/bugs`.

## Start Here

Inspect, in order:

1. Pricing, paywall, upgrade-prompt, checkout, billing-management, and cancellation surfaces
2. Existing `/bugs` backlog items related to monetization, checkout, entitlements, and billing trust
3. The actual premium path from first exposure through post-purchase management
4. Entitlement and billing state transitions in code where necessary

## Inspect In This Order

1. Check first premium exposure and value communication.
2. Check upgrade timing and prompt quality.
3. Check checkout handoff and completion path.
4. Check post-purchase management, downgrade, cancel, and recovery states.
5. Distinguish healthy conversion improvements from manipulative or beginner-hostile upgrade patterns.

## Focus Areas

- Value communication
- Timing of premium exposure
- Pricing clarity
- Checkout friction
- Entitlement clarity
- Billing-management states
- Cancellation and churn-defense handling
- Trust signals and beginner safety

## Findings Must Include

- Finding type: `bug`, `feature request`, `investigation`, or `human task`
- Evidence from the actual premium or billing-management flow
- Confidence
- Affected touchpoints, conversion stages, and user segments
- Why this matters now
- Root cause or trust gap
- Duplicate or related work check
- Release-gating status if applicable
- Recommended backlog action
- Verification expectations

## Backlog Actions

Use `/bugs` as the tracking system.

- Create or update backlog items for valid monetization findings
- Merge overlapping pricing, paywall, and checkout issues into a clearer single source of truth when appropriate
- Deduplicate against analytics, UX, and retention tickets
- Close obsolete monetization tickets if the audit proves they are already implemented or superseded
- Create Human Tasks for vendor, billing-console, legal, or policy actions that require a person

## Final Output

Provide a concise summary with:

- The premium path audited
- Findings grouped by severity or conversion trust risk
- Backlog items added, updated, merged, deduped, closed, or converted into Human Tasks
- Release-gating findings
- Assumptions and ambiguous cases
