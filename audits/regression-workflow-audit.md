# Regression Workflow Audit

## Cadence

- Every sprint when user-visible workflows or persistence behavior changed

## Trigger conditions

- Workout flow, onboarding, auth, billing, logging, navigation, scheduling, data writes

## Required inputs

- Changed routes and APIs
- Repro steps for the touched workflow
- Existing tickets created earlier in the same audit run

## Release-gating

- Yes

## Deliverable

For each finding, include:

- Finding type: observed defect, measured regression, inferred risk, or strategic recommendation
- Evidence
- Confidence
- Affected routes, files, and flows
- Why now
- Root cause or leading hypothesis
- Duplicate or related work check
- Ticket recommendation with owner hint and verification expectations

Ticket rules:

- Use `needs-investigation` when evidence is incomplete.
- Update an existing umbrella ticket instead of creating a duplicate when the same root cause already exists.
