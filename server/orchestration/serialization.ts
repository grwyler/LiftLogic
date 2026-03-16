import {
  QueueFilterOptions,
  ReviewActionDoc,
  SignalReporter,
  SignalRuntimeContext,
  WorkItemDetailRecord,
  WorkItemQueueRecord,
  WorkItemQueueResult,
} from "../../domain/orchestration/types";

export interface SerializedWorkItemQueueRecord {
  id: string;
  fingerprint: string;
  type: string;
  title: string;
  latestDescription?: string;
  triageStatus: string;
  severity?: string;
  occurrenceCount: number;
  projectName: string;
  projectSlug: string;
  duplicateOfWorkItemId?: string;
  duplicateReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SerializedReviewAction {
  id: string;
  workItemId: string;
  actionType: ReviewActionDoc["actionType"];
  actor: ReviewActionDoc["actor"];
  payload: Record<string, unknown>;
  createdAt: string;
}

export interface SerializedWorkItemDetail {
  workItem: SerializedWorkItemQueueRecord;
  project: {
    id: string;
    name: string;
    slug: string;
    createdAt: string;
  };
  signals: Array<{
    id: string;
    projectId: string;
    workItemId?: string;
    source: string;
    type: string;
    title: string;
    description?: string;
    severity?: string;
    environment?: string;
    location?: string;
    runtimeContext?: SignalRuntimeContext;
    evidence?: Record<string, unknown>;
    reporter?: SignalReporter;
    fingerprint: string;
    createdAt: string;
  }>;
  reviewActions: SerializedReviewAction[];
  duplicateParent?: WorkItemDetailRecord["duplicateParent"];
  duplicateChildren: WorkItemDetailRecord["duplicateChildren"];
}

export interface SerializedWorkItemQueueResult {
  workItems: SerializedWorkItemQueueRecord[];
  filters: QueueFilterOptions;
}

export const serializeQueueRecord = (
  workItem: WorkItemQueueRecord
): SerializedWorkItemQueueRecord => ({
  id: workItem.id,
  fingerprint: workItem.fingerprint,
  type: workItem.type,
  title: workItem.title,
  triageStatus: workItem.triageStatus,
  occurrenceCount: workItem.occurrenceCount,
  projectName: workItem.projectName,
  projectSlug: workItem.projectSlug,
  createdAt: workItem.createdAt.toISOString(),
  updatedAt: workItem.updatedAt.toISOString(),
  ...(workItem.latestDescription
    ? { latestDescription: workItem.latestDescription }
    : {}),
  ...(workItem.severity ? { severity: workItem.severity } : {}),
  ...(workItem.duplicateOfWorkItemId
    ? { duplicateOfWorkItemId: String(workItem.duplicateOfWorkItemId) }
    : {}),
  ...(workItem.duplicateReason
    ? { duplicateReason: workItem.duplicateReason }
    : {}),
});

export const serializeQueueResult = (
  result: WorkItemQueueResult
): SerializedWorkItemQueueResult => ({
  workItems: result.workItems.map(serializeQueueRecord),
  filters: result.filters,
});

export const serializeDetail = (
  detail: WorkItemDetailRecord
): SerializedWorkItemDetail => ({
  workItem: serializeQueueRecord(detail.workItem),
  project: {
    id: detail.project.id,
    name: detail.project.name,
    slug: detail.project.slug,
    createdAt: detail.project.createdAt.toISOString(),
  },
  signals: detail.signals.map((signal) => ({
    id: signal.id,
    projectId: String(signal.projectId),
    source: signal.source,
    type: signal.type,
    title: signal.title,
    fingerprint: signal.fingerprint,
    createdAt: signal.createdAt.toISOString(),
    ...(signal.workItemId ? { workItemId: String(signal.workItemId) } : {}),
    ...(signal.description ? { description: signal.description } : {}),
    ...(signal.severity ? { severity: signal.severity } : {}),
    ...(signal.environment ? { environment: signal.environment } : {}),
    ...(signal.location ? { location: signal.location } : {}),
    ...(signal.runtimeContext ? { runtimeContext: signal.runtimeContext } : {}),
    ...(signal.evidence ? { evidence: signal.evidence } : {}),
    ...(signal.reporter ? { reporter: signal.reporter } : {}),
  })),
  reviewActions: detail.reviewActions.map((action) => ({
    id: action.id,
    workItemId: String(action.workItemId),
    actionType: action.actionType,
    actor: action.actor,
    payload: action.payload,
    createdAt: action.createdAt.toISOString(),
  })),
  duplicateParent: detail.duplicateParent,
  duplicateChildren: detail.duplicateChildren,
});
