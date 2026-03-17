Sprint context:
- Audit the app based on the changes introduced in the most recent sprint.
- Pay special attention to newly added features, recently modified flows, and recent bug fixes.
- When possible, identify which findings are likely caused or worsened by recent sprint work.
- Prioritize findings by impact, not volume.

Save as audits/code-quality-maintainability-audit.md

Context:
- This is a production fitness web app intended to scale to a large audience.
- Several new features, fixes, and refactors were added this sprint.
- Prioritize issues that affect maintainability, developer velocity, defect risk, readability, and long-term scalability.
- Be concrete, not vague.
- Be critical, not polite.

You are acting as a senior software architect, maintainability auditor, and code quality reviewer.

Your task is to audit the codebase for maintainability regressions, DRY violations, poor abstractions, architectural drift, and coding-practice issues introduced or worsened by recent sprint work.

Your goal is to identify what will make the app harder to extend, harder to debug, more fragile, or slower to iterate on over time.

Audit the codebase through these lenses:

1. DRY and code reuse
Identify:
- duplicated business logic
- duplicated UI logic
- duplicated state logic
- duplicated API handling
- duplicated validation or transformation logic
- duplicated workflow logic introduced by recent sprint changes

2. Separation of concerns
Evaluate whether:
- presentation, business logic, state, side effects, and data fetching are cleanly separated
- files or components now do too many things
- new code introduced blurred boundaries

3. Component and module quality
Evaluate:
- component size
- coupling
- cohesion
- reusability
- prop surface complexity
- file organization
- whether new sprint work created overly large or fragile modules

4. Readability and clarity
Evaluate:
- naming
- structure
- consistency
- magic values
- hidden assumptions
- hard-to-follow flows
- code that is technically valid but hard to reason about

5. State management and data flow
Identify:
- duplicated derived state
- prop mirroring
- stale-state risks
- conflicting sources of truth
- overcomplicated updates
- sprint changes that made data flow less predictable

6. Error handling and safety
Evaluate:
- async safety
- null/undefined handling
- edge-case resilience
- fallback behavior
- silent failures
- swallowed errors

7. Scalability of architecture
Evaluate:
- whether this codebase is becoming easier or harder to extend
- whether recent sprint work increased architectural consistency or drift
- whether local fixes are accumulating into long-term maintenance drag

Output requirements:

A. Executive Summary
Provide:
- the top 5 maintainability strengths
- the top 10 code quality weaknesses
- the top 5 DRY/reuse problems
- the top 5 highest-risk architectural issues
- the single highest-leverage refactor

B. Scorecard
Give 1–10 scores for:
- maintainability
- DRY / reuse quality
- readability
- separation of concerns
- component/module design
- state management quality
- error handling resilience
- architectural scalability

C. Tickets
Create bug reports or improvement tickets in the bug tracking system so they appear on /bugs.

Each ticket must include:
- Title
- Type
- Priority
- Description
- Engineering impact
- Risk if unchanged
- Proposed fix
- Acceptance criteria

D. Prioritization
Rank the top 15 improvements by expected impact on maintainability, defect reduction, and developer velocity.

Important instructions:
- Do not recommend abstraction for its own sake.
- Distinguish between acceptable repetition and harmful duplication.
- Focus on issues that matter as the codebase grows.
- Also ensure each ticket is not already entered or has already been addressed in the CR/DR system in /bugs.
