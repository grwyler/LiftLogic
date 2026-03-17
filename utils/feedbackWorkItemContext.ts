import { FeedbackWorkItemDoc } from "./types";

export type ImplementationLink = {
  type: "route" | "schema" | "api" | "hook" | "component" | "test";
  path: string;
  label?: string;
};

export type ImplementationContext = {
  summary: string;
  confirmed: ImplementationLink[];
  inferred: ImplementationLink[];
};

export type VerificationItem = {
  id: string;
  kind: "command" | "manual" | "acceptance";
  label: string;
  command?: string;
};

export type VerificationPack = {
  summary: string;
  items: VerificationItem[];
};

const toSourceText = (workItem?: FeedbackWorkItemDoc | null) =>
  `${workItem?.title ?? ""} ${workItem?.latestDescription ?? ""}`.toLowerCase();

const hasAuditWorkflowSignals = (sourceText: string) =>
  [
    "audit",
    "sprint",
    "closeout",
    "runner",
    "dedupe",
    "umbrella-ticket",
    "owner-ready",
    "evidence",
    "confidence",
  ].some((signal) => sourceText.includes(signal));

const buildAuditContext = (): ImplementationContext => ({
  summary: "Sprint audit prompt library, sprint-closeout workflow, and bug-ticket generation process.",
  confirmed: [
    { type: "route", path: "pages/bugs.tsx", label: "Bugs inbox" },
    { type: "schema", path: "audits/run-audit.md", label: "Audit runner entrypoint" },
    { type: "schema", path: "audits/runner-notes.md", label: "Runner notes" },
    {
      type: "schema",
      path: "audits/regression-workflow-audit.md",
      label: "Regression workflow audit",
    },
    {
      type: "schema",
      path: "audits/performance-responsiveness-audit.md",
      label: "Performance audit",
    },
    {
      type: "schema",
      path: "audits/ux-clarity-visual-polish-audit.md",
      label: "UX audit",
    },
    {
      type: "schema",
      path: "audits/retention-behavior-product-coherence-audit.md",
      label: "Retention audit",
    },
    {
      type: "schema",
      path: "audits/code-quality-maintainability-audit.md",
      label: "Maintainability audit",
    },
    { type: "schema", path: "audits/backlog-audit.md", label: "Backlog audit" },
  ],
  inferred: [
    { type: "api", path: "pages/api/feedback.ts", label: "Feedback API" },
    { type: "hook", path: "utils/feedbackDetails.ts", label: "Brief formatter" },
    { type: "hook", path: "utils/feedbackWorkflow.ts", label: "Workflow fingerprinting" },
    { type: "test", path: "tests/unit/bugsPage.test.ts", label: "Bugs page test" },
    {
      type: "test",
      path: "tests/unit/feedbackCopyDetailsInstructions.test.ts",
      label: "Copy instructions test",
    },
  ],
});

const buildRoutineContext = (): ImplementationContext => ({
  summary: "Workout planner and execution surfaces.",
  confirmed: [
    { type: "route", path: "pages/routines.tsx", label: "Routines route" },
    { type: "component", path: "components/WorkoutsManager.tsx", label: "Workout manager" },
    { type: "component", path: "components/WorkoutDisplay.tsx", label: "Workout display" },
    { type: "api", path: "pages/api/workoutEntry.ts", label: "Workout entry API" },
  ],
  inferred: [
    { type: "api", path: "pages/api/routine.ts", label: "Routine API" },
    { type: "hook", path: "utils/helpers.ts", label: "Workout entry client helpers" },
    {
      type: "test",
      path: "tests/unit/workoutEntryInstanceId.test.ts",
      label: "Workout entry identity test",
    },
    {
      type: "test",
      path: "tests/unit/workoutEntryDerivedState.test.ts",
      label: "Workout entry derived-state test",
    },
  ],
});

export const buildImplementationContext = (
  workItem?: FeedbackWorkItemDoc | null
): ImplementationContext => {
  const sourceText = toSourceText(workItem);
  const explicitContext = (workItem as FeedbackWorkItemDoc & {
    implementationContext?: Partial<ImplementationContext>;
  })?.implementationContext;

  if (explicitContext?.summary || explicitContext?.confirmed || explicitContext?.inferred) {
    return {
      summary: explicitContext.summary || "",
      confirmed: explicitContext.confirmed || [],
      inferred: explicitContext.inferred || [],
    };
  }

  if (hasAuditWorkflowSignals(sourceText) || workItem?.page === "/bugs") {
    return buildAuditContext();
  }

  if (workItem?.page === "/routines" || sourceText.includes("workout")) {
    return buildRoutineContext();
  }

  return {
    summary: "",
    confirmed: [],
    inferred: [],
  };
};

export const buildVerificationPack = (
  workItem?: FeedbackWorkItemDoc | null
): VerificationPack => {
  const explicitPack = (workItem as FeedbackWorkItemDoc & {
    verificationPack?: Partial<VerificationPack>;
  })?.verificationPack;

  if (explicitPack?.summary || explicitPack?.items) {
    return {
      summary: explicitPack.summary || "",
      items: explicitPack.items || [],
    };
  }

  const sourceText = toSourceText(workItem);

  if (hasAuditWorkflowSignals(sourceText) || workItem?.page === "/bugs") {
    return {
      summary: "Validate prompt quality, ticket dedupe rules, and sprint-closeout execution behavior.",
      items: [
        {
          id: "manual-audit-run",
          kind: "manual",
          label:
            "Run a sprint closeout with the updated audit suite and confirm only applicable audits are invoked.",
        },
        {
          id: "manual-audit-dedupe",
          kind: "manual",
          label:
            "Confirm each audit resolves duplicate or related work before proposing new tickets.",
        },
        {
          id: "manual-audit-gates",
          kind: "manual",
          label:
            "Confirm release-gating audits lead with explicit ship or no-ship guidance and blocking findings.",
        },
      ],
    };
  }

  if (workItem?.page === "/routines" || sourceText.includes("workout")) {
    return {
      summary: "Validate workout-entry write safety and recovery behavior.",
      items: [
        {
          id: "command-workout-entry-tests",
          kind: "command",
          label: "Run workout-entry unit coverage",
          command:
            "npm run test:unit -- tests/unit/workoutEntryInstanceId.test.ts tests/unit/workoutEntryDerivedState.test.ts",
        },
        {
          id: "manual-routines-retry",
          kind: "manual",
          label:
            "Exercise repeated taps, retry after failure, and stale-session conflicts in the workout logging flow.",
        },
        {
          id: "manual-routines-recovery",
          kind: "manual",
          label:
            "Refresh during an in-progress workout and confirm resume or discard recovery behaves predictably.",
        },
      ],
    };
  }

  return {
    summary: "",
    items: [],
  };
};

export const getVerificationItemsByKind = (
  verificationPack: VerificationPack,
  kind: VerificationItem["kind"]
) => verificationPack.items.filter((item) => item.kind === kind);
