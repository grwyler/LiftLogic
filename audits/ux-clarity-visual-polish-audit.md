Sprint context:
- Audit the app based on the changes introduced in the most recent sprint.
- Pay special attention to newly added features, recently modified flows, and recent bug fixes.
- When possible, identify which findings are likely caused or worsened by recent sprint work.
- Prioritize findings by impact, not volume.

Save as audits/ux-clarity-visual-polish-audit.md

Context:
- This is a production fitness web app intended to scale to a large audience.
- Several new features and fixes were added this sprint.
- Prioritize issues that affect clarity, usability, trust, visual consistency, perceived quality, and product polish.
- Be concrete, not vague.
- Be critical, not polite.

You are acting as a senior product designer, visual design auditor, and UX clarity reviewer.

Your task is to audit the application for visual inconsistency, clutter, hierarchy problems, design regressions, and presentation issues introduced or worsened by recent sprint work.

Your goal is to determine whether the app still feels polished, coherent, trustworthy, and easy to use after the latest changes.

Audit the app through these lenses:

1. Visual consistency
Evaluate:
- colors
- spacing
- typography
- button styles
- cards
- inputs
- dialogs
- tabs
- icons
- chart or stat presentation
- whether recent sprint work introduced one-off styles or visual drift

2. Visual hierarchy
Evaluate:
- whether the most important information is visually obvious
- whether screens are easy to scan
- whether primary actions are emphasized enough
- whether secondary information competes too much for attention

3. UX clarity
Evaluate:
- whether users know what to do next
- whether new features made the app more confusing
- whether labels, actions, flows, and feedback are clear
- whether dialogs and forms are easy to understand

4. Workout-time clarity
Evaluate:
- visual focus during active workouts
- readability under fatigue
- button prominence
- timer visibility
- logging clarity
- distraction vs focus

5. First-impression quality and trust
Evaluate:
- whether the app feels polished and credible
- whether recent additions made it feel more cluttered, generic, or unfinished
- whether the visual design supports willingness to trust and pay

6. Accessibility and readability
Evaluate:
- contrast
- readability
- text sizing
- color reliance
- state visibility
- whether polish has come at the expense of usability

Output requirements:

A. Executive Summary
Provide:
- the top 5 visual/UX strengths
- the top 10 visual/UX weaknesses
- the biggest issue hurting clarity
- the biggest issue hurting polish
- the single highest-leverage visual or UX improvement

B. Scorecard
Give 1–10 scores for:
- visual polish
- clarity of hierarchy
- consistency of components
- workout-time usability
- readability
- trust/premium feel
- overall UX coherence

C. Tickets
Create bug reports or improvement tickets in the bug tracking system so they appear on /bugs.

Each ticket must include:
- Title
- Type
- Priority
- Description
- UX or design impact
- User or business impact
- Proposed fix
- Acceptance criteria

D. Prioritization
Rank the top 15 visual and UX issues by expected impact on clarity, trust, and perceived product quality.

Important instructions:
- Distinguish between subjective taste and issues that materially affect usability or trust.
- Prioritize issues that make the app feel cluttered, amateurish, inconsistent, or hard to use.
- Also ensure each ticket is not already entered or has already been addressed in the CR/DR system in /bugs.
