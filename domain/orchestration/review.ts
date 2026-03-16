import {
  ReviewActionDoc,
  ReviewActor,
  ReviewRequestInput,
  SignalSeverity,
  WorkItemDoc,
  WorkItemMutableUpdate,
  WorkItemStatus,
} from "./types";

const sanitizeText = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

const normalizeType = (value: unknown) =>
  sanitizeText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const normalizeStatus = (value: unknown): WorkItemStatus | undefined => {
  if (value === "new" || value === "reviewing" || value === "resolved") {
    return value;
  }

  return undefined;
};

const normalizeSeverity = (value: unknown): SignalSeverity | null | undefined => {
  if (value === null) {
    return null;
  }

  if (value === "low" || value === "medium" || value === "high") {
    return value;
  }

  if (sanitizeText(value) === "") {
    return null;
  }

  return undefined;
};

export const normalizeReviewActor = (value?: Partial<ReviewActor>): ReviewActor => {
  const type = value?.type === "system" ? "system" : "human";
  const name = sanitizeText(value?.name) || (type === "system" ? "System" : "Reviewer");

  return {
    type,
    name,
  };
};

export const normalizeMutableWorkItemUpdate = (
  value?: WorkItemMutableUpdate
) => {
  if (!value) {
    return {};
  }

  const normalizedType = normalizeType(value.type);
  const normalizedTitle = sanitizeText(value.title);
  const normalizedDescription = sanitizeText(value.latestDescription);
  const normalizedSeverity = normalizeSeverity(value.severity);
  const normalizedStatus = normalizeStatus(value.triageStatus);

  return {
    triageStatus:
      typeof value.triageStatus === "undefined" ? undefined : normalizedStatus,
    severity:
      typeof value.severity === "undefined" ? undefined : normalizedSeverity,
    type: typeof value.type === "undefined" ? undefined : normalizedType,
    title: typeof value.title === "undefined" ? undefined : normalizedTitle,
    latestDescription:
      typeof value.latestDescription === "undefined"
        ? undefined
        : normalizedDescription,
  };
};

export const buildReviewUpdate = ({
  existing,
  input,
  now,
}: {
  existing: WorkItemDoc;
  input: ReviewRequestInput;
  now: Date;
}) => {
  const actor = normalizeReviewActor(input.actor);
  const updates = normalizeMutableWorkItemUpdate(input.updates);
  const note = sanitizeText(input.note);
  const nextUpdate: Partial<WorkItemDoc> = {};
  const actions: ReviewActionDoc[] = [];

  if (typeof updates.triageStatus !== "undefined") {
    if (!updates.triageStatus) {
      throw new Error("Valid triageStatus is required.");
    }

    if (updates.triageStatus !== existing.triageStatus) {
      nextUpdate.triageStatus = updates.triageStatus;
      actions.push({
        workItemId: existing._id || "",
        actionType: "status_changed",
        actor,
        payload: {
          from: existing.triageStatus,
          to: updates.triageStatus,
        },
        createdAt: now,
      });
    }
  }

  if (typeof updates.severity !== "undefined") {
    if (updates.severity === undefined) {
      throw new Error("Valid severity is required.");
    }

    const currentSeverity = existing.severity || null;
    if (updates.severity !== currentSeverity) {
      nextUpdate.severity = updates.severity || undefined;
      actions.push({
        workItemId: existing._id || "",
        actionType: "severity_changed",
        actor,
        payload: {
          from: currentSeverity,
          to: updates.severity,
        },
        createdAt: now,
      });
    }
  }

  if (typeof updates.type !== "undefined") {
    if (!updates.type) {
      throw new Error("Valid type is required.");
    }

    if (updates.type !== existing.type) {
      nextUpdate.type = updates.type;
      actions.push({
        workItemId: existing._id || "",
        actionType: "type_changed",
        actor,
        payload: {
          from: existing.type,
          to: updates.type,
        },
        createdAt: now,
      });
    }
  }

  if (typeof updates.title !== "undefined") {
    if (!updates.title) {
      throw new Error("Valid title is required.");
    }

    if (updates.title !== existing.title) {
      nextUpdate.title = updates.title;
      actions.push({
        workItemId: existing._id || "",
        actionType: "title_changed",
        actor,
        payload: {
          from: existing.title,
          to: updates.title,
        },
        createdAt: now,
      });
    }
  }

  if (typeof updates.latestDescription !== "undefined") {
    const currentDescription = existing.latestDescription || "";
    if (updates.latestDescription !== currentDescription) {
      nextUpdate.latestDescription = updates.latestDescription || undefined;
      actions.push({
        workItemId: existing._id || "",
        actionType: "description_changed",
        actor,
        payload: {
          from: currentDescription,
          to: updates.latestDescription || "",
        },
        createdAt: now,
      });
    }
  }

  if (note) {
    actions.push({
      workItemId: existing._id || "",
      actionType: "note_added",
      actor,
      payload: {
        note,
      },
      createdAt: now,
    });
  }

  if (actions.length === 0) {
    throw new Error("At least one review change or note is required.");
  }

  nextUpdate.updatedAt = now;

  return {
    actor,
    workItemUpdate: nextUpdate,
    reviewActions: actions,
  };
};

