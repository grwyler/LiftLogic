import { ObjectId } from "mongodb";
import type { OrchestrationPersistence } from "./persistence";

export type SignalSeverity = "low" | "medium" | "high";
export type WorkItemStatus = "new" | "reviewing" | "resolved";
export type ReviewActorType = "system" | "human";
export type ReviewActionType =
  | "status_changed"
  | "severity_changed"
  | "type_changed"
  | "title_changed"
  | "description_changed"
  | "marked_duplicate"
  | "duplicate_link_removed"
  | "note_added";

export interface ProjectDoc {
  _id?: ObjectId;
  name: string;
  slug: string;
  createdAt: Date;
}

export interface SignalReporter {
  id?: string;
  name?: string;
  email?: string;
  type?: string;
}

export interface SignalRuntimeContext {
  environment?: string;
  [key: string]: unknown;
}

export interface SignalDoc {
  _id?: ObjectId;
  projectId: ObjectId | string;
  source: string;
  type: string;
  title: string;
  description?: string;
  severity?: SignalSeverity;
  environment?: string;
  location?: string;
  runtimeContext?: SignalRuntimeContext;
  evidence?: Record<string, unknown>;
  reporter?: SignalReporter;
  fingerprint: string;
  workItemId?: ObjectId | string;
  createdAt: Date;
}

export interface WorkItemDoc {
  _id?: ObjectId;
  projectId: ObjectId | string;
  fingerprint: string;
  type: string;
  title: string;
  latestDescription?: string;
  triageStatus: WorkItemStatus;
  severity?: SignalSeverity;
  occurrenceCount: number;
  latestSignalId?: ObjectId | string;
  duplicateOfWorkItemId?: ObjectId | string;
  duplicateReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReviewActor {
  type: ReviewActorType;
  name: string;
}

export interface ReviewActionDoc {
  _id?: ObjectId;
  workItemId: ObjectId | string;
  actionType: ReviewActionType;
  actor: ReviewActor;
  payload: Record<string, unknown>;
  createdAt: Date;
}

export interface ProjectInput {
  slug?: string;
  name?: string;
}

export interface SignalInput {
  source?: string;
  type?: string;
  title?: string;
  description?: string;
  severity?: string;
  environment?: string;
  location?: string;
  runtimeContext?: Record<string, unknown>;
  evidence?: Record<string, unknown>;
  reporter?: Record<string, unknown>;
  createdAt?: string | Date;
}

export interface IngestSignalRequest {
  project?: ProjectInput;
  signal?: SignalInput;
}

export interface NormalizedProjectInput {
  slug: string;
  name: string;
}

export interface NormalizedSignalInput {
  source: string;
  type: string;
  title: string;
  description?: string;
  severity?: SignalSeverity;
  environment?: string;
  location?: string;
  runtimeContext?: SignalRuntimeContext;
  evidence: Record<string, unknown>;
  reporter?: SignalReporter;
  createdAt: Date;
}

export interface WorkItemQueueRecord extends WorkItemDoc {
  id: string;
  projectName: string;
  projectSlug: string;
}

export interface WorkItemSummaryRecord {
  id: string;
  title: string;
  type: string;
  triageStatus: WorkItemStatus;
  severity?: SignalSeverity;
  occurrenceCount: number;
  fingerprint: string;
  projectName: string;
}

export interface WorkItemDetailRecord {
  workItem: WorkItemQueueRecord;
  signals: Array<SignalDoc & { id: string }>;
  project: ProjectDoc & { id: string };
  reviewActions: Array<ReviewActionDoc & { id: string }>;
  duplicateParent?: WorkItemSummaryRecord;
  duplicateChildren: WorkItemSummaryRecord[];
}

export type WorkItemSortField = "updatedAt" | "occurrenceCount" | "severity";

export interface WorkItemQuery {
  project?: string;
  type?: string;
  severity?: SignalSeverity;
  triageStatus?: WorkItemStatus;
  search?: string;
  includeDuplicates?: boolean;
  sortBy?: WorkItemSortField;
  sortDirection?: "asc" | "desc";
}

export interface QueueFilterOptions {
  projects: Array<{ slug: string; name: string }>;
  types: string[];
  severities: SignalSeverity[];
  triageStatuses: WorkItemStatus[];
}

export interface WorkItemQueueResult {
  workItems: WorkItemQueueRecord[];
  filters: QueueFilterOptions;
}

export interface WorkItemMutableUpdate {
  triageStatus?: WorkItemStatus;
  severity?: SignalSeverity | null;
  type?: string;
  title?: string;
  latestDescription?: string;
}

export interface ReviewRequestInput {
  actor?: Partial<ReviewActor>;
  updates?: WorkItemMutableUpdate;
  note?: string;
}

export type OrchestrationStore = OrchestrationPersistence;

export interface IngestSignalResult {
  project: ProjectDoc;
  signal: SignalDoc;
  workItem: WorkItemDoc;
  duplicate: boolean;
}
