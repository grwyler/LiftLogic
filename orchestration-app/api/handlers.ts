import { NextApiRequest, NextApiResponse } from "next";
import { ingestSignal } from "../../domain/orchestration/service";
import {
  IngestSignalRequest,
  ReviewRequestInput,
  SignalSeverity,
  WorkItemQuery,
  WorkItemStatus,
} from "../../domain/orchestration/types";
import { serializeDetail, serializeQueueResult } from "../../server/orchestration/serialization";
import {
  clearWorkItemDuplicateInStore,
  getWorkItemDetailFromStore,
  listWorkItemsFromStore,
  markWorkItemDuplicateInStore,
  updateWorkItemReviewInStore,
} from "../../server/orchestration/service";
import { ensureSeededOrchestrationData } from "../../server/orchestration/seed";
import { getOrchestrationPersistence } from "../../server/orchestration/store";

const readString = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

const readId = (value: string | string[] | undefined) =>
  String(readString(value) || "");

const readSeverity = (value: string | undefined): SignalSeverity | undefined =>
  value === "low" || value === "medium" || value === "high" ? value : undefined;

const readStatus = (value: string | undefined): WorkItemStatus | undefined =>
  value === "new" || value === "reviewing" || value === "resolved"
    ? value
    : undefined;

const parseWorkItemQuery = (query: NextApiRequest["query"]): WorkItemQuery => {
  const sortBy = readString(query.sortBy);
  const sortDirection = readString(query.sortDirection);

  return {
    project: readString(query.project),
    type: readString(query.type),
    severity: readSeverity(readString(query.severity)),
    triageStatus: readStatus(readString(query.triageStatus)),
    search: readString(query.search),
    includeDuplicates: readString(query.includeDuplicates) === "true",
    sortBy:
      sortBy === "updatedAt" || sortBy === "occurrenceCount" || sortBy === "severity"
        ? sortBy
        : undefined,
    sortDirection:
      sortDirection === "asc"
        ? "asc"
        : sortDirection === "desc"
          ? "desc"
          : undefined,
  };
};

export const handleSignalsApi = async (
  req: NextApiRequest,
  res: NextApiResponse
) => {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  try {
    const request = req.body as IngestSignalRequest;
    const store = await getOrchestrationPersistence();
    const result = await ingestSignal({
      store,
      request,
    });

    return res.status(200).json({
      success: true,
      duplicate: result.duplicate,
      project: result.project,
      signal: result.signal,
      workItem: result.workItem,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to ingest signal.";
    const statusCode = /required/i.test(message) ? 400 : 500;

    if (statusCode === 500) {
      console.error("Signal ingestion error:", error);
    }

    return res.status(statusCode).json({ message });
  }
};

export const handleWorkItemsApi = async (
  req: NextApiRequest,
  res: NextApiResponse
) => {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  try {
    await ensureSeededOrchestrationData();
    const store = await getOrchestrationPersistence();
    const result = await listWorkItemsFromStore({
      store,
      query: parseWorkItemQuery(req.query),
    });
    return res.status(200).json(serializeQueueResult(result));
  } catch (error) {
    console.error("List work items error:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const handleWorkItemApi = async (
  req: NextApiRequest,
  res: NextApiResponse
) => {
  const id = readId(req.query.id);

  if (req.method === "GET") {
    try {
      await ensureSeededOrchestrationData();
      const store = await getOrchestrationPersistence();
      const detail = await getWorkItemDetailFromStore({ store, id });

      if (!detail) {
        return res.status(404).json({ message: "Work item not found" });
      }

      return res.status(200).json(serializeDetail(detail));
    } catch (error) {
      console.error("Work item detail error:", error);
      return res.status(500).json({ message: "Internal Server Error" });
    }
  }

  if (req.method === "PATCH") {
    try {
      const input = req.body as ReviewRequestInput;
      const store = await getOrchestrationPersistence();
      const detail = await updateWorkItemReviewInStore({
        store,
        id,
        input,
      });

      if (!detail) {
        return res.status(404).json({ message: "Work item not found" });
      }

      return res.status(200).json(serializeDetail(detail));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to update work item.";
      const statusCode = /not found|required/i.test(message) ? 400 : 500;
      return res.status(statusCode).json({ message });
    }
  }

  return res.status(405).json({ message: "Method Not Allowed" });
};

export const handleWorkItemDuplicateApi = async (
  req: NextApiRequest,
  res: NextApiResponse
) => {
  const id = readId(req.query.id);

  if (req.method === "POST") {
    try {
      const body = req.body as {
        targetWorkItemId?: string;
        actor?: { type?: "system" | "human"; name?: string };
        note?: string;
      };
      const targetWorkItemId = String(body.targetWorkItemId || "");
      if (!targetWorkItemId) {
        return res.status(400).json({ message: "targetWorkItemId is required" });
      }

      const store = await getOrchestrationPersistence();
      const detail = await markWorkItemDuplicateInStore({
        store,
        id,
        targetWorkItemId,
        actor: body.actor,
        note: body.note,
      });

      return res.status(200).json(detail ? serializeDetail(detail) : null);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to mark duplicate.";
      const statusCode = /not found|required|duplicate/i.test(message) ? 400 : 500;
      return res.status(statusCode).json({ message });
    }
  }

  if (req.method === "DELETE") {
    try {
      const body = req.body as {
        actor?: { type?: "system" | "human"; name?: string };
        note?: string;
      };
      const store = await getOrchestrationPersistence();
      const detail = await clearWorkItemDuplicateInStore({
        store,
        id,
        actor: body.actor,
        note: body.note,
      });

      return res.status(200).json(detail ? serializeDetail(detail) : null);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to clear duplicate.";
      const statusCode = /not found|required|duplicate/i.test(message) ? 400 : 500;
      return res.status(statusCode).json({ message });
    }
  }

  return res.status(405).json({ message: "Method Not Allowed" });
};
