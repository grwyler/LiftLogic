# Audit Runner Notes

These notes apply to every audit run in this folder.

## Operating Rules

- Prefer production behavior for frontend and workflow validation whenever possible.
- State what changed before deciding which audits apply.
- Keep observation separate from inference.
- Put blockers before optimizations or polish.
- Use `/bugs` as the tracking system for all trackable findings.
- Do not leave valid findings only in prose if they should be tracked.
- Use Human Tasks for work that requires direct human action.
- Keep retention, product-coherence, monetization, analytics, and test-defense findings in their own lanes instead of collapsing them into one blended essay.

## Ticket Classification Rules

Use these labels conceptually when deciding what to create or update:

- `bug`: incorrect behavior, regression, broken workflow, incorrect state, or user-visible defect
- `feature request`: meaningful missing capability or UX/product gap
- `tech debt`: architecture, maintainability, test, or implementation-quality issue without a primary user-facing defect
- `investigation`: risk looks real but evidence is not yet sufficient for an implementation-ready ticket
- `human task`: requires a person, external console, policy decision, credential rotation, approval, or other manual action

## Final dedupe checkpoint

Before finishing any multi-audit run:

1. Group findings by root cause, not by audit name.
2. Confirm every finding includes a duplicate or related work check.
3. Merge duplicate root-cause findings into an umbrella ticket when appropriate.
4. Link related but independently shippable findings instead of duplicating them.
5. Remove broad symptom-only tickets that are now covered by a better parent item.
6. Confirm each remaining tracked item includes evidence, confidence, affected scope, and verification expectations.
7. Confirm release readiness consumed upstream findings instead of inventing a release call in isolation.

Any release conclusion should allow `ship`, `ship with conditions`, or `no ship`, and should confirm the release-readiness audit consumed upstream findings rather than operating in isolation.

Do not finish the audit run until this checkpoint is complete.
