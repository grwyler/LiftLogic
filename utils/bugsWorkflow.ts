import {
  FeedbackBugArchetype,
  FeedbackBugContext,
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
  bugArchetype: FeedbackBugArchetype;
  fixThreadId: string;
  fixCommitSha: string;
  actualBehavior?: string;
  expectedBehavior?: string;
  reproSteps?: string;
  affectedFlow?: string;
  triggerConditions?: string;
  regressionRisks?: string;
  uiSelectors?: string;
  uiScreenshots?: string;
  uiViewports?: string;
  apiEndpoint?: string;
  apiMethod?: string;
  apiRequestShape?: string;
  apiResponseShape?: string;
  apiSchemaPaths?: string;
  perfBenchmark?: string;
  perfMetric?: string;
  perfBaseline?: string;
  perfRegression?: string;
  perfDeviceContext?: string;
  refactorTouchedSystems?: string;
  refactorContractSurfaces?: string;
  refactorMigrationRisks?: string;
  scopeInScope?: string;
  scopeOutOfScope?: string;
  scopeNonGoals?: string;
  scopeAllowedTouchAreas?: string;
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
  shippedSummary: string;
  deferredFollowUpsText: string;
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
  bugArchetype: item?.bugArchetype || "general",
  fixThreadId: item?.fixThreadId || "",
  fixCommitSha: item?.fixCommitSha || "",
  actualBehavior: item?.structuredRepro?.actualBehavior || "",
  expectedBehavior: item?.structuredRepro?.expectedBehavior || "",
  reproSteps: serializeMultilineList(item?.structuredRepro?.reproSteps),
  affectedFlow: item?.structuredRepro?.affectedFlow || "",
  triggerConditions: item?.structuredRepro?.triggerConditions || "",
  regressionRisks: item?.structuredRepro?.regressionRisks || "",
  uiSelectors: serializeMultilineList(item?.bugContext?.ui?.selectors),
  uiScreenshots: serializeMultilineList(item?.bugContext?.ui?.screenshotUrls),
  uiViewports: serializeMultilineList(item?.bugContext?.ui?.viewports),
  apiEndpoint: item?.bugContext?.api?.endpoint || "",
  apiMethod: item?.bugContext?.api?.method || "",
  apiRequestShape: item?.bugContext?.api?.requestShape || "",
  apiResponseShape: item?.bugContext?.api?.responseShape || "",
  apiSchemaPaths: serializeMultilineList(item?.bugContext?.api?.schemaPaths),
  perfBenchmark: item?.bugContext?.performance?.benchmark || "",
  perfMetric: item?.bugContext?.performance?.metric || "",
  perfBaseline: item?.bugContext?.performance?.baseline || "",
  perfRegression: item?.bugContext?.performance?.regression || "",
  perfDeviceContext: item?.bugContext?.performance?.deviceContext || "",
  refactorTouchedSystems: serializeMultilineList(item?.bugContext?.refactor?.touchedSystems),
  refactorContractSurfaces: serializeMultilineList(item?.bugContext?.refactor?.contractSurfaces),
  refactorMigrationRisks: serializeMultilineList(item?.bugContext?.refactor?.migrationRisks),
  scopeInScope: serializeMultilineList(item?.scopeGuardrails?.inScope),
  scopeOutOfScope: serializeMultilineList(item?.scopeGuardrails?.outOfScope),
  scopeNonGoals: serializeMultilineList(item?.scopeGuardrails?.nonGoals),
  scopeAllowedTouchAreas: serializeMultilineList(item?.scopeGuardrails?.allowedTouchAreas),
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
  shippedSummary: item?.resolution?.shippedSummary || "",
  deferredFollowUpsText: serializeMultilineList(item?.resolution?.deferredFollowUps),
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
  shippedSummary: draft.shippedSummary.trim() || undefined,
  deferredFollowUps: parseMultilineList(draft.deferredFollowUpsText),
  validatedCommands: parseMultilineList(draft.validatedCommandsText),
  manualChecks: parseMultilineList(draft.manualChecksText),
  regressionChecklist: draft.regressionChecklist.map((entry) => ({
    label: entry.label,
    outcome: entry.outcome,
    notes: entry.notes?.trim() || undefined,
  })),
});

export const getWorkflowDraftBugContext = (draft: WorkflowDraft): FeedbackBugContext => ({
  ui:
    draft.bugArchetype === "ui"
      ? {
          selectors: parseMultilineList(draft.uiSelectors),
          screenshotUrls: parseMultilineList(draft.uiScreenshots),
          viewports: parseMultilineList(draft.uiViewports),
        }
      : undefined,
  api:
    draft.bugArchetype === "api"
      ? {
          endpoint: draft.apiEndpoint.trim() || undefined,
          method: draft.apiMethod.trim() || undefined,
          requestShape: draft.apiRequestShape.trim() || undefined,
          responseShape: draft.apiResponseShape.trim() || undefined,
          schemaPaths: parseMultilineList(draft.apiSchemaPaths),
        }
      : undefined,
  performance:
    draft.bugArchetype === "performance"
      ? {
          benchmark: draft.perfBenchmark.trim() || undefined,
          metric: draft.perfMetric.trim() || undefined,
          baseline: draft.perfBaseline.trim() || undefined,
          regression: draft.perfRegression.trim() || undefined,
          deviceContext: draft.perfDeviceContext.trim() || undefined,
        }
      : undefined,
  refactor:
    draft.bugArchetype === "refactor"
      ? {
          touchedSystems: parseMultilineList(draft.refactorTouchedSystems),
          contractSurfaces: parseMultilineList(draft.refactorContractSurfaces),
          migrationRisks: parseMultilineList(draft.refactorMigrationRisks),
        }
      : undefined,
});

export const getWorkItemClosureWarnings = (draft: WorkflowDraft) =>
  getResolutionClosureWarnings(getWorkflowDraftResolution(draft));
