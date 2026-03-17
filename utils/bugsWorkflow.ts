import {
  FeedbackRegressionCheck,
  FeedbackResolutionMetadata,
  FeedbackWorkItemDoc,
} from "./types";
import {
  createDefaultRegressionChecklist,
  parseMultilineList,
  serializeMultilineList,
  getResolutionClosureWarnings,
} from "./feedbackResolution";
import {
  buildImplementationContext,
  buildVerificationPack,
} from "./feedbackWorkItemContext";

export type WorkflowDraft = {
  title: string;
  latestDescription: string;
  labels?: string;
  fixThreadId: string;
  fixCommitSha: string;
  actualBehavior?: string;
  expectedBehavior?: string;
  reproSteps?: string;
  affectedFlow?: string;
  triggerConditions?: string;
  regressionRisks?: string;
  implementationSummary?: string;
  implementationConfirmed?: string;
  implementationInferred?: string;
  verificationSummary?: string;
  verificationCommands?: string;
  verificationManualChecks?: string;
  verificationDoneCriteria?: string;
  completedVerificationIds?: string[];
  verificationOwner: string;
  resolvedAppVersion: string;
  resolvedDeployId: string;
  validatedCommandsText: string;
  manualChecksText: string;
  regressionChecklist: FeedbackRegressionCheck[];
};

export const createWorkflowDraft = (
  item?: Partial<FeedbackWorkItemDoc>
): WorkflowDraft => ({
  title: item?.title || "",
  latestDescription: item?.latestDescription || "",
  labels: Array.isArray(item?.labels) ? item!.labels!.join(", ") : "",
  fixThreadId: item?.fixThreadId || "",
  fixCommitSha: item?.fixCommitSha || "",
  actualBehavior: item?.structuredRepro?.actualBehavior || "",
  expectedBehavior: item?.structuredRepro?.expectedBehavior || "",
  reproSteps: serializeMultilineList(item?.structuredRepro?.reproSteps),
  affectedFlow: item?.structuredRepro?.affectedFlow || "",
  triggerConditions: item?.structuredRepro?.triggerConditions || "",
  regressionRisks: item?.structuredRepro?.regressionRisks || "",
  implementationSummary: buildImplementationContext(item as FeedbackWorkItemDoc).summary || "",
  implementationConfirmed: serializeMultilineList(
    buildImplementationContext(item as FeedbackWorkItemDoc).confirmed?.map(
      (link) =>
        `[${link.type}] ${link.path}${link.label ? ` | ${link.label}` : ""}${
          link.note ? ` | ${link.note}` : ""
        }`
    )
  ),
  implementationInferred: serializeMultilineList(
    buildImplementationContext(item as FeedbackWorkItemDoc).inferred?.map(
      (link) =>
        `[${link.type}] ${link.path}${link.label ? ` | ${link.label}` : ""}${
          link.note ? ` | ${link.note}` : ""
        }`
    )
  ),
  verificationSummary: buildVerificationPack(item as FeedbackWorkItemDoc).summary || "",
  verificationCommands: serializeMultilineList(
    buildVerificationPack(item as FeedbackWorkItemDoc)
      .items?.filter((item) => item.kind === "command")
      .map((item) => item.command || item.label)
  ),
  verificationManualChecks: serializeMultilineList(
    buildVerificationPack(item as FeedbackWorkItemDoc)
      .items?.filter((item) => item.kind === "manual")
      .map((item) => item.label)
  ),
  verificationDoneCriteria: serializeMultilineList(
    buildVerificationPack(item as FeedbackWorkItemDoc)
      .items?.filter((item) => item.kind === "done" || item.kind === "acceptance")
      .map((item) => item.label)
  ),
  completedVerificationIds: item?.completedVerificationIds || [],
  verificationOwner: item?.resolution?.verificationOwner || "",
  resolvedAppVersion: item?.resolution?.resolvedAppVersion || "",
  resolvedDeployId: item?.resolution?.resolvedDeployId || "",
  validatedCommandsText: serializeMultilineList(item?.resolution?.validatedCommands),
  manualChecksText: serializeMultilineList(item?.resolution?.manualChecks),
  regressionChecklist:
    item?.resolution?.regressionChecklist?.map((entry) => ({ ...entry })) ||
    createDefaultRegressionChecklist(),
});

export const getWorkflowDraftResolution = (
  draft: WorkflowDraft
): FeedbackResolutionMetadata => ({
  verificationOwner: draft.verificationOwner.trim() || undefined,
  resolvedAppVersion: draft.resolvedAppVersion.trim() || undefined,
  resolvedDeployId: draft.resolvedDeployId.trim() || undefined,
  validatedCommands: parseMultilineList(draft.validatedCommandsText),
  manualChecks: parseMultilineList(draft.manualChecksText),
  regressionChecklist: draft.regressionChecklist.map((entry) => ({
    label: entry.label,
    outcome: entry.outcome,
    notes: entry.notes?.trim() || undefined,
  })),
});

export const getWorkItemClosureWarnings = (draft: WorkflowDraft) =>
  getResolutionClosureWarnings(getWorkflowDraftResolution(draft));
