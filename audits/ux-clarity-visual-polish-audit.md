# UX Clarity and Visual Polish Audit

Use this prompt to audit changed user-visible surfaces for clarity and polish, then track valid findings in the backlog on `/bugs`.

## Goal

Find clarity, hierarchy, affordance, copy, state, and visual-polish issues in the real product experience. Focus on actual UI and actual flows. Track valid issues in the backlog instead of leaving them only in prose.

## Cadence

- Every sprint for changed user-visible surfaces

## Trigger conditions

- Layout changed
- Copy changed
- Interaction states changed
- Navigation or hierarchy changed
- Mobile behavior changed
- Visual polish or component presentation changed

## Required inputs

- Changed routes and user-visible surfaces
- Existing `/bugs` backlog items related to UX, clarity, hierarchy, copy, and visual polish
- The real UI in production or the closest production-like environment available
- Mobile states first when the change affects active use flows

## Release-Gating

- Yes only when the issue causes workflow failure, severe ambiguity, or accessibility risk

## Start Here

Inspect, in order:

1. Changed routes and user-visible surfaces
2. Existing `/bugs` backlog items related to UX, clarity, hierarchy, copy, and visual polish
3. The real UI in production or the closest production-like environment available
4. Mobile states first when the change affects active use flows

## Inspect In This Order

1. Check the primary action and next-step clarity.
2. Check layout hierarchy, scanability, and affordances.
3. Check copy clarity and state messaging.
4. Check loading, empty, success, and error states.
5. Check visual polish issues that materially affect trust or comprehension.

## Findings Must Include

- Finding type: `bug`, `feature request`, `investigation`, or `human task`
- Evidence from the actual interface
- Confidence
- Affected routes, breakpoints, and states
- Why this matters now
- Root cause or leading hypothesis
- Duplicate or related work check
- Release-gating status if applicable
- Recommended backlog action
- Verification expectations

## Backlog Actions

Use `/bugs` as the tracking system.

- Create or update backlog items for valid UX issues
- Merge overlapping clarity or polish tickets into a clearer single item when appropriate
- Deduplicate against accessibility, retention, and product-coherence findings
- Close obsolete UX tickets if the audit proves they are already implemented or superseded
- Create Human Tasks only when the fix requires direct human creative or operational work that Codex cannot perform

## Final Output

Provide a concise summary with:

- The UI surfaces audited
- Findings grouped by severity or user-friction level
- Backlog items added, updated, merged, deduped, closed, or converted into Human Tasks
- Release-gating findings
- Assumptions and ambiguous cases
