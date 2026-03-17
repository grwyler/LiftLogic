import {
  FeedbackRegressionCheck,
  FeedbackRegressionOutcome,
  FeedbackResolutionMetadata,
} from "./types";

export const DEFAULT_REGRESSION_CHECKLIST_LABELS = [
  "Reported flow re-checked",
  "Copy details output reviewed",
  "Closure workflow verified",
] as const;

const sanitizeText = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

const sanitizeChecklistOutcome = (
  value: unknown
): FeedbackRegressionOutcome => {
  switch (value) {
    case "passed":
    case "failed":
    case "not_applicable":
      return value;
    default:
      return "pending";
  }
};

export const parseMultilineList = (value: unknown) =>
  String(value ?? "")
    .split(/\r?\n/)
    .map((entry) => entry.trim())
    .filter(Boolean);

export const serializeMultilineList = (items?: string[]) =>
  Array.isArray(items) ? items.filter(Boolean).join("\n") : "";

export const createDefaultRegressionChecklist = (): FeedbackRegressionCheck[] =>
  DEFAULT_REGRESSION_CHECKLIST_LABELS.map((label) => ({
    label,
    outcome: "pending",
  }));

export const normalizeRegressionChecklist = (
  value: unknown
): FeedbackRegressionCheck[] => {
  const rawItems = Array.isArray(value) ? value : [];
  const byLabel = new Map<string, FeedbackRegressionCheck>();

  rawItems.forEach((item) => {
    if (!item || typeof item !== "object") {
      return;
    }

    const entry = item as Record<string, unknown>;
    const label = sanitizeText(entry.label);
    if (!label) {
      return;
    }

    byLabel.set(label, {
      label,
      outcome: sanitizeChecklistOutcome(entry.outcome),
      notes: sanitizeText(entry.notes) || undefined,
    });
  });

  return DEFAULT_REGRESSION_CHECKLIST_LABELS.map(
    (label) =>
      byLabel.get(label) || {
        label,
        outcome: "pending",
      }
  );
};

export const sanitizeResolutionMetadata = (
  value: unknown
): FeedbackResolutionMetadata | undefined => {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const metadata = value as Record<string, unknown>;
  const validatedCommands = Array.isArray(metadata.validatedCommands)
    ? metadata.validatedCommands
        .map((entry) => sanitizeText(entry))
        .filter(Boolean)
    : [];
  const manualChecks = Array.isArray(metadata.manualChecks)
    ? metadata.manualChecks.map((entry) => sanitizeText(entry)).filter(Boolean)
    : [];
  const verificationOwner = sanitizeText(metadata.verificationOwner) || undefined;
  const resolvedAppVersion =
    sanitizeText(metadata.resolvedAppVersion) || undefined;
  const resolvedDeployId = sanitizeText(metadata.resolvedDeployId) || undefined;
  const regressionChecklist = normalizeRegressionChecklist(
    metadata.regressionChecklist
  );

  if (
    !verificationOwner &&
    !resolvedAppVersion &&
    !resolvedDeployId &&
    validatedCommands.length === 0 &&
    manualChecks.length === 0 &&
    regressionChecklist.every((entry) => entry.outcome === "pending")
  ) {
    return undefined;
  }

  return {
    validatedCommands: validatedCommands.length > 0 ? validatedCommands : undefined,
    manualChecks: manualChecks.length > 0 ? manualChecks : undefined,
    verificationOwner,
    resolvedAppVersion,
    resolvedDeployId,
    regressionChecklist,
  };
};

export const getResolutionClosureWarnings = (
  resolution?: FeedbackResolutionMetadata
) => {
  const normalizedChecklist = normalizeRegressionChecklist(
    resolution?.regressionChecklist
  );
  const warnings: string[] = [];

  if (!sanitizeText(resolution?.verificationOwner)) {
    warnings.push("Add a verification owner.");
  }

  if (
    !sanitizeText(resolution?.resolvedAppVersion) &&
    !sanitizeText(resolution?.resolvedDeployId)
  ) {
    warnings.push("Record the resolved app version or deploy.");
  }

  if (!Array.isArray(resolution?.validatedCommands) || resolution.validatedCommands.length === 0) {
    warnings.push("List at least one validating command.");
  }

  if (!Array.isArray(resolution?.manualChecks) || resolution.manualChecks.length === 0) {
    warnings.push("List at least one completed manual check.");
  }

  if (normalizedChecklist.some((entry) => entry.outcome === "pending")) {
    warnings.push("Complete the regression checklist outcomes.");
  }

  return warnings;
};
