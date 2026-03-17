import {
  FeedbackRegressionCheck,
  FeedbackResolutionMetadata,
  FeedbackWorkItemDoc,
} from "./types";
import {
  createDefaultRegressionChecklist,
  getResolutionClosureWarnings,
  parseMultilineList,
  serializeMultilineList,
} from "./feedbackResolution";

export type WorkflowDraft = {
  title: string;
  latestDescription: string;
  fixThreadId: string;
  fixCommitSha: string;
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
  fixThreadId: item?.fixThreadId || "",
  fixCommitSha: item?.fixCommitSha || "",
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
