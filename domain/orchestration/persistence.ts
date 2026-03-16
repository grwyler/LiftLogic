import {
  ProjectDoc,
  ReviewActionDoc,
  SignalDoc,
  WorkItemDoc,
} from "./types";

export interface OrchestrationPersistence {
  findProjectBySlug(slug: string): Promise<ProjectDoc | null>;
  listProjects(): Promise<ProjectDoc[]>;
  createProject(project: ProjectDoc): Promise<ProjectDoc>;

  createSignal(signal: SignalDoc): Promise<SignalDoc>;
  updateSignalWorkItemLink(signalId: string, workItemId: string): Promise<void>;
  listSignalsByWorkItemId(workItemId: string): Promise<SignalDoc[]>;
  countSignals(): Promise<number>;

  findWorkItemById(id: string): Promise<WorkItemDoc | null>;
  findWorkItemByFingerprint(params: {
    projectId: string;
    fingerprint: string;
  }): Promise<WorkItemDoc | null>;
  listWorkItems(): Promise<WorkItemDoc[]>;
  createWorkItem(workItem: WorkItemDoc): Promise<WorkItemDoc>;
  updateWorkItem(id: string, update: Partial<WorkItemDoc>): Promise<WorkItemDoc>;
  listDuplicateChildren(workItemId: string): Promise<WorkItemDoc[]>;
  countWorkItems(): Promise<number>;

  createReviewActions(actions: ReviewActionDoc[]): Promise<ReviewActionDoc[]>;
  listReviewActionsByWorkItemId(workItemId: string): Promise<ReviewActionDoc[]>;
  countReviewActions(): Promise<number>;
}
