# Retention and Habit Loop Audit

Use this prompt to audit whether the product helps people start, return, and keep going, then track valid findings in the backlog on `/bugs`.

## Goal

Find retention, comeback, motivation, and repeat-use gaps in the real product experience. Focus on actual user flows and touchpoints, not abstract retention commentary. Track valid work in the backlog and use Human Tasks for manual follow-up where needed.

## Cadence

- Conditional

## Trigger conditions

- Onboarding changed
- Comeback loops changed
- Reminder behavior changed
- Motivation or streak framing changed
- Weekly review or repeat-use loops changed
- Workout return behavior changed

## Required inputs

- First-session, second-session, and return-after-lapse flows
- Existing `/bugs` backlog items related to retention, comeback, reminders, onboarding, and motivation
- Current funnel and reminder context
- User segments most likely to bounce or lapse

## Release-Gating

- Yes when shipped changes materially affect activation, comeback confidence, or repeat-use health

## Start Here

Inspect, in order:

1. First-session, second-session, and return-after-lapse flows
2. Existing `/bugs` backlog items related to retention, comeback, reminders, onboarding, and motivation
3. Current funnel and reminder context
4. User segments most likely to bounce or lapse

## Inspect In This Order

1. Check the path from signup to first workout.
2. Check whether the second workout is invited clearly.
3. Check comeback flows after friction, missed sessions, or lapses.
4. Check whether reminders, review loops, and progress signals support return behavior without shame.

## Focus Areas

- First workout activation
- Second workout invitation
- Comeback guidance after lapses
- Motivation and reassurance
- Weekly rituals and review loops
- Reminder timing and framing
- Streak framing and pressure
- Beginner confidence and repeat-use clarity

## Findings Must Include

- Finding type: `bug`, `feature request`, `investigation`, or `human task`
- Evidence from the actual retention loop, comeback flow, or repeat-use surface
- Confidence
- Affected user segments, touchpoints, and motivation states
- Why this matters now
- Root cause or habit-loop gap
- Duplicate or related work check
- Release-gating status if applicable
- Recommended backlog action
- Verification expectations

## Backlog Actions

Use `/bugs` as the tracking system.

- Create or update backlog items for valid retention gaps
- Merge overlapping retention findings into a clearer root-cause item when appropriate
- Deduplicate against UX, analytics, and product-coherence tickets
- Close obsolete retention tickets if the audit proves they are already implemented or superseded
- Create Human Tasks for manual reminder, messaging, or campaign work that Codex cannot complete directly

## Final Output

Provide a concise summary with:

- Flows and segments audited
- Findings grouped by severity or retention risk
- Backlog items added, updated, merged, deduped, closed, or converted into Human Tasks
- Release-gating findings
- Assumptions and ambiguous cases
