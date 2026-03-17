import {
  FeedbackImplementationContext,
  FeedbackImplementationLink,
  FeedbackItemDoc,
  FeedbackStructuredRepro,
  FeedbackVerificationItem,
  FeedbackVerificationPack,
  FeedbackWorkItemDoc,
} from "./types";

const UNKNOWN_VALUE = "Unknown";

const normalizeLine = (value: unknown) => String(value ?? "").trim();

const toKey = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

const buildVerificationId = (kind: FeedbackVerificationItem["kind"], label: string) =>
  `${kind}-${toKey(label) || "item"}`;

const dedupeLinks = (links: FeedbackImplementationLink[] = []) => {
  const seen = new Set<string>();

  return links.filter((link) => {
    const key = `${link.type}:${link.path}:${link.label || ""}`.toLowerCase();
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
};

const parseSection = (description: string, header: string) => {
  const escaped = header.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = description.match(
    new RegExp(`(?:^|\\n)${escaped}\\n([\\s\\S]*?)(?=\\n[A-Z][^\\n]*\\n|$)`, "i")
  );

  return match?.[1]?.trim() || "";
};

const parseReproSteps = (description: string) => {
  const stepsSection = parseSection(description, "Steps to reproduce");
  const parsed = stepsSection
    .split(/\r?\n/)
    .map((line) => line.replace(/^\d+\.\s*/, "").trim())
    .filter(Boolean)
    .filter((line) => !/^expected:/i.test(line) && !/^actual:/i.test(line));

  return parsed;
};

const mapRouteContext = (page?: string): FeedbackImplementationContext => {
  switch (page) {
    case "/":
      return {
        summary: "Landing route with linked pricing and auth entry points.",
        confirmed: [
          { type: "route", path: "pages/index.tsx", label: "Landing page" },
        ],
        inferred: [
          { type: "route", path: "pages/pricing.tsx", label: "Pricing route" },
          { type: "route", path: "pages/signin.tsx", label: "Sign-in route" },
          { type: "route", path: "pages/signup.tsx", label: "Sign-up route" },
          { type: "test", path: "tests/unit/homePageLayout.test.ts", label: "Landing layout test" },
        ],
      };
    case "/_app":
      return {
        summary: "Shared app shell and floating developer chrome.",
        confirmed: [
          { type: "route", path: "pages/_app.tsx", label: "Shared app shell" },
          { type: "component", path: "components/AppVersionBadge.tsx", label: "Version badge" },
          { type: "component", path: "components/DevBugRecorder.tsx", label: "Dev bug recorder" },
        ],
        inferred: [
          { type: "component", path: "components/AutomaticBugReporter.tsx", label: "Automatic reporter" },
          { type: "test", path: "tests/unit/overlaySafeArea.test.ts", label: "Overlay safe-area test" },
          { type: "test", path: "tests/unit/homePageLayout.test.ts", label: "Overlay spacing test" },
        ],
      };
    case "/pricing":
      return {
        summary: "Pricing route with billing state and plan comparison surfaces.",
        confirmed: [
          { type: "route", path: "pages/pricing.tsx", label: "Pricing page" },
        ],
        inferred: [
          { type: "api", path: "pages/api/billing/summary.ts", label: "Billing summary API" },
          { type: "test", path: "tests/unit/pricingPagePositioning.test.ts", label: "Pricing layout test" },
        ],
      };
    case "/signin":
      return {
        summary: "Sign-in route and auth CTA states.",
        confirmed: [
          { type: "route", path: "pages/signin.tsx", label: "Sign-in page" },
        ],
        inferred: [
          { type: "api", path: "pages/api/signin.ts", label: "Credentials sign-in API" },
          { type: "route", path: "pages/_app.tsx", label: "Shared shell theme" },
        ],
      };
    case "/signup":
      return {
        summary: "Sign-up route and account creation flow.",
        confirmed: [
          { type: "route", path: "pages/signup.tsx", label: "Sign-up page" },
        ],
        inferred: [
          { type: "api", path: "pages/api/signup.ts", label: "Sign-up API" },
          { type: "test", path: "tests/unit/signupCopyClarity.test.ts", label: "Sign-up copy test" },
        ],
      };
    case "/routines":
      return {
        summary: "Workout planner and execution surfaces.",
        confirmed: [
          { type: "route", path: "pages/routines.tsx", label: "Routines route" },
          { type: "component", path: "components/WorkoutsManager.tsx", label: "Workout manager" },
        ],
        inferred: [
          { type: "component", path: "components/Header.tsx", label: "Header controls" },
          { type: "component", path: "components/WorkoutDisplay.tsx", label: "Workout display" },
          { type: "api", path: "pages/api/routine.ts", label: "Routine API" },
          { type: "test", path: "tests/unit/routinesPanelConsistency.test.ts", label: "Routines panel test" },
          { type: "test", path: "tests/unit/routinesHeroStyling.test.ts", label: "Routines styling test" },
        ],
      };
    case "/bugs":
      return {
        summary: "Bug workflow triage surface and feedback persistence layer.",
        confirmed: [
          { type: "route", path: "pages/bugs.tsx", label: "Bugs inbox" },
          { type: "api", path: "pages/api/feedback.ts", label: "Feedback API" },
          { type: "hook", path: "utils/feedbackDetails.ts", label: "Copy details helper" },
          { type: "schema", path: "utils/types.ts", label: "Feedback types" },
        ],
        inferred: [
          { type: "hook", path: "utils/helpers.ts", label: "Feedback client helpers" },
          { type: "hook", path: "utils/feedbackWorkflow.ts", label: "Workflow helpers" },
          { type: "test", path: "tests/unit/bugsPage.test.ts", label: "Bugs page test" },
          { type: "test", path: "tests/unit/feedbackDetails.test.ts", label: "Feedback details test" },
          { type: "test", path: "tests/unit/feedbackCopyDetailsInstructions.test.ts", label: "Copy details test" },
          { type: "test", path: "tests/unit/feedbackApi.test.ts", label: "Feedback API test" },
        ],
      };
    default:
      return {
        summary: "Route-backed issue with no route-specific mapping yet.",
        confirmed: page
          ? [{ type: "route", path: `pages${page === "/" ? "/index" : page}.tsx`, label: "Route file", note: "Inferred from the reported route." }]
          : [],
        inferred: [],
      };
  }
};

const buildVerificationItems = (items: Array<{ kind: FeedbackVerificationItem["kind"]; label: string; command?: string }>) =>
  items.map((item) => ({
    ...item,
    id: buildVerificationId(item.kind, item.label),
  }));

const mapVerificationPack = (page?: string): FeedbackVerificationPack => {
  switch (page) {
    case "/":
      return {
        summary: "Validate the light-mode landing, pricing, and auth CTA surfaces.",
        items: buildVerificationItems([
          { kind: "command", label: "Run landing and overlay unit checks", command: "npm run test:unit -- tests/unit/homePageLayout.test.ts tests/unit/overlaySafeArea.test.ts" },
          { kind: "manual", label: "Review the landing page in light mode for secondary text, outlined chips, and CTA contrast." },
          { kind: "manual", label: "Review pricing, sign-in, sign-up, and routines in light mode for selected, disabled, and semantic states." },
          { kind: "done", label: "Secondary text and outlined controls stay legible against pale backgrounds." },
          { kind: "done", label: "Selected, disabled, and semantic states are distinguishable at a glance." },
        ]),
      };
    case "/_app":
      return {
        summary: "Validate that developer chrome only appears in explicit internal mode.",
        items: buildVerificationItems([
          { kind: "command", label: "Run overlay and shell unit checks", command: "npm run test:unit -- tests/unit/overlaySafeArea.test.ts tests/unit/homePageLayout.test.ts" },
          { kind: "manual", label: "Confirm public landing and auth routes no longer show version or bug-recorder affordances by default." },
          { kind: "manual", label: "Confirm internal mode still reveals the overlays on internal routes." },
          { kind: "done", label: "Public customer-facing surfaces are free of floating internal chrome." },
        ]),
      };
    case "/bugs":
      return {
        summary: "Validate the triage workflow, copied instructions, and resolution gates.",
        items: buildVerificationItems([
          { kind: "command", label: "Run bug workflow unit tests", command: "npm run test:unit -- tests/unit/bugsPage.test.ts tests/unit/feedbackDetails.test.ts tests/unit/feedbackCopyDetailsInstructions.test.ts tests/unit/feedbackApi.test.ts" },
          { kind: "manual", label: "Open a bug work item and verify the structured repro, Start here, and verification panels render." },
          { kind: "manual", label: "Copy details and confirm the exported text includes Start here, structured repro, and verification sections." },
          { kind: "manual", label: "Attempt to move a bug into queued or fixing without minimum repro fields and confirm the workflow blocks it unless values are marked Unknown." },
          { kind: "done", label: "Work items store structured repro fields separately from freeform narrative description." },
          { kind: "done", label: "Resolution workflow can record completed verification checks." },
        ]),
      };
    case "/pricing":
      return {
        summary: "Validate pricing plan contrast and comparison states in light mode.",
        items: buildVerificationItems([
          { kind: "command", label: "Run pricing layout unit checks", command: "npm run test:unit -- tests/unit/pricingPagePositioning.test.ts" },
          { kind: "manual", label: "Review plan cards, comparison chips, and alert states in light mode." },
          { kind: "done", label: "Outlined plan controls remain readable over pale gradients." },
        ]),
      };
    case "/signin":
    case "/signup":
      return {
        summary: "Validate auth surface contrast and input state clarity.",
        items: buildVerificationItems([
          { kind: "command", label: "Run sign-up copy and auth-focused unit checks", command: "npm run test:unit -- tests/unit/signupCopyClarity.test.ts" },
          { kind: "manual", label: "Review auth cards, outlined social buttons, input borders, and inline error states in light mode." },
          { kind: "done", label: "Auth secondary text and outlined actions remain crisp in light mode." },
        ]),
      };
    case "/routines":
      return {
        summary: "Validate routines chips, toggles, and helper surfaces in light mode.",
        items: buildVerificationItems([
          { kind: "command", label: "Run routines styling unit checks", command: "npm run test:unit -- tests/unit/routinesHeroStyling.test.ts tests/unit/routinesPanelConsistency.test.ts" },
          { kind: "manual", label: "Review routine cards, setup chips, toggle buttons, and helper surfaces in light mode." },
          { kind: "done", label: "Selected, disabled, and semantic states are clear across routines surfaces." },
        ]),
      };
    default:
      return {
        summary: "Validate the reported route, linked files, and completion gates for this issue.",
        items: buildVerificationItems([
          { kind: "manual", label: "Review the reported route and linked implementation files." },
          { kind: "done", label: "The fix is covered by at least one automated or manual verification step." },
        ]),
      };
  }
};

const normalizeStructuredText = (value?: string) => {
  const normalized = normalizeLine(value);
  return normalized || undefined;
};

export const parseMultilineList = (value: string) =>
  value
    .split(/\r?\n/)
    .map((line) => line.replace(/^\d+\.\s*/, "").trim())
    .filter(Boolean);

export const formatMultilineList = (values?: string[]) =>
  Array.isArray(values) && values.length > 0 ? values.join("\n") : "";

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
}): FeedbackStructuredRepro => {
  const safeDescription = String(description || "");
  const actualFromDescription =
    parseSection(safeDescription, "Actual result") ||
    parseSection(safeDescription, "Actual behavior");
  const expectedFromDescription =
    parseSection(safeDescription, "Expected result") ||
    parseSection(safeDescription, "Expected behavior");
  const reproStepsFromDescription = parseReproSteps(safeDescription);
  const semanticSteps =
    bugReport?.interactions
      ?.filter((interaction) => interaction.kind === "semantic")
      .map(
        (interaction) =>
          interaction.label || interaction.detail || interaction.target || interaction.type
      )
      .filter(Boolean) || [];
  const fallbackActual =
    bugReport?.errors?.[0]?.message ||
    normalizeLine(title) ||
    normalizeLine(description);
  const fallbackExpected =
    bugReport?.interactions?.find((interaction) => interaction.expected)?.expected ||
    (page ? `The ${page} flow should complete without confusion or failure.` : "");

  return {
    actualBehavior: normalizeStructuredText(actualFromDescription || fallbackActual),
    expectedBehavior: normalizeStructuredText(expectedFromDescription || fallbackExpected),
    reproSteps:
      reproStepsFromDescription.length > 0
        ? reproStepsFromDescription
        : semanticSteps.length > 0
        ? semanticSteps
        : undefined,
    affectedFlow: normalizeStructuredText(page || bugReport?.currentPath),
    triggerConditions: normalizeStructuredText(
      bugReport?.errors?.length
        ? "Occurs while reproducing the recorded bug session."
        : undefined
    ),
    regressionRisks: normalizeStructuredText(
      page === "/bugs"
        ? "Copy details, work-item updates, and workflow gating can regress together."
        : page
        ? `Visual polish and state clarity can regress on ${page} and adjacent shared surfaces.`
        : undefined
    ),
    source: bugReport?.mode === "recorded" ? "recorder" : "inferred",
  };
};

