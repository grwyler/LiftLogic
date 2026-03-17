export type AppChangelogEntry = {
  version: string;
  releasedAt: string;
  summary: string;
  changes: string[];
  testFocus: string[];
};

export const APP_CHANGELOG: AppChangelogEntry[] = [
  {
    version: "0.1.7",
    releasedAt: "2026-03-17",
    summary: "Added internal release notes, issue labels, and a cleaner top-five export handoff for bug-fix work.",
    changes: [
      "Made the developer version badge and issue-version chips open a changelog modal with release notes and test focus guidance.",
      "Added editable labels on feedback work items plus label-based filtering in the bugs inbox.",
      "Moved the release completion checklist so it only appears at the end of the top-five copied issue export.",
    ],
    testFocus: [
      "Click the version badge and a version chip in the bugs inbox to confirm the changelog opens with the 0.1.7 notes.",
      "Add labels to a work item, save them, and filter the queue by one of those labels.",
      "Use both copy flows and confirm the release checklist appears only in the top-five export, not the single-item copy action.",
    ],
  },
  {
    version: "0.1.6",
    releasedAt: "2026-03-17",
    summary: "Tightened the copied feedback brief so bug-fix work starts with clearer validation guidance.",
    changes: [
      "Refined the copied feedback implementation brief to keep the section order stable.",
      "Clarified that front-end and end-to-end verification should prefer production behavior when possible.",
      "Locked the copy-details guidance in with focused unit coverage.",
    ],
    testFocus: [
      "Copy issue details from the bugs inbox and confirm the implementation brief still includes the expected sections in the same order.",
      "Check that verification guidance still points auditors toward production behavior instead of only local runs.",
    ],
  },
  {
    version: "0.1.5",
    releasedAt: "2026-03-17",
    summary: "Expanded the bug workflow and polished core workout, auth, and pricing surfaces.",
    changes: [
      "Added richer feedback workflow handling across the bugs inbox, API helpers, and copied implementation briefs.",
      "Refined workout execution surfaces including exercise items, completed-set treatment, rest timer behavior, and panel styling.",
      "Updated pricing, sign-in, sign-up, and home-page presentation for clearer product direction and safer layout behavior.",
    ],
    testFocus: [
      "Walk the bugs workflow end to end: load work items, edit fields, copy details, and save triage changes.",
      "Run a workout session and check the logging flow, completed-set visuals, and rest timer overlay.",
      "Sanity-check home, pricing, sign-in, and sign-up layouts on mobile and desktop.",
    ],
  },
  {
    version: "0.1.4",
    releasedAt: "2026-03-16",
    summary: "Shipped the first larger orchestration surfaces alongside more workout-flow and bug-workflow updates.",
    changes: [
      "Introduced orchestration queue and work-item routes, APIs, persistence layers, and standalone bootstrap docs.",
      "Extended the internal bugs workflow and feedback export path with stronger queue semantics.",
      "Improved routine execution, quick actions, celebration moments, recurring schedules, and related workout helpers.",
    ],
    testFocus: [
      "Open orchestration and work-item flows to confirm the new queue pages and APIs behave correctly.",
      "Retest the bugs inbox after triage updates and copy-details actions.",
      "Exercise key workout flows: routine load, quick-add, recurring schedule edits, and completion recap behavior.",
    ],
  },
  {
    version: "0.1.3",
    releasedAt: "2026-03-16",
    summary: "Focused on workout interaction polish plus the first work-item and orchestration groundwork.",
    changes: [
      "Improved workout display, exercise dialogs, set logging, and recovery of stale interaction state.",
      "Added early work-item routes and orchestration domain plumbing for the extracted review flow.",
      "Tightened related feedback, planner, and progress-summary copy around the workout experience.",
    ],
    testFocus: [
      "Run through set logging, exercise dialogs, and day switching to catch any interaction regressions.",
      "Check the early work-item pages and orchestration endpoints if they are enabled in the environment.",
    ],
  },
];

export const getChangelogEntry = (version?: string | null) => {
  const normalizedVersion = String(version || "").trim().replace(/^v/i, "");

  if (!normalizedVersion) {
    return null;
  }

  return (
    APP_CHANGELOG.find((entry) => entry.version === normalizedVersion) || null
  );
};
