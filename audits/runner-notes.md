# Runner Notes

These notes apply to every sprint-closeout audit run.

## Global rules

- Prefer production behavior for frontend and workflow validation whenever possible.
- State what changed before deciding which audits apply.
- Keep evidence concrete and separate observation from inference.
- Blocking release findings must appear before optimization or polish findings.
- Any release-readiness conclusion must be explicit: `ship`, `ship with conditions`, or `no ship`.
- When blockers exist, list blocker severity, affected surface, and required follow-up before any non-blocking improvements.

## Final dedupe checkpoint

Before final ticket generation, stop and review all executed audits together.

Checklist:

- Group findings by root cause rather than by audit name.
- Confirm every finding has a `Duplicate or related work check` section.
- Merge duplicate root-cause findings into an umbrella ticket where appropriate.
- Link related but independently shippable findings instead of duplicating ticket text.
- Remove broad symptom-only tickets that are now covered by a more specific parent ticket.
- Confirm each remaining ticket lists evidence, confidence, affected scope, owner hint, and verification expectations.
- Confirm the release-readiness audit consumed upstream findings instead of inventing a release call in isolation.

Do not finish the audit run until this checkpoint is complete.
