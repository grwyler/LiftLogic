import { FeedbackItemDoc, FeedbackWorkItemDoc } from "./types";
import {
  buildImplementationContext,
  buildVerificationPack,
  getVerificationItemsByKind,
} from "./feedbackWorkItemContext";

export const CODEX_COPY_BRIEF_SECTIONS = [
  "Work item metadata",
  "Bug summary",
  "Actual behavior",
  "Expected behavior",
  "Affected flow",
  "Likely files",
  "Implementation context",
  "Verification plan",
  "Scope guardrails",
  "Related work",
  "Follow-up rules",
  "Codex execution instructions",
] as const;

const MISSING_TODO = "TODO: missing from the current work item.";
const MISSING_TODO_LIST = [`- ${MISSING_TODO}`];

const toTimestamp = (value?: Date | string) => {
  if (!value) {
    return 0;
  }

  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
};

export const sortFeedbackEvidence = (items: FeedbackItemDoc[]) =>
  [...items].sort((left, right) => {
    const createdDelta = toTimestamp(right.createdAt) - toTimestamp(left.createdAt);
    if (createdDelta !== 0) {
      return createdDelta;
    }

    return toTimestamp(right.updatedAt) - toTimestamp(left.updatedAt);
  });

export const getFeedbackEvidenceForWorkItem = ({
  workItem,
  feedbackItems,
}: {
  workItem?: FeedbackWorkItemDoc | null;
  feedbackItems: FeedbackItemDoc[];
}) => {
  if (!workItem?._id) {
    return [];
  }

  const workItemId = String(workItem._id);

  return sortFeedbackEvidence(
    feedbackItems.filter((item) => String(item.workItemId || "") === workItemId)
  );
};

export const summarizeBugReportEvidence = (feedback: FeedbackItemDoc) => {
  const interactions = feedback.bugReport?.interactions || [];
  const errors = feedback.bugReport?.errors || [];

  return {
    errorCount: errors.length,
    interactionCount: interactions.length,
    semanticSteps: interactions.filter((item) => item.kind === "semantic"),
    rawSteps: interactions.filter((item) => item.kind !== "semantic"),
    latestError: errors[0],
  };
};

const formatTimestamp = (value?: Date | string) => {
  if (!value) {
    return "";
  }

  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) ? parsed.toISOString() : "";
};

const pushIfPresent = (lines: string[], label: string, value?: unknown) => {
  if (value === undefined || value === null || value === "") {
    return;
  }

  lines.push(`${label}: ${String(value)}`);
};

const pushSection = (lines: string[], title: string, sectionLines: string[]) => {
  lines.push("", `## ${title}`, ...(sectionLines.length > 0 ? sectionLines : MISSING_TODO_LIST));
};

const normalizeFieldName = (value: string) =>
  value
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

