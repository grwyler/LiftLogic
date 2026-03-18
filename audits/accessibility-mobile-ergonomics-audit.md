# Accessibility and Mobile Ergonomics Audit

Use this prompt to run a real accessibility and mobile-ergonomics audit of the current product, then push every trackable finding into the backlog visible on `/bugs`.

## Goal

Find accessibility, mobile-ergonomics, and workflow-safety issues that affect real users in real flows. Do not stop at commentary. Convert valid findings into backlog work, merge with existing work where appropriate, and call out release blockers explicitly.

## Cadence

- Conditional

## Trigger conditions

- UI, copy, navigation, or component-system changes shipped
- Workout-time controls or interaction patterns changed
- Responsive layouts, dynamic type behavior, or motion behavior changed
- Accessibility regressions are suspected

## Required inputs

- Changed routes, components, and user flows
- The current `/bugs` backlog for related accessibility, mobile, UX, and workflow items
- Production UI or the closest production-like environment available
- Phone-sized layouts and relevant responsive states
- Focus order, keyboard behavior, motion behavior, and error states

## Release-Gating

- Yes when findings create legal or compliance risk, safety risk, or workflow-failure risk

## Start Here

Inspect, in order:

1. The changed routes and components
2. The current `/bugs` backlog for related accessibility, mobile, UX, and workflow tickets
3. The real UI in production or the closest production-like environment available
4. Phone-sized layouts first, then tablet/desktop if relevant
5. Focus order, keyboard behavior, motion behavior, and error states

Prefer observing the real interface over reasoning from code alone.

## Inspect In This Order

1. Verify the primary user flow still works on mobile without precise taps or hidden controls.
2. Check semantics, contrast, focus order, keyboard access, and basic screen-reader affordances.
3. Review dynamic type, text scaling, long labels, and overflow behavior.
4. Check reduced-motion support, animation safety, and state transitions.
5. Check touch targets, thumb reach, and workout-time readability.
6. Recheck error, loading, empty, and confirmation states.

## Focus Areas

- Contrast and legibility
- Semantics and landmarks
- Focus visibility and focus order
- Keyboard behavior
- Screen-reader basics
- Dynamic type and text scaling
- Reduced motion support
- Touch target sizing
- Thumb reach and one-handed usability
- Workout-time readability and control safety
- Error recovery and action clarity

Treat workout-time readability and control safety as first-class product quality issues, not polish.

## Findings Must Include

- Finding type: `bug`, `feature request`, `tech debt`, `investigation`, or `human task`
- Concrete evidence from the actual UI or observed behavior
- Confidence: `high`, `medium`, or `low`
- Affected routes
- Affected breakpoints and states
- Affected user segments
- Why this matters now
- Root cause or leading hypothesis
- Duplicate or related work check
- Release-gating status if applicable
- Recommended backlog action
- Verification expectations

## Backlog Actions

Use the backlog on `/bugs` as the source of truth.

For each valid finding:

- Create a new backlog item if no existing ticket covers the root cause
- Merge into or update an existing item if it already represents the work
- Mark duplicates explicitly instead of leaving parallel tickets
- Close obsolete or no-longer-actionable items if the audit proves they are already fixed or superseded
- Create a Human Task instead of a normal backlog item when the required action must be performed directly by a person

Do not leave valid findings only in prose if they should be tracked.

## Ticket Guidance

When creating or updating backlog items:

- Use a concrete, implementation-oriented title
- Distinguish bugs from feature requests cleanly
- Include affected route, breakpoint, and state
- State the user risk plainly
- Include enough detail to reproduce and verify the issue
- Use existing severity and triage conventions
- Flag compliance, safety, and workflow blockers clearly

## Final Output

Provide a concise summary with:

- What was audited
- Findings grouped by severity or risk
- Which items were added, updated, merged, deduped, closed, or converted into Human Tasks
- Which findings are release-gating
- Assumptions and ambiguous cases
