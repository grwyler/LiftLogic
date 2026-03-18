# Backlog Audit and Grooming Pass

Use this prompt to clean and maintain the backlog visible on `/bugs`. This is an execution prompt, not a documentation note.

## Goal

Keep the backlog healthy, current, deduped, and actionable. Close items that are already done or no longer useful. Merge overlapping work. Reprioritize what remains. Leave the backlog easier to scan and more reliable as a planning system.

## Cadence

- Conditional

## Trigger conditions

- Backlog churn is high
- Duplicate tickets are accumulating
- Sprint closeout generated many findings
- Planning quality is degrading
- Ticket titles, categories, or priorities are inconsistent
- Large audit runs created overlapping work

## Required inputs

- The current `/bugs` backlog
- Open Human Tasks
- Recently updated and high-severity items
- Existing duplicate, parent-child, and umbrella relationships
- Any current release blockers that backlog confusion may be hiding

## Release-Gating

- Advisory by default
- Treat as release-relevant when backlog confusion is hiding active blockers, unresolved severe bugs, or duplicated release work

## `/bugs` Access Fallback

- Use the normal local `/bugs` or local authenticated API path first.
- If local `/api/feedback` or direct DB access fails, fall back to the live authenticated `/bugs` admin workflow in the browser.
- If live backlog reads time out but authenticated POST/PATCH writes still work, continue writing findings and status updates through those working browser-backed mutations.
- Do not claim backlog actions were completed unless they were actually written to `/bugs`.
- If reads are degraded but writes still work, use known work item IDs, related-work sections, and recent reconciliation context for best-effort cleanup rather than declaring the whole backlog audit blocked.

## Start Here

Inspect, in order:

1. The current backlog on `/bugs`
2. Open Human Tasks
3. Recently updated or high-severity work items
4. Items in `new`, `details copied`, `queued`, and `fixing`
5. Existing parent/child or duplicate relationships

## Audit Actions

1. Close tickets that are already fixed, obsolete, superseded, non-actionable, or duplicates.
2. Preserve closure context so future readers know why the item was closed.
3. Normalize titles and categories when that improves scanability.
4. Merge overlapping items into a single clearer source of truth where appropriate.
5. Split oversized tickets only when that makes execution materially clearer.
6. Reprioritize remaining items using current project conventions. If the conventions are unclear, prioritize by user impact, severity, urgency, dependency impact, and scope risk.
7. Separate genuine bugs, feature requests, tech debt, investigation items, and Human Tasks where possible.

## Findings and Changes Must Include

- What changed
- Why it changed
- Confidence
- Duplicate or related work check
- Resulting backlog action: `closed`, `merged`, `reprioritized`, `retitled`, `split`, `left alone`

## Backlog Rules

Use `/bugs` as the source of truth.

- Do not leave backlog-grooming conclusions only in prose if the backlog should reflect them
- Use duplicate links or parent-child relationships when supported
- Close noise instead of preserving clutter
- Be conservative when evidence is unclear
- Use Human Tasks for actions that require a person rather than Codex

## Final Output

Provide a concise summary with:

- What was closed
- What was merged or deduped
- What was reprioritized or retitled
- What was intentionally left alone
- Any assumptions or ambiguous cases
