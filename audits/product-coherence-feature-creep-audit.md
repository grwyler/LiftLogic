# Product Coherence and Feature Creep Audit

Use this prompt to audit whether the product still feels like one coherent product, then track valid findings in the backlog on `/bugs`.

## Goal

Find scope drift, overlapping bets, unnecessary complexity, and unclear product hierarchy before they calcify into product clutter. This audit should help prune, merge, simplify, or refocus work rather than adding more surface area by default.

## Cadence

- Conditional

## Trigger conditions

- Major scope expansion landed
- New product surfaces were added
- Overlapping roadmap bets appeared
- Complexity or setup burden increased
- Audience fit or core-promise clarity became uncertain

## Required inputs

- Recently changed product surfaces
- Existing `/bugs` backlog items from UX, monetization, backlog, and retention audits that touch the same scope
- Current positioning, onboarding, and the product's core promise or job-to-be-done
- Evidence of duplicated features, setup complexity, or overlapping flows

## Release-Gating

- Advisory by default
- Yes when product drift or complexity makes the release hard to understand or safely operate

## Start Here

Inspect, in order:

1. Recently changed product surfaces
2. Existing `/bugs` backlog items from UX, monetization, backlog, and retention audits that touch the same scope
3. Current positioning, onboarding, and the product's core job-to-be-done
4. Evidence of duplicated features, setup complexity, or overlapping flows

## Inspect In This Order

1. Identify the current core promise in one sentence.
2. Check whether the changed product surfaces reinforce or fragment that promise.
3. Identify overlapping features, duplicate workflows, and unnecessary complexity.
4. Prefer simplification, consolidation, or removal over additive recommendations.

## Focus Areas

- Core product promise clarity
- Complexity growth
- Feature sprawl
- Overlapping workflows
- Audience-fit drift
- Setup burden
- Hierarchy and scope discipline

Do not re-run monetization, UX, or retention analysis inside this prompt unless it is necessary to explain coherence drift.

## Findings Must Include

- Finding type: `bug`, `feature request`, `tech debt`, `investigation`, or `human task`
- Evidence for product sprawl, overlap, or unclear promise
- Confidence
- Affected routes, user segments, and decision points
- Why this matters now
- Root cause or coherence gap
- Duplicate or related work check
- Release-gating status if applicable
- Recommended backlog action
- Verification expectations

## Backlog Actions

Use `/bugs` as the tracking system.

- Create or update backlog items when a real product-coherence issue should be tracked
- Merge duplicate product-strategy tickets into clearer umbrella items when possible
- Close stale or superseded strategy tickets when the current product direction makes them obsolete
- Create Human Tasks for strategy, research, or decision work that cannot be completed directly by Codex

## Ticket Guidance

- Prefer titles that describe the core drift clearly
- Recommend narrowing scope, merging overlap, clarifying hierarchy, or removing drift
- Avoid vague "improve product strategy" tickets

## Final Output

Provide a concise summary with:

- The product areas audited
- Findings grouped by severity or strategic risk
- Backlog items added, updated, merged, deduped, closed, or converted into Human Tasks
- Release-gating findings if any
- Assumptions and ambiguous cases