const parseDescriptionFields = (description?: string) => {
  const fields = new Map<string, string[]>();
  let currentField: string | null = null;

  String(description || "")
    .split(/\r?\n/)
    .forEach((rawLine) => {
      const line = rawLine.trim();
      if (!line) {
        return;
      }

      const labeledField = line.match(/^([A-Za-z][A-Za-z0-9 /()'-]+):\s*(.*)$/);
      if (labeledField) {
        currentField = normalizeFieldName(labeledField[1]);
        const nextValue = labeledField[2]?.trim();
        const existing = fields.get(currentField) || [];
        if (nextValue) {
          existing.push(nextValue);
        }
        fields.set(currentField, existing);
        return;
      }

      const fieldName = currentField || "__freeform__";
      const existing = fields.get(fieldName) || [];
      existing.push(line);
      fields.set(fieldName, existing);
    });

  return fields;
};

const getFieldText = (fields: Map<string, string[]>, ...fieldNames: string[]) => {
  for (const fieldName of fieldNames) {
    const value = (fields.get(normalizeFieldName(fieldName)) || [])
      .map((entry) => entry.trim())
      .filter(Boolean)
      .join("\n");

    if (value) {
      return value;
    }
  }

  return "";
};

const getFieldList = (fields: Map<string, string[]>, ...fieldNames: string[]) => {
  const value = getFieldText(fields, ...fieldNames);
  if (!value) {
    return [];
  }

  return value
    .split(/\r?\n/)
    .map((entry) => entry.replace(/^[-*]\s*/, "").trim())
    .filter(Boolean);
};

const formatParagraphOrTodo = (value?: string) => {
  const normalized = String(value || "").trim();
  return normalized ? [normalized] : MISSING_TODO_LIST;
};

const formatBulletsOrTodo = (values: string[]) =>
  values.length > 0 ? values.map((value) => `- ${value}`) : MISSING_TODO_LIST;

const normalizeText = (value: unknown, max = 160) =>
  String(value ?? "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);

const normalizeRoute = (value: unknown) => {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (!normalized) {
    return "";
  }

  const withoutOrigin = normalized.replace(/^https?:\/\/[^/]+/i, "");
  return withoutOrigin || normalized;
};

const getRouteArea = (value: string) => {
  const normalizedRoute = normalizeRoute(value);
  if (!normalizedRoute) {
    return "";
  }

  const [pathOnly] = normalizedRoute.split(/[?#]/, 1);
  return pathOnly || normalizedRoute;
};

const normalizeErrorSignature = (value: unknown) =>
  normalizeText(value, 200)
    .replace(/\b0x[0-9a-f]+\b/g, "0x#")
    .replace(/\b[0-9a-f]{8,40}\b/g, "#")
    .replace(/\d+/g, "#");

const fileSignalPattern =
  /((?:[a-z]:)?[\\/](?:[^\\/\s:'")]+[\\/])+[^\\/\s:'")]+\.(?:[jt]sx?|mjs|cjs)|(?:pages|components|utils|server|domain|db|tests)[\\/][^\\/\s:'")]+\.(?:[jt]sx?|mjs|cjs))/gi;

const getOwnershipSignal = (value: string) => {
  const normalized = value.replace(/\\/g, "/").replace(/^[a-z]:/i, "");
  const segments = normalized.split("/").filter(Boolean);

  if (segments.length === 0) {
    return "";
  }

  if (segments.length >= 2) {
    return `${segments[0]}/${segments[1]}`;
  }

  return segments[0];
};

const collectOwnershipSignalsFromText = (value: unknown) => {
  const source = String(value ?? "");
  const matches = source.match(fileSignalPattern) || [];

  return matches
    .map((match) => getOwnershipSignal(match))
    .filter(Boolean);
};

const collectTitleTokens = (value: unknown) =>
  Array.from(
    new Set(
      normalizeText(value, 120)
        .split(/[^a-z0-9]+/)
        .filter((token) => token.length >= 4)
    )
  );

const intersectValues = (left: Set<string>, right: Set<string>) =>
  Array.from(left).filter((value) => right.has(value));

type WorkItemSignals = {
  routes: Set<string>;
  routeAreas: Set<string>;
  errorSignatures: Set<string>;
  ownershipSignals: Set<string>;
  titleTokens: Set<string>;
};

export type RelatedWorkItemMatch = {
  workItem: FeedbackWorkItemDoc;
  score: number;
  reasons: string[];
};

const collectSignalsForWorkItem = (
  workItem: FeedbackWorkItemDoc,
  evidence: FeedbackItemDoc[]
): WorkItemSignals => {
  const routes = new Set<string>();
  const routeAreas = new Set<string>();
  const errorSignatures = new Set<string>();
  const ownershipSignals = new Set<string>();
  const titleTokens = new Set<string>(collectTitleTokens(workItem.title));

  const registerRoute = (value?: unknown) => {
    const normalizedRoute = normalizeRoute(value);
    const routeArea = getRouteArea(normalizedRoute);

    if (normalizedRoute) {
      routes.add(normalizedRoute);
    }

    if (routeArea) {
      routeAreas.add(routeArea);
      ownershipSignals.add(`route:${routeArea}`);
    }
  };

  const registerError = (value?: unknown) => {
    const signature = normalizeErrorSignature(value);
    if (signature) {
      errorSignatures.add(signature);
    }
  };

  const registerOwnershipText = (value?: unknown) => {
    collectOwnershipSignalsFromText(value).forEach((signal) => {
      ownershipSignals.add(signal);
    });
  };

  registerRoute(workItem.page);
  registerRoute(workItem.latestRuntimeContext?.route);
  registerOwnershipText(workItem.title);
  registerOwnershipText(workItem.latestDescription);

  evidence.forEach((entry) => {
    registerRoute(entry.page);
    registerRoute(entry.runtimeContext?.route);
    registerRoute(entry.bugReport?.currentPath);
    registerOwnershipText(entry.description);

    entry.bugReport?.errors?.forEach((error) => {
      registerError(error.message);
      registerError(error.detail);
      registerOwnershipText(error.message);
      registerOwnershipText(error.detail);
    });

    entry.bugReport?.interactions?.forEach((interaction) => {
      registerOwnershipText(interaction.label);
      registerOwnershipText(interaction.detail);
      registerOwnershipText(interaction.target);
    });
  });

  return {
    routes,
    routeAreas,
    errorSignatures,
    ownershipSignals,
    titleTokens,
  };
};

const scoreRelatedWorkItem = ({
  subject,
  candidate,
  subjectSignals,
  candidateSignals,
}: {
  subject: FeedbackWorkItemDoc;
  candidate: FeedbackWorkItemDoc;
  subjectSignals: WorkItemSignals;
  candidateSignals: WorkItemSignals;
}): RelatedWorkItemMatch | null => {
  let score = 0;
  const reasons: string[] = [];

  if (subject.fingerprint && subject.fingerprint === candidate.fingerprint) {
    score += 12;
    reasons.push(`matching fingerprint ${subject.fingerprint}`);
  }

  const sharedRoutes = intersectValues(subjectSignals.routes, candidateSignals.routes);
  if (sharedRoutes.length > 0) {
    score += 4;
    reasons.push(`shared route ${sharedRoutes[0]}`);
  } else {
    const sharedRouteAreas = intersectValues(
      subjectSignals.routeAreas,
      candidateSignals.routeAreas
    );
    if (sharedRouteAreas.length > 0) {
      score += 3;
      reasons.push(`same page area ${sharedRouteAreas[0]}`);
    }
  }

  const sharedErrors = intersectValues(
    subjectSignals.errorSignatures,
    candidateSignals.errorSignatures
  );
  if (sharedErrors.length > 0) {
    score += 5;
    reasons.push(`shared stack/error signature ${sharedErrors[0].slice(0, 96)}`);
  }

  const sharedOwnershipSignals = intersectValues(
    subjectSignals.ownershipSignals,
    candidateSignals.ownershipSignals
  ).filter((value) => !value.startsWith("route:"));
  if (sharedOwnershipSignals.length > 0) {
    score += 3;
    reasons.push(`shared code area ${sharedOwnershipSignals[0]}`);
  }

  const sharedTitleTokens = intersectValues(
    subjectSignals.titleTokens,
    candidateSignals.titleTokens
  );
  if (sharedTitleTokens.length >= 2) {
    score += 2;
    reasons.push(`similar title terms ${sharedTitleTokens.slice(0, 3).join(", ")}`);
  }

  if (score === 0) {
    return null;
  }

  const candidateResolvedAt = toTimestamp(
    candidate.resolvedAt || candidate.updatedAt || candidate.lastReportedAt
  );
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const candidateIsClosed =
    candidate.triageStatus === "resolved" ||
    candidate.triageStatus === "verified" ||
    candidate.triageStatus === "duplicate";

  if (
    candidateIsClosed &&
    candidateResolvedAt >= sevenDaysAgo &&
    reasons.some((reason) => reason.startsWith("same page area") || reason.startsWith("shared code area"))
  ) {
    score += 1;
    reasons.push("recently resolved nearby work");
  }

  return {
    workItem: candidate,
    score,
    reasons,
  };
};

export const getRelatedWorkItems = ({
  workItem,
  workItems,
  feedbackItems,
  maxItems = 6,
}: {
  workItem?: FeedbackWorkItemDoc | null;
  workItems: FeedbackWorkItemDoc[];
  feedbackItems: FeedbackItemDoc[];
  maxItems?: number;
}) => {
  if (!workItem?._id) {
    return [];
  }

  const subjectEvidence = getFeedbackEvidenceForWorkItem({
    workItem,
    feedbackItems,
  });
  const subjectSignals = collectSignalsForWorkItem(workItem, subjectEvidence);

  return workItems
    .filter((candidate) => String(candidate._id || "") !== String(workItem._id || ""))
    .map((candidate) => {
      const candidateEvidence = getFeedbackEvidenceForWorkItem({
        workItem: candidate,
        feedbackItems,
      });
      const candidateSignals = collectSignalsForWorkItem(candidate, candidateEvidence);
      return scoreRelatedWorkItem({
        subject: workItem,
        candidate,
        subjectSignals,
        candidateSignals,
      });
    })
    .filter((match): match is RelatedWorkItemMatch => Boolean(match && match.score >= 3))
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return (
        toTimestamp(right.workItem.updatedAt || right.workItem.lastReportedAt) -
        toTimestamp(left.workItem.updatedAt || left.workItem.lastReportedAt)
      );
    })
    .slice(0, maxItems);
};

export const buildCodexCopyText = ({
  workItem,
  evidence,
  relatedWork = [],
}: {
  workItem: FeedbackWorkItemDoc;
  evidence: FeedbackItemDoc[];
  relatedWork?: RelatedWorkItemMatch[];
}) => {
  const descriptionFields = parseDescriptionFields(workItem.latestDescription);
  const acceptanceCriteria = getFieldList(descriptionFields, "acceptance criteria");
  const implementationContext = buildImplementationContext(workItem);
  const verificationPack = buildVerificationPack(workItem);
  const runtimeContextLines: string[] = [];
  const flowLines: string[] = [];
  const likelyFiles = new Set<string>();
  const sourceText = `${workItem.title} ${workItem.latestDescription}`.toLowerCase();

  [workItem.page, workItem.latestRuntimeContext?.route].forEach((candidate) => {
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

  if (
    workItem.page === "/bugs" ||
    sourceText.includes("copy details") ||
    sourceText.includes("implementation brief")
  ) {
    likelyFiles.add("pages/bugs.tsx");
    likelyFiles.add("utils/feedbackDetails.ts");
    likelyFiles.add("tests/unit/feedbackDetails.test.ts");
    likelyFiles.add("tests/unit/feedbackCopyDetailsInstructions.test.ts");
  }

  pushIfPresent(runtimeContextLines, "- Environment", workItem.latestRuntimeContext?.environment);
  pushIfPresent(runtimeContextLines, "- Route", workItem.latestRuntimeContext?.route);
  pushIfPresent(runtimeContextLines, "- App version", workItem.latestRuntimeContext?.appVersion);
  pushIfPresent(runtimeContextLines, "- Build commit", workItem.latestRuntimeContext?.commitSha);
  pushIfPresent(
    runtimeContextLines,
    "- Viewport",
    workItem.latestRuntimeContext?.viewport
      ? `${workItem.latestRuntimeContext.viewport.width}x${workItem.latestRuntimeContext.viewport.height}`
      : ""
  );
  pushIfPresent(
    runtimeContextLines,
    "- Online",
    typeof workItem.latestRuntimeContext?.online === "boolean"
      ? workItem.latestRuntimeContext.online
        ? "yes"
        : "no"
      : ""
  );
  pushIfPresent(runtimeContextLines, "- User agent", workItem.latestRuntimeContext?.userAgent);

  if (workItem.page) {
    flowLines.push(`- Work item page: ${workItem.page}`);
  }
  if (workItem.latestRuntimeContext?.route) {
    flowLines.push(`- Runtime route: ${workItem.latestRuntimeContext.route}`);
  }
  if (workItem.structuredRepro?.affectedFlow) {
    flowLines.push(`- Affected flow: ${workItem.structuredRepro.affectedFlow}`);
  }
  (workItem.structuredRepro?.reproSteps || []).slice(0, 5).forEach((step, index) => {
    flowLines.push(`- Repro step ${index + 1}: ${step}`);
  });
  evidence
    .flatMap((entry) => entry.bugReport?.interactions?.filter((step) => step.kind === "semantic") || [])
    .slice(0, 5)
    .forEach((step, index) => {
      flowLines.push(
        `- Recorded step ${index + 1}: ${step.label || step.detail || step.target || step.type}`
      );
    });

  const evidenceLines =
    evidence.length > 0
      ? evidence.flatMap((entry, index) => {
          const bugSummary = summarizeBugReportEvidence(entry);
          const sectionLines = [
            `- Evidence ${index + 1}: ${entry.title || String(entry._id || "Untitled evidence")}`,
            `  Feedback ID: ${String(entry._id || "") || MISSING_TODO}`,
            `  Queue status: ${entry.triageStatus || MISSING_TODO}`,
            `  Severity: ${entry.severity || MISSING_TODO}`,
            `  Created: ${formatTimestamp(entry.createdAt) || MISSING_TODO}`,
            `  Description: ${entry.description || MISSING_TODO}`,
          ];

          if (entry.bugReport?.mode) {
            sectionLines.push(`  Recorded mode: ${entry.bugReport.mode}`);
            sectionLines.push(`  Recorded path: ${entry.bugReport.currentPath || MISSING_TODO}`);
            sectionLines.push(`  Recorded errors: ${bugSummary.errorCount}`);
            sectionLines.push(`  Recorded interactions: ${bugSummary.interactionCount}`);
          }

          if (bugSummary.latestError?.message) {
            sectionLines.push(`  Latest captured error: ${bugSummary.latestError.message}`);
          }

          if (entry.coachFeedback?.selectedResponse) {
            sectionLines.push(`  Selected response: ${entry.coachFeedback.selectedResponse}`);
          }

          return sectionLines;
        })
      : MISSING_TODO_LIST;

  const relatedWorkLines =
    relatedWork.length > 0
      ? relatedWork.flatMap((match, index) => [
          `- Related item ${index + 1}: ${match.workItem.title || MISSING_TODO}`,
          `  Work item ID: ${String(match.workItem._id || "") || MISSING_TODO}`,
          `  Queue status: ${match.workItem.triageStatus || MISSING_TODO}`,
          `  Fingerprint: ${match.workItem.fingerprint || MISSING_TODO}`,
          `  Page: ${match.workItem.page || match.workItem.latestRuntimeContext?.route || MISSING_TODO}`,
          `  Resolved: ${formatTimestamp(match.workItem.resolvedAt) || MISSING_TODO}`,
          `  Why it matched: ${match.reasons.join("; ") || MISSING_TODO}`,
        ])
      : ["- Linked evidence: TODO: no related work was attached to this brief."];

  const lines: string[] = [
    "Please investigate and fix this Lift Logic work item.",
    "",
    "Implementation brief",
    "Schema version: implementation-brief-v1",
    "Start here: see the Likely files and Implementation context sections below.",
  ];

  pushSection(lines, CODEX_COPY_BRIEF_SECTIONS[0], [
    `- ID: ${String(workItem._id || "") || MISSING_TODO}`,
    `- Type: ${workItem.type || MISSING_TODO}`,
    `- Title: ${workItem.title || MISSING_TODO}`,
    `- Queue status: ${workItem.triageStatus || MISSING_TODO}`,
    `- Fingerprint: ${workItem.fingerprint || MISSING_TODO}`,
    `- Occurrence count: ${String(workItem.occurrenceCount ?? MISSING_TODO)}`,
    `- Severity: ${workItem.severity || MISSING_TODO}`,
    `- Page: ${workItem.page || MISSING_TODO}`,
    `- First reported: ${formatTimestamp(workItem.firstReportedAt) || MISSING_TODO}`,
    `- Last reported: ${formatTimestamp(workItem.lastReportedAt) || MISSING_TODO}`,
  ]);
  pushSection(lines, CODEX_COPY_BRIEF_SECTIONS[1], [
    `- Summary: ${workItem.title || MISSING_TODO}`,
    `- Priority: ${getFieldText(descriptionFields, "priority") || MISSING_TODO}`,
    `- Current problem statement: ${
      getFieldText(descriptionFields, "description", "__freeform__") || MISSING_TODO
    }`,
    `- Proposed fix: ${getFieldText(descriptionFields, "proposed fix") || MISSING_TODO}`,
  ]);
  pushSection(
    lines,
    CODEX_COPY_BRIEF_SECTIONS[2],
    formatParagraphOrTodo(
      workItem.structuredRepro?.actualBehavior ||
        getFieldText(descriptionFields, "actual behavior", "description")
    )
  );
  pushSection(
    lines,
    CODEX_COPY_BRIEF_SECTIONS[3],
    formatParagraphOrTodo(
      workItem.structuredRepro?.expectedBehavior ||
        getFieldText(descriptionFields, "expected behavior")
    )
  );
  pushSection(
    lines,
    CODEX_COPY_BRIEF_SECTIONS[4],
    flowLines.length > 0 ? flowLines : MISSING_TODO_LIST
  );
  pushSection(
    lines,
    CODEX_COPY_BRIEF_SECTIONS[5],
    formatBulletsOrTodo(Array.from(likelyFiles))
  );
  pushSection(lines, CODEX_COPY_BRIEF_SECTIONS[6], [
    "Latest runtime context:",
    ...(runtimeContextLines.length > 0 ? runtimeContextLines : MISSING_TODO_LIST),
    "",
    "Source notes:",
    ...formatBulletsOrTodo(
      [
        getFieldText(descriptionFields, "workflow impact"),
        getFieldText(descriptionFields, "engineering impact"),
        getFieldText(descriptionFields, "risk if unchanged"),
        getFieldText(
          descriptionFields,
          "why it saves codex time or improves accuracy"
        ),
        implementationContext.summary,
      ].filter(Boolean)
    ),
    "",
    "Confirmed links:",
    ...formatBulletsOrTodo(
      (implementationContext.confirmed || []).map(
        (link) => `[${link.type}] ${link.path}${link.label ? ` | ${link.label}` : ""}`
      )
    ),
    "",
    "Inferred links:",
    ...formatBulletsOrTodo(
      (implementationContext.inferred || []).map(
        (link) => `[${link.type}] ${link.path}${link.label ? ` | ${link.label}` : ""}`
      )
    ),
    "",
    "Linked evidence:",
    ...evidenceLines,
  ]);
  pushSection(lines, CODEX_COPY_BRIEF_SECTIONS[7], [
    ...(verificationPack.summary
      ? [`- Summary: ${verificationPack.summary}`]
      : ["- Summary: TODO: missing from the current work item."]),
    ...formatBulletsOrTodo(
      verificationPack.items.map((item) => item.command || item.label).filter(Boolean)
    ),
    ...(acceptanceCriteria.length > 0
      ? acceptanceCriteria.map((criterion) => `- Acceptance check: ${criterion}`)
      : ["- Acceptance check: TODO: missing from the current work item."]),
    "- Prefer observing real production behavior over a local run unless this is specifically a code audit.",
    "- Front-end audits and end-to-end workflow checks should be evaluated against production functionality whenever possible.",
  ]);
  pushSection(lines, CODEX_COPY_BRIEF_SECTIONS[8], [
    "- Keep the implementation brief headings and field order stable for every bug work item export.",
    "- Do not silently omit required sections; show explicit TODO markers when source data is missing.",
    "- Limit this change to the brief formatter, related workflow wiring, and tests unless a blocking dependency requires more.",
  ]);
  pushSection(lines, CODEX_COPY_BRIEF_SECTIONS[9], [
    `- Fingerprint: ${workItem.fingerprint || MISSING_TODO}`,
    ...relatedWorkLines,
  ]);
  pushSection(lines, CODEX_COPY_BRIEF_SECTIONS[10], [
    "- Keep this work item's ticket status updated in the database while you are working on it and when the work is done.",
    "- When the work is complete, move this work item to the appropriate status.",
    "- If you identify related bugs, edge cases, or follow-up work that should not be handled in this same change, create additional bug reports or feature requests for them.",
    "- Clearly distinguish what was completed from any follow-up items.",
  ]);
  pushSection(lines, CODEX_COPY_BRIEF_SECTIONS[11], [
    "- Implement the requested change.",
    "- For testing and validation, prefer observing real production behavior over a local run unless this is specifically a code audit.",
    "- Front-end audits and end-to-end workflow checks should be evaluated against production functionality whenever possible; use local execution mainly for code-level investigation, debugging, or implementation work.",
    "- Add or update tests needed to cover the change and ensure relevant tests pass.",
    "- Please inspect the relevant code, implement the fix, run appropriate verification, and summarize what changed.",
    "- When the work is complete: increment version, commit, push, redeploy to prod.",
  ]);

  return lines.join("\n");
};
