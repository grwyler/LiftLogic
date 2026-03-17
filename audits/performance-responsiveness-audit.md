Sprint context:
- Audit the app based on the changes introduced in the most recent sprint.
- Pay special attention to newly added features, recently modified flows, and recent bug fixes.
- When possible, identify which findings are likely caused or worsened by recent sprint work.
- Prioritize findings by impact, not volume.

Save as audits/performance-responsiveness-audit.md

Context:
- This is a production fitness web app intended to scale to a large audience.
- Several new features and fixes were added this sprint.
- Prioritize issues that affect perceived speed, actual responsiveness, workout momentum, and mobile usability.
- Be concrete, not vague.
- Be critical, not polite.

You are acting as a senior front-end performance engineer and workout UX performance auditor.

Your task is to audit the application for performance regressions, responsiveness issues, render inefficiencies, and slow interactions introduced or worsened by recent sprint changes.

Your goal is to determine whether the app still feels fast, responsive, and smooth during real use — especially during workouts.

Audit the app through these lenses:

1. Page and route performance
Evaluate:
- page load times
- route transitions
- time to interactive
- delays in screen readiness
- perceived slowness during navigation

2. Workout-time responsiveness
Evaluate:
- logging latency
- delays after taps/clicks
- timer responsiveness
- save/update responsiveness
- screen lag during active workout flows
- whether the app keeps momentum during repetitive actions

3. Rendering efficiency
Identify:
- unnecessary renders
- poor memoization
- large component re-renders
- expensive lists
- recalculation hotspots
- state updates causing visible lag

4. Network and async performance
Evaluate:
- slow API calls
- blocking requests
- poor optimistic UI behavior
- overfetching
- bad loading-state handling
- retry/failure behavior under unstable connectivity

5. Animation and interaction smoothness
Evaluate:
- animation smoothness
- scroll smoothness
- modal/dialog responsiveness
- visual jank
- stutter during logging or navigation

6. Mobile realism
Evaluate the app as if the user is:
- tired
- moving quickly
- using one hand
- on a phone
- on average or weak network conditions

Output requirements:

A. Executive Summary
Provide:
- the top 5 issues hurting responsiveness
- the top 3 actual speed problems
- the top 3 perceived speed problems
- the 3 fixes most likely to make the app feel dramatically faster

B. Scorecard
Give 1–10 scores for:
- actual performance
- perceived performance
- workout-time responsiveness
- route/navigation speed
- rendering efficiency
- mobile usability under load

C. Tickets
Create bug reports or improvement tickets in the bug tracking system so they appear on /bugs.

Each ticket must include:
- Title
- Type
- Priority
- Description
- Performance impact
- User/workout impact
- Proposed fix
- Acceptance criteria

D. Prioritization
Rank the top 10 performance issues by how much they damage user experience and workout momentum.

Important instructions:
- Distinguish between measured speed problems and perceived speed problems.
- Prioritize anything that interrupts workout flow.
- Ignore theoretical micro-optimizations unless they meaningfully affect the user experience.
- Also ensure each ticket is not already entered or has already been addressed in the CR/DR system in /bugs.
