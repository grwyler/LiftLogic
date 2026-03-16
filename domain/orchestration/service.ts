import { ObjectId } from "mongodb";
import { OrchestrationPersistence } from "./persistence";
import { buildSignalFingerprint } from "./fingerprint";
import { normalizeProjectInput, normalizeSignalInput } from "./normalize";
import {
  IngestSignalRequest,
  IngestSignalResult,
  ProjectDoc,
  SignalDoc,
  WorkItemDoc,
} from "./types";

const asObjectIdLike = (value: ObjectId | string | undefined) => {
  if (!value) {
    return value;
  }

  return value instanceof ObjectId ? value : String(value);
};

const compareSeverity = (value?: string) => {
  switch (value) {
    case "high":
      return 3;
    case "medium":
      return 2;
    case "low":
      return 1;
    default:
      return 0;
  }
};

const maxSeverity = (
  left?: "low" | "medium" | "high",
  right?: "low" | "medium" | "high"
) => (compareSeverity(left) >= compareSeverity(right) ? left : right);

const resolveProject = async (
  store: OrchestrationPersistence,
  request: IngestSignalRequest,
  now: Date
) => {
  const normalized = normalizeProjectInput(request);
  const existing = await store.findProjectBySlug(normalized.slug);

  if (existing) {
    return existing;
  }

  const project: ProjectDoc = {
    name: normalized.name,
    slug: normalized.slug,
    createdAt: now,
  };

  return store.createProject(project);
};

export const ingestSignal = async ({
  store,
  request,
  now = new Date(),
}: {
  store: OrchestrationPersistence;
  request: IngestSignalRequest;
  now?: Date;
}): Promise<IngestSignalResult> => {
  const project = await resolveProject(store, request, now);
  const normalizedSignal = normalizeSignalInput(request);
  const fingerprint = buildSignalFingerprint({
    project: {
      slug: project.slug,
      name: project.name,
    },
    signal: normalizedSignal,
  });

  const signalToInsert: SignalDoc = {
    projectId: asObjectIdLike(project._id) || project.slug,
    source: normalizedSignal.source,
    type: normalizedSignal.type,
    title: normalizedSignal.title,
    description: normalizedSignal.description,
    severity: normalizedSignal.severity,
    environment: normalizedSignal.environment,
    location: normalizedSignal.location,
    runtimeContext: normalizedSignal.runtimeContext,
    evidence: normalizedSignal.evidence,
    reporter: normalizedSignal.reporter,
    fingerprint,
    createdAt: normalizedSignal.createdAt,
  };

  const insertedSignal = await store.createSignal(signalToInsert);
  const existingWorkItem = await store.findWorkItemByFingerprint({
    projectId: String(asObjectIdLike(project._id) || project.slug),
    fingerprint,
  });

  if (!existingWorkItem) {
    const newWorkItem: WorkItemDoc = {
      projectId: asObjectIdLike(project._id) || project.slug,
      fingerprint,
      type: normalizedSignal.type,
      title: normalizedSignal.title,
      latestDescription: normalizedSignal.description,
      triageStatus: "new",
      severity: normalizedSignal.severity,
      occurrenceCount: 1,
      latestSignalId: asObjectIdLike(insertedSignal._id),
      createdAt: now,
      updatedAt: now,
    };
    const createdWorkItem = await store.createWorkItem(newWorkItem);
    await store.updateSignalWorkItemLink(
      String(insertedSignal._id || ""),
      String(createdWorkItem._id || "")
    );

    return {
      project,
      signal: insertedSignal,
      workItem: createdWorkItem,
      duplicate: false,
    };
  }

  const updatedWorkItem = await store.updateWorkItem(String(existingWorkItem._id || ""), {
    title: normalizedSignal.title,
    latestDescription: normalizedSignal.description,
    severity: maxSeverity(existingWorkItem.severity, normalizedSignal.severity),
    occurrenceCount: Number(existingWorkItem.occurrenceCount || 0) + 1,
    latestSignalId: asObjectIdLike(insertedSignal._id),
    updatedAt: now,
  });
  await store.updateSignalWorkItemLink(
    String(insertedSignal._id || ""),
    String(updatedWorkItem._id || "")
  );

  return {
    project,
    signal: insertedSignal,
    workItem: updatedWorkItem,
    duplicate: true,
  };
};
