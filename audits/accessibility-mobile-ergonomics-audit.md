# Accessibility and Mobile Ergonomics Audit

## Cadence

- Conditional

## Trigger conditions

- UI changes, copy changes, navigation changes, workout-time controls, component-system updates, mobile layouts, dynamic type, motion behavior

## Required inputs

- Production screenshots or real UI review across phone-sized layouts
- Assistive-technology considerations, focus order, keyboard behavior, touch-target measurements, and motion settings
- Existing same-run findings and tickets

## Release-gating

- Yes when findings create compliance, safety, or workflow-failure risk

## Deliverable

Every finding must include:

- Finding type
- Evidence from the actual interface or assistive-technology behavior
- Confidence
- Affected routes, breakpoints, states, and user segments
- Why now
- Root cause
- Duplicate or related work check
- Ticket recommendation with owner hint and verification expectations

Audit focus:

- Contrast, semantics, focus, screen-reader basics, keyboard behavior, dynamic type, reduced motion, touch targets, thumb reach, and error recovery
- Distinguish legal or compliance risk from general polish issues
- Treat workout-time readability and control safety as first-class concerns, not optional UX subpoints
