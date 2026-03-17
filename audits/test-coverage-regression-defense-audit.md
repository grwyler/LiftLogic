# Test Coverage and Regression Defense Audit

## Cadence

- Conditional

## Trigger conditions

- Critical workflow changes, architecture churn, high-risk bug-fix sprints, persistence changes, billing or entitlement changes, or areas with repeated regressions

## Required inputs

- Changed routes, APIs, stateful utilities, and recently fixed incidents for the sprint
- Current automated tests mapped to the changed risk areas
- Known flaky tests, implementation-detail-heavy tests, and uncovered release-critical behaviors

## Release-gating

- Yes when missing or brittle coverage leaves launch-critical behavior effectively undefended

## Deliverable

Every finding must include:

- Finding type
- Evidence that maps changed risk areas to current automated defenses or important gaps
- Confidence
- Affected workflows, files, systems, and user segments
- Why now
- Root cause or regression-defense gap
- Duplicate or related work check
- Ticket recommendation that proposes a small number of high-value tests or coverage repairs instead of generic "write more tests" advice

Audit focus:

- Distinguish meaningful behavioral coverage from brittle implementation-detail tests
- Check risky sprint changes against workflow, integration, and state-recovery defenses
- Prefer gaps that threaten shipping confidence over nice-to-have coverage expansion
