import {
  FeedbackBugArchetype,
  FeedbackBugContext,
  FeedbackDerivedCommit,
  FeedbackImplementationContext,
  FeedbackItemDoc,
  FeedbackStructuredRepro,
  FeedbackVerificationPack,
  FeedbackWorkItemDoc,
} from "./types";

export type ImplementationLink = {
  type: "route" | "schema" | "api" | "hook" | "component" | "test";
  path: string;
  label?: string;
  note?: string;
};

export type ImplementationContext = {
  summary: string;
  confirmed: ImplementationLink[];
  inferred: ImplementationLink[];
  derived?: FeedbackImplementationContext["derived"];
};

export type VerificationItem = {
  id: string;
  kind: "command" | "manual" | "acceptance" | "done";
  label: string;
  command?: string;
};

export type VerificationPack = {
  summary: string;
  items: VerificationItem[];
};

type WorkItemContextInput = Partial<FeedbackWorkItemDoc> & {
  implementationContext?: Partial<ImplementationContext>;
  verificationPack?: Partial<VerificationPack>;
};

const toSourceText = (workItem?: WorkItemContextInput | null) =>
  `${workItem?.title ?? ""} ${workItem?.latestDescription ?? ""}`.toLowerCase();

const normalizeText = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

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
      path: "audits/retention-habit-loop-audit.md",
      label: "Retention audit",
    },
    {
      type: "schema",
      path: "audits/product-coherence-feature-creep-audit.md",
      label: "Product coherence audit",
    },
    {
      type: "schema",
      path: "audits/code-quality-maintainability-audit.md",
      label: "Maintainability audit",
    },
    { type: "schema", path: "audits/backlog-audit.md", label: "Backlog audit" },
    {
      type: "schema",
      path: "audits/test-coverage-regression-defense-audit.md",
      label: "Regression defense audit",
    },
  ],
  inferred: [
    { type: "api", path: "pages/api/feedback.ts", label: "Feedback API" },
    { type: "hook", path: "utils/feedbackWorkItemContext.ts", label: "Work item intelligence" },
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

const getLikelyFilesFromRoute = (page?: string, route?: string) => {
  const likelyFiles = new Set<string>();

  [page, route].forEach((candidate) => {
    const path = String(candidate || "")
      .trim()
      .split("?")[0]
      .replace(/\/+$/, "");

    if (!path || !path.startsWith("/")) {
      return;
    }

    if (path === "/") {
      likelyFiles.add("pages/index.tsx");
      return;
    }

    likelyFiles.add(`pages${path}.tsx`);
    likelyFiles.add(`pages${path}/index.tsx`);
  });

  return likelyFiles;
};

const fileSignalPattern =
  /((?:[a-z]:)?[\\/](?:[^\\/\s:'")]+[\\/])+[^\\/\s:'")]+\.(?:[jt]sx?|mjs|cjs)|(?:pages|components|utils|server|tests|audits)[\\/][^\\/\s:'")]+\.(?:[jt]sx?|mjs|cjs|md))/gi;

const parseStackClues = (value: unknown) => {
  const source = String(value ?? "");
  return Array.from(new Set(source.match(fileSignalPattern) || [])).map((entry) =>
    entry.replace(/\\/g, "/")
  );
};

const ownershipFromPath = (value: string) => {
  const normalized = value.replace(/\\/g, "/").replace(/^[a-z]:/i, "");
  const segments = normalized.split("/").filter(Boolean);
  if (segments.length >= 2) {
    return `${segments[0]}/${segments[1]}`;
  }
  return segments[0] || "";
};

const readGitLogOutput = (filePath: string) => {
  if (typeof window !== "undefined") {
    return "";
  }

  try {
    const dynamicRequire = Function("return require")() as NodeJS.Require;
    const childProcess = dynamicRequire("child_process") as typeof import("child_process");
    return childProcess.execSync(
      `git log -n 2 --pretty=format:%H%x09%s -- "${filePath}"`,
      {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      }
    );
  } catch {
    return "";
  }
};

const readRecentCommits = (filePaths: string[]): FeedbackDerivedCommit[] => {
  const commits: FeedbackDerivedCommit[] = [];
  const seen = new Set<string>();

  filePaths.slice(0, 5).forEach((filePath) => {
    const output = readGitLogOutput(filePath);

    output
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .forEach((line) => {
        const [sha, summary] = line.split("\t");
        if (!sha || !summary || seen.has(`${sha}:${filePath}`)) {
          return;
        }
        seen.add(`${sha}:${filePath}`);
        commits.push({
          sha: sha.slice(0, 12),
          summary,
          file: filePath,
        });
      });
  });

  return commits.slice(0, 6);
};

const buildDerivedContext = (workItem?: WorkItemContextInput | null) => {
  const sourceText = toSourceText(workItem);
  const likelyFiles = getLikelyFilesFromRoute(
    workItem?.page,
    workItem?.latestRuntimeContext?.route
  );

  const stackClues = Array.from(
    new Set([
      ...parseStackClues(workItem?.latestDescription),
      ...parseStackClues(workItem?.title),
    ])
  );

  stackClues.forEach((clue) => likelyFiles.add(clue));

  if (workItem?.page === "/bugs" || sourceText.includes("copy details")) {
    [
      "pages/bugs.tsx",
      "utils/feedbackDetails.ts",
      "utils/feedbackWorkItemContext.ts",
      "tests/unit/feedbackDetails.test.ts",
      "tests/unit/feedbackCopyDetailsInstructions.test.ts",
      "tests/unit/feedbackApi.test.ts",
    ].forEach((file) => likelyFiles.add(file));
  }

  const likelyFilePaths = Array.from(likelyFiles);
  const ownershipHints = Array.from(
    new Set(likelyFilePaths.map((filePath) => ownershipFromPath(filePath)).filter(Boolean))
  );
  const runtimeProvenance = [
    workItem?.latestRuntimeContext?.environment
      ? `Environment: ${workItem.latestRuntimeContext.environment}`
      : "",
    workItem?.latestRuntimeContext?.route
      ? `Route: ${workItem.latestRuntimeContext.route}`
      : "",
    workItem?.latestRuntimeContext?.appVersion
      ? `App version: ${workItem.latestRuntimeContext.appVersion}`
      : "",
    workItem?.latestRuntimeContext?.commitSha
      ? `Build commit: ${workItem.latestRuntimeContext.commitSha}`
      : "",
  ].filter(Boolean);

  const openQuestions: string[] = [];
  if (!workItem?.latestRuntimeContext?.commitSha) {
    openQuestions.push("Runtime commit SHA is missing.");
  }
  if (stackClues.length === 0) {
    openQuestions.push("No stack-trace file clues were captured.");
  }

  return {
    likelyFilePaths,
    ownershipHints,
    stackClues,
    runtimeProvenance,
    recentCommits: readRecentCommits(likelyFilePaths),
    openQuestions,
  };
};

export const buildImplementationContext = (
  workItem?: WorkItemContextInput | null
): ImplementationContext => {
  const sourceText = toSourceText(workItem);
  const explicitContext = workItem?.implementationContext;

  const base =
    hasAuditWorkflowSignals(sourceText) || workItem?.page === "/bugs"
      ? buildAuditContext()
      : workItem?.page === "/routines" || sourceText.includes("workout")
      ? buildRoutineContext()
      : {
          summary: "",
          confirmed: [],
          inferred: [],
        };

  return {
    summary: explicitContext?.summary || base.summary || "",
    confirmed: explicitContext?.confirmed || base.confirmed || [],
    inferred: explicitContext?.inferred || base.inferred || [],
    derived: explicitContext?.derived || buildDerivedContext(workItem),
  };
};

const buildBugArchetypeAcceptanceItems = (archetype?: FeedbackBugArchetype): VerificationItem[] => {
  switch (archetype) {
    case "ui":
      return [
        {
          id: "acceptance-ui-proof",
          kind: "acceptance",
          label: "UI bug includes selectors, screenshots, or viewport context that makes the repro actionable.",
        },
      ];
    case "api":
      return [
        {
          id: "acceptance-api-contract",
          kind: "acceptance",
          label: "API bug captures the endpoint, request/response shape, or schema path involved.",
        },
      ];
    case "performance":
      return [
        {
          id: "acceptance-performance-benchmark",
          kind: "acceptance",
          label: "Performance bug records the benchmark or metric delta used to judge the fix.",
        },
      ];
    case "refactor":
      return [
        {
          id: "acceptance-refactor-boundary",
          kind: "acceptance",
          label: "Refactor bug lists the touched systems and contract risks that must stay intact.",
        },
      ];
    default:
      return [];
  }
};

export const buildVerificationPack = (
  workItem?: WorkItemContextInput | null
): VerificationPack => {
  const explicitPack = workItem?.verificationPack;

  if (explicitPack?.summary || explicitPack?.items) {
    return {
      summary: explicitPack.summary || "",
      items: explicitPack.items || [],
    };
  }

  const sourceText = toSourceText(workItem);
  const archetypeItems = buildBugArchetypeAcceptanceItems(workItem?.bugArchetype);

  if (hasAuditWorkflowSignals(sourceText) || workItem?.page === "/bugs") {
    return {
      summary: "Validate the triage workflow, copied instructions, and resolution gates.",
      items: [
        {
          id: "command-bugs-core-tests",
          kind: "command",
          label: "Run bug workflow unit coverage",
          command:
            "npm run test:unit -- tests/unit/bugsPage.test.ts tests/unit/feedbackDetails.test.ts tests/unit/feedbackCopyDetailsInstructions.test.ts tests/unit/feedbackApi.test.ts",
        },
        {
          id: "manual-bugs-render",
          kind: "manual",
          label:
            "Open a bug work item and verify the structured repro, Start here, and verification panels render.",
        },
        {
          id: "manual-bugs-copy",
          kind: "manual",
          label:
            "Copy details and confirm the exported text includes Start here, structured repro, and verification sections.",
        },
        {
          id: "manual-bugs-gates",
          kind: "manual",
          label:
            "Attempt to move a bug into queued or fixing without the required fields and confirm the workflow blocks it unless values are marked Unknown where allowed.",
        },
        ...archetypeItems,
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
        ...archetypeItems,
      ],
    };
  }

  return {
    summary: "",
    items: archetypeItems,
  };
};

export const getVerificationItemsByKind = (
  verificationPack: VerificationPack,
  kind: VerificationItem["kind"]
) => verificationPack.items.filter((item) => item.kind === kind);

export const inferStructuredRepro = ({
  title,
  description,
  page,
  bugReport,
}: {
  title?: string;
  description?: string;
  page?: string;
  bugReport?: FeedbackItemDoc["bugReport"];
}): FeedbackStructuredRepro | undefined => {
  const normalizedTitle = normalizeText(title);
  const normalizedDescription = normalizeText(description);
  const currentPath = normalizeText(bugReport?.currentPath);
  const affectedFlow = normalizeText(page) || currentPath || undefined;

  if (!normalizedTitle && !normalizedDescription && !affectedFlow) {
    return undefined;
  }

  const reproSteps = [
    currentPath ? `Open ${currentPath}` : "",
    normalizedDescription || normalizedTitle,
  ].filter(Boolean);

  return {
    actualBehavior: normalizedTitle || normalizedDescription || undefined,
    affectedFlow,
    reproSteps: reproSteps.length > 0 ? reproSteps : undefined,
    source: bugReport ? "recorder" : "inferred",
  };
};

const hasSatisfiedField = (value?: string) => {
  const normalized = normalizeText(value).toLowerCase();
  return Boolean(normalized && (normalized === "unknown" || normalized !== "n/a"));
};

const hasSatisfiedList = (values?: string[]) =>
  Array.isArray(values) && values.some((entry) => hasSatisfiedField(entry));

const hasMinimumBugContext = (
  archetype: FeedbackBugArchetype | undefined,
  bugContext?: FeedbackBugContext
) => {
  switch (archetype) {
    case "ui":
      return Boolean(
        hasSatisfiedList(bugContext?.ui?.selectors) ||
          hasSatisfiedList(bugContext?.ui?.screenshotUrls) ||
          hasSatisfiedList(bugContext?.ui?.viewports)
      );
    case "api":
      return Boolean(
        hasSatisfiedField(bugContext?.api?.endpoint) &&
          (hasSatisfiedField(bugContext?.api?.requestShape) ||
            hasSatisfiedField(bugContext?.api?.responseShape) ||
            hasSatisfiedList(bugContext?.api?.schemaPaths))
      );
    case "performance":
      return Boolean(
        hasSatisfiedField(bugContext?.performance?.benchmark) &&
          hasSatisfiedField(bugContext?.performance?.metric) &&
          (hasSatisfiedField(bugContext?.performance?.baseline) ||
            hasSatisfiedField(bugContext?.performance?.regression))
      );
    case "refactor":
      return Boolean(
        hasSatisfiedList(bugContext?.refactor?.touchedSystems) &&
          hasSatisfiedList(bugContext?.refactor?.contractSurfaces)
      );
    default:
      return true;
  }
};

export const getBugArchetypeRequirementMessage = (archetype?: FeedbackBugArchetype) => {
  switch (archetype) {
    case "ui":
      return "UI bugs must include selectors, screenshots, or viewport notes before they can be queued for fixing.";
    case "api":
      return "API bugs must include the endpoint plus request/response or schema details before they can be queued for fixing.";
    case "performance":
      return "Performance bugs must include a benchmark or metric delta before they can be queued for fixing.";
    case "refactor":
      return "Refactor bugs must include touched systems and contract surfaces before they can be queued for fixing.";
    default:
      return "";
  }
};

export const hasMinimumStructuredRepro = (
  structuredRepro?: FeedbackStructuredRepro,
  bugArchetype?: FeedbackBugArchetype,
  bugContext?: FeedbackBugContext
) =>
  hasSatisfiedField(structuredRepro?.actualBehavior) &&
  hasSatisfiedField(structuredRepro?.expectedBehavior) &&
  hasSatisfiedField(structuredRepro?.affectedFlow) &&
  Array.isArray(structuredRepro?.reproSteps) &&
  structuredRepro.reproSteps.some((step) => hasSatisfiedField(step)) &&
  hasMinimumBugContext(bugArchetype, bugContext);
