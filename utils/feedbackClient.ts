import { emitDevBugRequest } from "./devBugRecorder";
import {
  FeedbackBugArchetype,
  FeedbackItemDoc,
  FeedbackScopeGuardrails,
  FeedbackTriageStatus,
  FeedbackWorkItemDoc,
} from "./types";

export const fetchFeedbackWorkflow = async () => {
  const response = await fetch("/api/feedback");
  if (!response.ok) {
    const message = await response.text();
    throw new Error(`fetchFeedbackWorkflow ${response.status}: ${message}`);
  }

  const data = await response.json();
  return {
    feedback: Array.isArray(data.feedback)
      ? (data.feedback as FeedbackItemDoc[])
      : [],
    workItems: Array.isArray(data.workItems)
      ? (data.workItems as FeedbackWorkItemDoc[])
      : [],
  };
};

export const updateFeedbackWorkItem = async ({
  workItemId,
  triageStatus,
  severity,
  fixThreadId,
  fixCommitSha,
  title,
  latestDescription,
  resolution,
  bugArchetype,
  bugContext,
  scopeGuardrails,
  implementationContext,
  verificationPack,
  completedVerificationIds,
}: {
  workItemId: string;
  triageStatus: FeedbackTriageStatus;
  severity?: "low" | "medium" | "high";
  fixThreadId?: string;
  fixCommitSha?: string;
  title?: string;
  latestDescription?: string;
  resolution?: FeedbackWorkItemDoc["resolution"];
  bugArchetype?: FeedbackBugArchetype;
  bugContext?: FeedbackWorkItemDoc["bugContext"];
  scopeGuardrails?: FeedbackScopeGuardrails;
  implementationContext?: FeedbackWorkItemDoc["implementationContext"];
  verificationPack?: FeedbackWorkItemDoc["verificationPack"];
  completedVerificationIds?: string[];
}) => {
  emitDevBugRequest({
    label: `Update work item ${workItemId}`,
    expected: "The feedback work item status is updated successfully.",
    actual: `Saving triage status ${triageStatus}.`,
    status: "info",
  });

  const response = await fetch("/api/feedback", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      workItemId,
      triageStatus,
      severity,
      fixThreadId,
      fixCommitSha,
      title,
      latestDescription,
      resolution,
      bugArchetype,
      bugContext,
      scopeGuardrails,
      implementationContext,
      verificationPack,
      completedVerificationIds,
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    emitDevBugRequest({
      label: `Update work item ${workItemId} failed`,
      expected: "The feedback work item status is updated successfully.",
      actual: `Work item update failed with ${response.status}: ${message}`,
      status: "failure",
    });
    throw new Error(`updateFeedbackWorkItem ${response.status}: ${message}`);
  }

  emitDevBugRequest({
    label: `Updated work item ${workItemId}`,
    expected: "The feedback work item status is updated successfully.",
    actual: `Work item update completed with ${response.status}.`,
    status: "success",
  });

  return response.json();
};

export const createFollowUpFeedbackWorkItem = async ({
  title,
  description,
  type,
  linkedWorkItemId,
  severity,
  page,
}: {
  title: string;
  description: string;
  type: "bug" | "feature";
  linkedWorkItemId: string;
  severity?: "low" | "medium" | "high";
  page?: string;
}) => {
  const response = await fetch("/api/feedback", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      feedback: {
        title,
        description,
        type,
        severity,
        page,
        linkedWorkItemId,
      },
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`createFollowUpFeedbackWorkItem ${response.status}: ${message}`);
  }

  return response.json();
};

export const deleteFeedbackWorkItem = async (workItemId: string) => {
  emitDevBugRequest({
    label: "Delete feedback work item",
    expected: "The selected work item and its linked reports are removed.",
    actual: "Sending delete request for feedback work item.",
    status: "info",
  });
  const response = await fetch("/api/feedback", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ workItemId }),
  });

  if (!response.ok) {
    const message = await response.text();
    emitDevBugRequest({
      label: "Delete feedback work item failed",
      expected: "The selected work item and its linked reports are removed.",
      actual: `Delete request failed with ${response.status}: ${message}`,
      status: "failure",
    });
    throw new Error(`deleteFeedbackWorkItem ${response.status}: ${message}`);
  }

  emitDevBugRequest({
    label: "Deleted feedback work item",
    expected: "The selected work item and its linked reports are removed.",
    actual: `Delete request completed with ${response.status}.`,
    status: "success",
  });

  return response.json();
};
