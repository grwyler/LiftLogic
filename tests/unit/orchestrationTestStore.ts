import { ObjectId } from "mongodb";
import { OrchestrationPersistence } from "../../domain/orchestration/persistence";
import {
  ProjectDoc,
  ReviewActionDoc,
  SignalDoc,
  WorkItemDoc,
} from "../../domain/orchestration/types";

export const toIdString = (value: ObjectId | string | undefined) =>
  String(value || "");

export class InMemoryOrchestrationStore implements OrchestrationPersistence {
  projects: Array<ProjectDoc & { _id: ObjectId }> = [];
  signals: Array<SignalDoc & { _id: ObjectId }> = [];
  workItems: Array<WorkItemDoc & { _id: ObjectId }> = [];
  reviewActions: Array<ReviewActionDoc & { _id: ObjectId }> = [];

  async findProjectBySlug(slug: string) {
    return this.projects.find((project) => project.slug === slug) || null;
  }

  async listProjects() {
    return [...this.projects];
  }

  async createProject(project: ProjectDoc) {
    const created = {
      ...project,
      _id: new ObjectId(),
    };
    this.projects.push(created);
    return created;
  }

  async createSignal(signal: SignalDoc) {
    const created = {
      ...signal,
      projectId: toIdString(signal.projectId),
      _id: new ObjectId(),
    };
    this.signals.push(created);
    return created;
  }

  async updateSignalWorkItemLink(signalId: string, workItemId: string) {
    const signal = this.signals.find((item) => toIdString(item._id) === signalId);
    if (signal) {
      signal.workItemId = workItemId;
    }
  }

  async listSignalsByWorkItemId(workItemId: string) {
    return this.signals
      .filter((signal) => toIdString(signal.workItemId) === workItemId)
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());
  }

  async countSignals() {
    return this.signals.length;
  }

  async findWorkItemById(id: string) {
    return this.workItems.find((workItem) => toIdString(workItem._id) === id) || null;
  }

  async findWorkItemByFingerprint(params: {
    projectId: string;
    fingerprint: string;
  }) {
    return (
      this.workItems.find(
        (workItem) =>
          toIdString(workItem.projectId) === toIdString(params.projectId) &&
          workItem.fingerprint === params.fingerprint
      ) || null
    );
  }

  async listWorkItems() {
    return [...this.workItems];
  }

  async createWorkItem(workItem: WorkItemDoc) {
    const created = {
      ...workItem,
      projectId: toIdString(workItem.projectId),
      latestSignalId: workItem.latestSignalId
        ? toIdString(workItem.latestSignalId)
        : undefined,
      duplicateOfWorkItemId: workItem.duplicateOfWorkItemId
        ? toIdString(workItem.duplicateOfWorkItemId)
        : undefined,
      _id: new ObjectId(),
    };
    this.workItems.push(created);
    return created;
  }

  async updateWorkItem(id: string, update: Partial<WorkItemDoc>) {
    const index = this.workItems.findIndex(
      (workItem) => toIdString(workItem._id) === toIdString(id)
    );

    if (index === -1) {
      throw new Error("Work item not found");
    }

    const current = this.workItems[index];
    const next = {
      ...current,
      ...Object.fromEntries(
        Object.entries(update).filter(([, value]) => typeof value !== "undefined")
      ),
      projectId: update.projectId ? toIdString(update.projectId) : current.projectId,
      latestSignalId: update.latestSignalId
        ? toIdString(update.latestSignalId)
        : typeof update.latestSignalId === "undefined"
        ? current.latestSignalId
        : undefined,
      duplicateOfWorkItemId: update.duplicateOfWorkItemId
        ? toIdString(update.duplicateOfWorkItemId)
        : typeof update.duplicateOfWorkItemId === "undefined"
        ? current.duplicateOfWorkItemId
        : undefined,
    };

    if (Object.prototype.hasOwnProperty.call(update, "duplicateReason") && typeof update.duplicateReason === "undefined") {
      delete next.duplicateReason;
    }

    if (Object.prototype.hasOwnProperty.call(update, "duplicateOfWorkItemId") && typeof update.duplicateOfWorkItemId === "undefined") {
      delete next.duplicateOfWorkItemId;
    }

    this.workItems[index] = next;
    return next;
  }

  async listDuplicateChildren(workItemId: string) {
    return this.workItems.filter(
      (workItem) => toIdString(workItem.duplicateOfWorkItemId) === workItemId
    );
  }

  async countWorkItems() {
    return this.workItems.length;
  }

  async createReviewActions(actions: ReviewActionDoc[]) {
    const created = actions.map((action) => ({
      ...action,
      workItemId: toIdString(action.workItemId),
      _id: new ObjectId(),
    }));
    this.reviewActions.push(...created);
    return created;
  }

  async listReviewActionsByWorkItemId(workItemId: string) {
    return this.reviewActions
      .filter((action) => toIdString(action.workItemId) === workItemId)
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());
  }

  async countReviewActions() {
    return this.reviewActions.length;
  }
}
