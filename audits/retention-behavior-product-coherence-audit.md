Sprint context:
- Audit the app based on the changes introduced in the most recent sprint.
- Pay special attention to newly added features, recently modified flows, and recent bug fixes.
- When possible, identify which findings are likely caused or worsened by recent sprint work.
- Prioritize findings by impact, not volume.

Save as audits/retention-behavior-product-coherence-audit.md

Context:
- This is a production fitness web app intended to scale to a large audience.
- Several new features and fixes were added this sprint.
- Prioritize issues that affect retention, adherence, clarity of product value, habit formation, and overall product coherence.
- Be concrete, not vague.
- Be critical, not polite.

You are acting as a behavioral product strategist, retention auditor, and consumer app product reviewer.

Your task is to audit whether recent sprint changes made the app more useful, more habit-forming, and more coherent — or merely more complex.

Your goal is to determine whether the product is becoming more valuable and sticky over time, especially for normal users rather than only highly motivated fitness enthusiasts.

Audit the app through these lenses:

1. Product coherence
Evaluate:
- whether the app still has a clear core promise
- whether recent features support that promise or dilute it
- whether the product feels more focused or more fragmented after the sprint

2. Adherence and habit formation
Evaluate:
- whether new changes improve consistency
- whether the app makes it easier to know the next useful action
- whether the app promotes sustainable use rather than intensity theater
- whether the app helps users recover from missed days or friction

3. Feature bloat and complexity risk
Identify:
- features that add complexity without enough value
- flows that now feel heavier or more confusing
- whether the app is becoming harder for ordinary users to navigate

4. Motivation and emotional tone
Evaluate:
- whether the experience feels motivating, realistic, and supportive
- whether changes accidentally create guilt, pressure, confusion, or discouragement
- whether users are likely to feel successful and capable

5. Retention drivers vs churn drivers
Evaluate:
- what would make users come back tomorrow, next week, and next month
- what would make users stop using the app after this sprint’s changes
- whether the app is becoming more sticky or more forgettable

6. Audience fit
Evaluate:
- whether the latest changes improve or reduce appeal to a large audience
- whether the app still works well for beginners and mainstream users
- whether new features overly favor power users or niche behaviors

Output requirements:

A. Executive Summary
Provide:
- the top 5 strengths for retention and product coherence
- the top 10 weaknesses hurting adherence or clarity
- the top 3 likely churn reasons
- the top 3 strongest reasons users may keep coming back
- the single biggest feature or pattern that now feels unnecessary or dilutive, if any

B. Scorecard
Give 1–10 scores for:
- product coherence
- clarity of core value
- support for consistency
- motivational quality
- beginner friendliness
- mainstream usability
- retention potential

C. Tickets
Create bug reports or improvement tickets in the bug tracking system so they appear on /bugs.

Each ticket must include:
- Title
- Type
- Priority
- Description
- Retention or behavior impact
- Risk if unchanged
- Proposed fix
- Acceptance criteria

D. Prioritization
Rank the top 10 changes by expected impact on retention, habit formation, and overall product usefulness.

Important instructions:
- Do not assume more features means a better product.
- Favor sustainable consistency and clarity over feature count.
- Evaluate whether the app is becoming easier to stick with or easier to abandon.
- Also ensure each ticket is not already entered or has already been addressed in the CR/DR system in /bugs.
