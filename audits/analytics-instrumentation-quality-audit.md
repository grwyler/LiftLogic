# Analytics and Instrumentation Quality Audit

## Cadence

- Conditional

## Trigger conditions

- Analytics events, funnel changes, reminders, adoption metrics, upgrade behavior, checkout telemetry, reliability alerts, operational observability updates

## Required inputs

- Event taxonomy, key funnels, dashboards or alerting context, and changed instrumentation paths
- Product analytics expectations across acquisition, activation, repeated workout use, upgrade behavior, and reliability telemetry
- Existing same-run findings and tickets

## Release-gating

- Yes when measurement gaps block launch confidence, incident detection, or trust in business-critical decisions

## Deliverable

Every finding must include:

- Finding type
- Evidence for missing, duplicated, misleading, or low-trust instrumentation
- Confidence
- Affected funnels, dashboards, alerts, operational surfaces, and user segments
- Why now
- Root cause or observability gap
- Duplicate or related work check
- Ticket recommendation that targets concrete observability gaps instead of generic tracking advice

Audit focus:

- Core journey instrumentation from acquisition through repeated workout use and upgrade behavior
- Distinguish product analytics from operational telemetry
- Check naming consistency, property quality, funnel continuity, dashboard usefulness, and alertability for workout failures and checkout regressions
