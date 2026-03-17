# Performance Responsiveness Audit

## Cadence

- Conditional

## Trigger conditions

- Rendering cost, loading states, long tasks, slow mutations, retries, offline handling, heavy lists

## Required inputs

- Performance traces, production behavior, affected devices, loading metrics
- Existing same-run tickets and related backlog items

## Release-gating

- Only when the issue blocks usability or safe launch confidence

## Deliverable

Every finding must separate measured regression from inferred risk and include:

- Evidence with metric or observed slowdown
- Confidence
- Affected surfaces
- Why now
- Root cause hypothesis
- Duplicate or related work check
- Ticket recommendation with verification expectations
