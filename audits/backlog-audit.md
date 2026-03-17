Context:

- This is a production fitness web app intended to scale to a large audience.
- The backlog includes bugs, refactors, UX improvements, performance work, product ideas, and technical debt.
- The goal is to improve backlog quality, prioritization, clarity, sequencing, and execution readiness.
- Be concrete, not vague.
- Be critical, not polite.

You are acting as a principal engineer, product-minded technical lead, and backlog-grooming strategist.

Your task is to inspect the backlog and groom it for execution quality.

Your goal is to make the backlog cleaner, more actionable, better prioritized, less redundant, and more strategically aligned.

Audit and groom the backlog through these lenses:

1. Duplicate and overlapping work

- Identify duplicate tickets, near-duplicates, overlapping fixes, and issues that should be merged.
- Identify tickets that are really the same root problem described multiple ways.
- Flag tickets that should be linked as parent/child or grouped under an umbrella item.

2. Clarity and actionability

- Identify tickets that are too vague, too broad, underspecified, or hard to implement.
- Flag tickets missing clear problem statements, expected behavior, proposed fixes, acceptance criteria, reproduction steps, or verification details.
- Recommend how to rewrite weak tickets so they are implementation-ready.

3. Priority and business value

- Re-rank tickets based on likely impact on:
  - user experience
  - retention
  - monetization
  - reliability
  - workout-time usability
  - developer velocity
  - defect risk
- Flag tickets that appear over-prioritized or under-prioritized.

4. Scope and sizing

- Identify tickets that are too large and should be split.
- Identify tickets that are too small and should be bundled.
- Distinguish between:
  - quick wins
  - medium effort / high value
  - large strategic work
  - nice-to-have / low leverage items

5. Strategic alignment

- Evaluate whether the backlog is aligned with building a fitness app that appeals to a large audience and can earn money.
- Flag backlog items that are low-value distractions.
- Highlight missing work in areas such as:
  - monetization
  - retention
  - onboarding
  - workout UX
  - performance
  - trust / polish
  - evidence-based coaching
  - maintainability

6. Dependency and sequencing

- Identify tickets that should be done before others.
- Identify hidden dependencies, blockers, or prerequisite refactors.
- Recommend better ordering where sequence matters.

7. Backlog health

- Evaluate the backlog as a system.
- Is it too noisy, too reactive, too bug-heavy, too unfocused, too technical, or too vague?
- Are there signs that important strategic work is being crowded out by low-value churn?

Required output format:

A. Overall backlog verdict
Provide:

- overall backlog health rating: strong / average / weak
- top 10 highest-leverage backlog improvements
- top 5 duplicate or merge opportunities
- top 5 tickets that should be split
- top 5 tickets that should be deprioritized
- top 5 important missing tickets that should exist but do not

B. Priority buckets
Group backlog items into:

- Do next
- Important but not urgent
- Strategic / larger initiatives
- Defer
- Drop or merge

For each item, explain why it belongs there.

C. Ticket rewrite recommendations
For the most problematic tickets, provide improved versions with:

- Title
- Type
- Priority
- Clear description
- Impact
- Proposed fix
- Acceptance criteria

D. New tickets
Create bug reports or improvement tickets in the bug tracking system so they appear on /bugs for:

- missing high-value work
- backlog structure improvements
- merge/split follow-up work where appropriate
- dependencies or prerequisites that need explicit tracking

Each ticket must include:

- Title
- Type
- Priority
- Description
- Business or engineering impact
- Proposed fix
- Acceptance criteria

E. Sequencing plan
Recommend:

- what should be done in the next sprint
- what should wait
- what should be grouped into initiatives
- what should be dropped entirely

Important instructions:

- Do not just sort by severity labels already in the backlog. Re-evaluate actual importance.
- Be willing to challenge current priorities.
- Favor clarity, impact, and execution-readiness.
- Reduce noise and duplication aggressively.
- Also ensure each ticket is not already entered or has already been addressed in the CR/DR system in /bugs.