export const buildDuplicateUpdate = ({
  existing,
  target,
  actor,
  note,
  now,
}: {
  existing: WorkItemDoc;
  target: WorkItemDoc;
  actor?: Partial<ReviewActor>;
  note?: string;
  now: Date;
}) => {
  if (!existing._id || !target._id) {
    throw new Error("Both work items must exist.");
  }

  if (String(existing._id) === String(target._id)) {
    throw new Error("A work item cannot be marked as a duplicate of itself.");
  }

  if (target.duplicateOfWorkItemId) {
    throw new Error("Target work item is already marked as a duplicate.");
  }

  const normalizedActor = normalizeReviewActor(actor);
  const trimmedNote = sanitizeText(note);
  const actions: ReviewActionDoc[] = [
    {
      workItemId: existing._id,
      actionType: "marked_duplicate",
      actor: normalizedActor,
      payload: {
        duplicateOfWorkItemId: String(target._id),
        duplicateOfTitle: target.title,
      },
      createdAt: now,
    },
  ];

  if (trimmedNote) {
    actions.push({
      workItemId: existing._id,
      actionType: "note_added",
      actor: normalizedActor,
      payload: {
        note: trimmedNote,
      },
      createdAt: now,
    });
  }

  return {
    workItemUpdate: {
      duplicateOfWorkItemId: String(target._id),
      duplicateReason: trimmedNote || undefined,
      updatedAt: now,
    } as Partial<WorkItemDoc>,
    reviewActions: actions,
  };
};

export const buildDuplicateRemovalUpdate = ({
  existing,
  actor,
  note,
  now,
}: {
  existing: WorkItemDoc;
  actor?: Partial<ReviewActor>;
  note?: string;
  now: Date;
}) => {
  if (!existing.duplicateOfWorkItemId) {
    throw new Error("Work item is not currently marked as a duplicate.");
  }

  const normalizedActor = normalizeReviewActor(actor);
  const trimmedNote = sanitizeText(note);
  const actions: ReviewActionDoc[] = [
    {
      workItemId: existing._id || "",
      actionType: "duplicate_link_removed",
      actor: normalizedActor,
      payload: {
        previousDuplicateOfWorkItemId: String(existing.duplicateOfWorkItemId),
      },
      createdAt: now,
    },
  ];

  if (trimmedNote) {
    actions.push({
      workItemId: existing._id || "",
      actionType: "note_added",
      actor: normalizedActor,
      payload: {
        note: trimmedNote,
      },
      createdAt: now,
    });
  }

  return {
    workItemUpdate: {
      duplicateOfWorkItemId: undefined,
      duplicateReason: undefined,
      updatedAt: now,
    } as Partial<WorkItemDoc>,
    reviewActions: actions,
  };
};
