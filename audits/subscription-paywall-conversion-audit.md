# Subscription and Paywall Conversion Audit

## Cadence

- Conditional

## Trigger conditions

- Pricing changes, paywall copy, entitlement messaging, upgrade prompts, checkout flow, billing management, cancellation handling, churn prevention surfaces

## Required inputs

- Production pricing surfaces, upgrade prompts, checkout and post-purchase flows
- Entitlement rules, billing-management states, cancellation handling, and churn-touchpoint context
- Existing same-run findings and tickets

## Release-gating

- Yes when monetization changes create trust, billing, or launch-confidence risk

## Deliverable

Every finding must include:

- Finding type
- Evidence from the actual premium path or billing-management flow
- Confidence
- Affected touchpoints, user segments, and conversion stages
- Why now
- Root cause or trust gap
- Duplicate or related work check
- Ticket recommendation with owner hint and verification expectations

Audit focus:

- First premium exposure through checkout completion and post-purchase management
- Value communication, friction, timing, pricing clarity, and trust signals
- Distinguish manipulative or beginner-hostile upgrade patterns from legitimate conversion improvements
