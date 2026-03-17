Sprint context:
- Audit the app based on the changes introduced in the most recent sprint.
- Pay special attention to newly added features, recently modified flows, and recent bug fixes.
- When possible, identify which findings are likely caused or worsened by recent sprint work.
- Prioritize findings by impact, not volume.

Save as audits/regression-workflow-audit.md

Context:
- This is a production fitness web app intended to scale to a large audience.
- Several new features, refactors, and bug fixes were added this sprint.
- Prioritize issues that affect core user workflows, reliability, trust, and user confidence.
- Be concrete, not vague.
- Be critical, not polite.

You are acting as a senior QA architect, product reliability auditor, and end-to-end workflow tester.

Your task is to audit the application for regressions, broken workflows, inconsistent behavior, and fragile user journeys introduced by recent sprint changes.

Your goal is to determine whether the app still works smoothly across its most important user flows after the latest feature work and bug fixes.

Audit the app through these lenses:

1. Core user journeys
Evaluate the end-to-end quality of the most important flows, including:
- onboarding
- account creation / login if applicable
- creating or selecting a workout plan
- starting a workout
- logging sets, reps, weight, notes, timers, and completion state
- editing workouts and exercises
- schedule-related flows
- saving and reloading progress
- viewing history or progress
- subscription / upgrade flows if applicable

2. Cross-feature regression risk
- Identify where new changes appear to have weakened old functionality.
- Look for side effects introduced by recent changes.
- Flag flows that now behave inconsistently across pages, screens, dialogs, or devices.

3. State consistency
- Check whether the UI, local state, server state, and persisted state remain synchronized.
- Identify stale UI, missing refreshes, reverted changes, phantom updates, duplicated actions, or inconsistent data rendering.

4. Error and edge-case handling
- Evaluate how the app behaves during:
  - empty states
  - canceled flows
  - partial inputs
  - fast repeated actions
  - navigation away and back
  - failed requests
  - refreshes during in-progress flows

5. Reliability of critical actions
- Identify any action where the user may think something was saved, completed, deleted, edited, or logged when it was not.
- Prioritize anything that undermines trust.

6. Workflow smoothness
- Evaluate whether important flows still feel coherent after recent additions.
- Identify added friction, confusing transitions, or places where the product now feels more fragile or cluttered.

Output requirements:

A. Executive Summary
Provide:
- the top 5 broken or fragile workflows
- the top 5 regression risks
- the 3 most user-damaging issues
- the single highest-risk regression introduced by recent work

B. Scorecard
Give 1–10 scores for:
- overall workflow reliability
- state consistency
- trustworthiness of save/update actions
- resilience to edge cases
- smoothness of core journeys
- regression risk level

C. Tickets
Create bug reports or improvement tickets in the bug tracking system so they appear on /bugs.

Each ticket must include:
- Title
- Type
- Priority
- Description
- Workflow impact
- User risk
- Proposed fix
- Acceptance criteria

D. Prioritization
Rank the top 10 issues by how badly they damage user trust and workflow reliability.

Important instructions:
- Focus on real user flows, not isolated implementation details.
- Prioritize bugs that make the app feel unreliable, confusing, or unsafe to trust.
- If the issue is caused by recent sprint changes, note that explicitly.
- Also ensure each ticket is not already entered or has already been addressed in the CR/DR system in /bugs.
