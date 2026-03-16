import { buildDuplicateRemovalUpdate, buildDuplicateUpdate, buildReviewUpdate } from "../../domain/orchestration/review";
import { OrchestrationPersistence } from "../../domain/orchestration/persistence";
import {
  QueueFilterOptions,
  ReviewRequestInput,
  SignalSeverity,
  WorkItemDetailRecord,
  WorkItemDoc,
  WorkItemQuery,
  WorkItemQueueRecord,
  WorkItemQueueResult,
  WorkItemSortField,
  WorkItemSummaryRecord,
} from "../../domain/orchestration/types";

const compareSeverity = (value?: SignalSeverity) => {
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

const sortQueueItems = (
  workItems: WorkItemQueueRecord[],
  sortBy: WorkItemSortField,
  sortDirection: "asc" | "desc"
) => {
  const multiplier = sortDirection === "asc" ? 1 : -1;

  return [...workItems].sort((left, right) => {
    if (sortBy === "occurrenceCount") {
      return (left.occurrenceCount - right.occurrenceCount) * multiplier;
    }

    if (sortBy === "severity") {
      return (
        (compareSeverity(left.severity) - compareSeverity(right.severity)) * multiplier
      );
    }

    return (left.updatedAt.getTime() - right.updatedAt.getTime()) * multiplier;
  });
};

const toWorkItemSummary = (
  workItem: WorkItemDoc,
  projectName: string
): WorkItemSummaryRecord => ({
  id: String(workItem._id || ""),
  title: workItem.title,
  type: workItem.type,
  triageStatus: workItem.triageStatus,
  severity: workItem.severity,
  occurrenceCount: workItem.occurrenceCount,
  fingerprint: workItem.fingerprint,
  projectName,
});

const buildQueueFilterOptions = ({
  projects,
  workItems,
}: {
  projects: Awaited<ReturnType<OrchestrationPersistence["listProjects"]>>;
  workItems: WorkItemDoc[];
}): QueueFilterOptions => ({
  projects: projects
    .map((project) => ({
      slug: project.slug,
      name: project.name,
    }))
    .sort((left, right) => left.name.localeCompare(right.name)),
  types: Array.from(new Set(workItems.map((item) => item.type))).sort(),
  severities: ["high", "medium", "low"].filter((value) =>
    workItems.some((item) => item.severity === value)
  ) as SignalSeverity[],
  triageStatuses: Array.from(new Set(workItems.map((item) => item.triageStatus))).sort() as QueueFilterOptions["triageStatuses"],
});

const filterBySearch = (item: WorkItemQueueRecord, search?: string) => {
  const query = (search || "").trim().toLowerCase();
  if (!query) {
    return true;
  }

  return [item.title, item.fingerprint, item.latestDescription || ""]
    .join(" ")
    .toLowerCase()
    .includes(query);
};

export const listWorkItemsFromStore = async ({
  store,
  query = {},
}: {
  store: OrchestrationPersistence;
  query?: WorkItemQuery;
}): Promise<WorkItemQueueResult> => {
  const [projects, workItems] = await Promise.all([
    store.listProjects(),
    store.listWorkItems(),
  ]);
  const projectMap = new Map(projects.map((project) => [String(project._id || ""), project]));
  const filters = buildQueueFilterOptions({ projects, workItems });
  const includeDuplicates = Boolean(query.includeDuplicates);

  const mapped = workItems.map((workItem) => {
    const project = projectMap.get(String(workItem.projectId));

    return {
      ...workItem,
      id: String(workItem._id || ""),
      projectName: project?.name || "Unknown Project",
      projectSlug: project?.slug || "unknown-project",
    };
  });

  const filtered = mapped.filter((item) => {
    if (!includeDuplicates && item.duplicateOfWorkItemId) {
      return false;
    }

    if (query.project && item.projectSlug !== query.project) {
      return false;
    }

    if (query.type && item.type !== query.type) {
      return false;
    }

    if (query.severity && item.severity !== query.severity) {
      return false;
    }

    if (query.triageStatus && item.triageStatus !== query.triageStatus) {
      return false;
    }

    return filterBySearch(item, query.search);
  });

  return {
    workItems: sortQueueItems(
      filtered,
      query.sortBy || "updatedAt",
      query.sortDirection || "desc"
    ),
    filters,
  };
};

export const getWorkItemDetailFromStore = async ({
  store,
  id,
}: {
  store: OrchestrationPersistence;
  id: string;
}): Promise<WorkItemDetailRecord | null> => {
  const workItem = await store.findWorkItemById(id);

  if (!workItem) {
    return null;
  }

  const [project, signals, reviewActions, duplicateParent, duplicateChildren] =
    await Promise.all([
      store.listProjects().then((projects) =>
        projects.find((item) => String(item._id || "") === String(workItem.projectId)) || null
      ),
      store.listSignalsByWorkItemId(id),
      store.listReviewActionsByWorkItemId(id),
      workItem.duplicateOfWorkItemId
        ? store.findWorkItemById(String(workItem.duplicateOfWorkItemId))
        : Promise.resolve(null),
      store.listDuplicateChildren(id),
    ]);

  if (!project) {
    return null;
  }

  return {
    workItem: {
      ...workItem,
      id,
      projectName: project.name,
      projectSlug: project.slug,
    },
    project: {
      ...project,
      id: String(project._id || ""),
    },
    signals: signals.map((signal) => ({
      ...signal,
      id: String(signal._id || ""),
    })),
    reviewActions: reviewActions.map((action) => ({
      ...action,
      id: String(action._id || ""),
      workItemId: String(action.workItemId),
    })),
    duplicateParent: duplicateParent
      ? toWorkItemSummary(duplicateParent, project.name)
      : undefined,
    duplicateChildren: duplicateChildren.map((child) =>
      toWorkItemSummary(child, project.name)
    ),
  };
};

export const updateWorkItemReviewInStore = async ({
  store,
  id,
  input,
}: {
  store: OrchestrationPersistence;
  id: string;
  input: ReviewRequestInput;
}) => {
  const existing = await store.findWorkItemById(id);

  if (!existing) {
    throw new Error("Work item not found.");
  }

  const review = buildReviewUpdate({
    existing,
    input,
    now: new Date(),
  });

  await store.updateWorkItem(id, review.workItemUpdate);
  await store.createReviewActions(review.reviewActions);

  return getWorkItemDetailFromStore({ store, id });
};

export const markWorkItemDuplicateInStore = async ({
  store,
  id,
  targetWorkItemId,
  actor,
  note,
}: {
  store: OrchestrationPersistence;
  id: string;
  targetWorkItemId: string;
  actor?: ReviewRequestInput["actor"];
  note?: string;
}) => {
  const [existing, target] = await Promise.all([
    store.findWorkItemById(id),
    store.findWorkItemById(targetWorkItemId),
  ]);

  if (!existing || !target) {
    throw new Error("Both work items must exist.");
  }

  const outcome = buildDuplicateUpdate({
    existing,
    target,
    actor,
    note,
    now: new Date(),
  });

  await store.updateWorkItem(id, outcome.workItemUpdate);
  await store.createReviewActions(outcome.reviewActions);

  return getWorkItemDetailFromStore({ store, id });
};

export const clearWorkItemDuplicateInStore = async ({
  store,
  id,
  actor,
  note,
}: {
  store: OrchestrationPersistence;
  id: string;
  actor?: ReviewRequestInput["actor"];
  note?: string;
}) => {
  const existing = await store.findWorkItemById(id);

  if (!existing) {
    throw new Error("Work item not found.");
  }

  const outcome = buildDuplicateRemovalUpdate({
    existing,
    actor,
    note,
    now: new Date(),
  });

  await store.updateWorkItem(id, outcome.workItemUpdate);
  await store.createReviewActions(outcome.reviewActions);

  return getWorkItemDetailFromStore({ store, id });
};

export const countOrchestrationDocumentsFromStore = async ({
  store,
}: {
  store: OrchestrationPersistence;
}) => {
  const [projects, signals, workItems, reviewActions] = await Promise.all([
    store.listProjects().then((items) => items.length),
    store.countSignals(),
    store.countWorkItems(),
    store.countReviewActions(),
  ]);

  return {
    projects,
    signals,
    workItems,
    reviewActions,
  };
};