export const buildImplementationContext = (
  workItem: Pick<FeedbackWorkItemDoc, "page" | "type" | "implementationContext">
): FeedbackImplementationContext => {
  const defaults = mapRouteContext(workItem.page);
  const existing = workItem.implementationContext;

  return {
    summary: existing?.summary || defaults.summary,
    confirmed: dedupeLinks([...(existing?.confirmed || defaults.confirmed || [])]),
    inferred: dedupeLinks([...(existing?.inferred || defaults.inferred || [])]),
  };
};

export const buildVerificationPack = (
  workItem: Pick<FeedbackWorkItemDoc, "page" | "verificationPack">
): FeedbackVerificationPack => {
  const defaults = mapVerificationPack(workItem.page);
  const existing = workItem.verificationPack;

  return {
    summary: existing?.summary || defaults.summary,
    items:
      existing?.items?.length
        ? existing.items.map((item) => ({
            ...item,
            id: item.id || buildVerificationId(item.kind, item.label),
          }))
        : defaults.items,
  };
};

export const isExplicitUnknown = (value?: string | string[]) => {
  if (Array.isArray(value)) {
    return value.length === 1 && normalizeLine(value[0]).toLowerCase() === "unknown";
  }

  return normalizeLine(value).toLowerCase() === "unknown";
};

export const hasMinimumStructuredRepro = (structuredRepro?: FeedbackStructuredRepro) => {
  if (!structuredRepro) {
    return false;
  }

  const hasActual =
    Boolean(normalizeLine(structuredRepro.actualBehavior)) ||
    isExplicitUnknown(structuredRepro.actualBehavior);
  const hasExpected =
    Boolean(normalizeLine(structuredRepro.expectedBehavior)) ||
    isExplicitUnknown(structuredRepro.expectedBehavior);
  const hasAffectedFlow =
    Boolean(normalizeLine(structuredRepro.affectedFlow)) ||
    isExplicitUnknown(structuredRepro.affectedFlow);
  const hasReproSteps =
    (structuredRepro.reproSteps?.length || 0) > 0 ||
    isExplicitUnknown(structuredRepro.reproSteps);

  return hasActual && hasExpected && hasAffectedFlow && hasReproSteps;
};

export const getVerificationItemsByKind = (
  verificationPack?: FeedbackVerificationPack,
  kind?: FeedbackVerificationItem["kind"]
) =>
  (verificationPack?.items || []).filter((item) => (kind ? item.kind === kind : true));
