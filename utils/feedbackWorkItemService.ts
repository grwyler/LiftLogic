import { Collection, ObjectId } from "mongodb";
import {
  FeedbackItemDoc,
  FeedbackWorkItemDoc,
} from "./types";
import { createFeedbackFingerprint, getLegacyStatusFromTriage } from "./feedbackWorkflow";
import {
  sanitizeFeedbackSeverity,
  sanitizeStructuredRepro,
  sanitizeText,
} from "./feedbackIntakeService";
import {
  buildImplementationContext,
  buildVerificationPack,
  hasMinimumStructuredRepro,
} from "./feedbackWorkItemContext";

const MAX_STORED_REPORT_IDS = 25;

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

export const selectHigherSeverity = (
  left?: "low" | "medium" | "high",
  right?: "low" | "medium" | "high"
) =>
  compareSeverity(left) >= compareSeverity(right) ? left : right;

const buildReportIdList = (existing: unknown, nextReportId: string) => {
  const seen = new Set<string>();
  const reportIds = Array.isArray(existing)
    ? existing.map((value) => String(value)).filter(Boolean)
    : [];

  return [...reportIds, nextReportId]
    .filter((value) => {
      if (seen.has(value)) {
        return false;
      }

      seen.add(value);
      return true;
    })
    .slice(-MAX_STORED_REPORT_IDS);
};

export const upsertFeedbackWorkItem = async ({
  workItemCollection,
  feedback,
  feedbackId,
  now,
}: {
  workItemCollection: Collection<FeedbackWorkItemDoc>;
  feedback: FeedbackItemDoc;
  feedbackId: string;
  now: Date;
}) => {
  const fingerprint = feedback.fingerprint || createFeedbackFingerprint(feedback);
  const existing = (await workItemCollection.findOne({
    fingerprint,
  })) as FeedbackWorkItemDoc | null;

  if (existing?._id) {
    const occurrenceCount = Number(existing.occurrenceCount || 0) + 1;
    const triageStatus = existing.triageStatus || "new";
    const workItemId = existing._id.toString();
    const nextReportIds = buildReportIdList(existing.reportIds, feedbackId);
    const nextSeverity = selectHigherSeverity(existing.severity, feedback.severity);

    const update: Partial<FeedbackWorkItemDoc> = {
      title: feedback.title,
      latestDescription: feedback.description,
      page: feedback.page || existing.page,
      severity: nextSeverity,
      deviceType: feedback.deviceType || existing.deviceType,
      latestRuntimeContext: feedback.runtimeContext || existing.latestRuntimeContext,
      structuredRepro: feedback.structuredRepro || existing.structuredRepro,
      implementationContext: buildImplementationContext({
        page: feedback.page || existing.page,
        type: feedback.type || existing.type,
        implementationContext: existing.implementationContext,
      }),
      verificationPack: buildVerificationPack({
        page: feedback.page || existing.page,
        verificationPack: existing.verificationPack,
      }),
      completedVerificationIds: existing.completedVerificationIds || [],
      occurrenceCount,
      triageStatus,
      status: getLegacyStatusFromTriage(triageStatus),
      latestReportId: feedbackId,
      reportIds: nextReportIds,
      latestReporter: feedback.username || feedback.email || feedback.userId,
      latestEmail: feedback.email,
      latestReporterRole: feedback.reporterRole || existing.latestReporterRole,
      lastReportedAt: now,
      updatedAt: now,
    };

    await workItemCollection.updateOne(
      { _id: existing._id },
      {
        $set: update,
      }
    );

    return {
      workItem: {
        ...existing,
        ...update,
        _id: existing._id,
      } as FeedbackWorkItemDoc,
      isDuplicate: true,
      shouldSendNotification: false,
      workItemId,
    };
  }

  const triageStatus = "new";
  const workItem: FeedbackWorkItemDoc = {
    type: feedback.type,
    title: feedback.title,
    latestDescription: feedback.description,
    page: feedback.page,
    severity: feedback.severity,
    deviceType: feedback.deviceType,
    structuredRepro: feedback.structuredRepro,
    implementationContext: buildImplementationContext({
      page: feedback.page,
      type: feedback.type,
      implementationContext: undefined,
    }),
    verificationPack: buildVerificationPack({
      page: feedback.page,
      verificationPack: undefined,
    }),
    completedVerificationIds: [],
    fingerprint,
    occurrenceCount: 1,
    status: getLegacyStatusFromTriage(triageStatus),
    triageStatus,
    notificationStatus: "pending",
    firstReportId: feedbackId,
    latestReportId: feedbackId,
    reportIds: [feedbackId],
    latestReporter: feedback.username || feedback.email || feedback.userId,
    latestEmail: feedback.email,
    latestReporterRole: feedback.reporterRole,
    latestRuntimeContext: feedback.runtimeContext,
    firstReportedAt: now,
    lastReportedAt: now,
    createdAt: now,
    updatedAt: now,
  };

  const result = await workItemCollection.insertOne(workItem);
  const workItemId = result.insertedId.toString();

  return {
    workItem: {
      ...workItem,
      _id: result.insertedId,
    } as FeedbackWorkItemDoc,
    isDuplicate: false,
    shouldSendNotification: true,
    workItemId,
  };
};

export const buildWorkItemUpdate = ({
  existing,
  triageStatus,
  severity,
  fixThreadId,
  fixCommitSha,
  title,
  latestDescription,
  structuredRepro,
  implementationContext,
  verificationPack,
  completedVerificationIds,
  now,
}: {
  existing: FeedbackWorkItemDoc;
  triageStatus: FeedbackWorkItemDoc["triageStatus"];
  severity?: "low" | "medium" | "high";
  fixThreadId?: string;
  fixCommitSha?: string;
  title?: string;
  latestDescription?: string;
  structuredRepro?: FeedbackWorkItemDoc["structuredRepro"];
  implementationContext?: FeedbackWorkItemDoc["implementationContext"];
  verificationPack?: FeedbackWorkItemDoc["verificationPack"];
  completedVerificationIds?: string[];
  now: Date;
}) => {
  const normalizedSeverity = sanitizeFeedbackSeverity(severity) || existing.severity;
  const normalizedFixThreadId = sanitizeText(fixThreadId) || undefined;
  const normalizedFixCommitSha = sanitizeText(fixCommitSha) || undefined;
  const normalizedTitle = sanitizeText(title) || existing.title;
  const normalizedDescription =
    sanitizeText(latestDescription) || existing.latestDescription;
  const normalizedStructuredRepro =
    sanitizeStructuredRepro(structuredRepro) || existing.structuredRepro;
  const normalizedImplementationContext = implementationContext
    ? buildImplementationContext({
        page: existing.page,
        type: existing.type,
        implementationContext,
      })
    : existing.implementationContext;
  const normalizedVerificationPack = verificationPack
    ? buildVerificationPack({
        page: existing.page,
        verificationPack,
      })
    : existing.verificationPack;
  const normalizedCompletedVerificationIds = Array.isArray(completedVerificationIds)
    ? completedVerificationIds.map((entry) => sanitizeText(entry)).filter(Boolean)
    : existing.completedVerificationIds;

  if (
    existing.type === "bug" &&
    (triageStatus === "queued" || triageStatus === "fixing") &&
    !hasMinimumStructuredRepro(normalizedStructuredRepro)
  ) {
    throw new Error(
      "Actual behavior, expected behavior, affected flow, and repro steps must be filled in or explicitly marked Unknown before a bug can be readied for fixing."
    );
  }

  const nextResolvedAt =
    triageStatus === "resolved" || triageStatus === "verified"
      ? existing.resolvedAt || now
      : undefined;

  return {
    title: normalizedTitle,
    latestDescription: normalizedDescription,
    severity: normalizedSeverity,
    triageStatus,
    status: getLegacyStatusFromTriage(triageStatus),
    structuredRepro: normalizedStructuredRepro,
    implementationContext: normalizedImplementationContext,
    verificationPack: normalizedVerificationPack,
    completedVerificationIds: normalizedCompletedVerificationIds,
    fixThreadId: normalizedFixThreadId,
    fixCommitSha: normalizedFixCommitSha,
    resolvedAt: nextResolvedAt,
    updatedAt: now,
  } satisfies Partial<FeedbackWorkItemDoc>;
};

export const buildWorkItemSnapshotFromReports = (
  remaining: FeedbackItemDoc[]
): Partial<FeedbackWorkItemDoc> | null => {
  if (remaining.length === 0) {
    return null;
  }

  const latest = remaining[0];
  const oldest = remaining[remaining.length - 1];
  const reportIds = remaining
    .map((item) => String(item._id))
    .slice(0, MAX_STORED_REPORT_IDS);
  const severity = remaining.reduce<"low" | "medium" | "high" | undefined>(
    (accumulator, item) => selectHigherSeverity(accumulator, item.severity),
    undefined
  );

  return {
    title: latest.title,
    latestDescription: latest.description,
    page: latest.page,
    severity,
    deviceType: latest.deviceType,
    latestRuntimeContext: latest.runtimeContext,
    structuredRepro: latest.structuredRepro,
    occurrenceCount: remaining.length,
    latestReportId: String(latest._id),
    firstReportId: String(oldest._id),
    reportIds,
    latestReporter: latest.username || latest.email || latest.userId,
    latestEmail: latest.email,
    latestReporterRole: latest.reporterRole,
    firstReportedAt: oldest.createdAt,
    lastReportedAt: latest.createdAt,
    updatedAt: new Date(),
  };
};

export const refreshWorkItemAfterDelete = async ({
  feedbackCollection,
  workItemCollection,
  workItemId,
}: {
  feedbackCollection: Collection<FeedbackItemDoc>;
  workItemCollection: Collection<FeedbackWorkItemDoc>;
  workItemId: string;
}) => {
  if (!ObjectId.isValid(workItemId)) {
    return;
  }

  const remaining = (await feedbackCollection
    .find({ workItemId })
    .sort({ createdAt: -1 })
    .toArray()) as FeedbackItemDoc[];
  const existingWorkItem = await workItemCollection.findOne({
    _id: new ObjectId(workItemId),
  });
  const snapshot = buildWorkItemSnapshotFromReports(remaining);

  if (!snapshot) {
    await workItemCollection.deleteOne({
      _id: new ObjectId(workItemId),
    });
    return;
  }

  await workItemCollection.updateOne(
    { _id: new ObjectId(workItemId) },
    {
      $set: {
        ...snapshot,
        implementationContext: buildImplementationContext({
          page: snapshot.page as string | undefined,
          type: (existingWorkItem?.type || remaining[0]?.type) as "bug" | "feature",
          implementationContext: existingWorkItem?.implementationContext,
        }),
        verificationPack: buildVerificationPack({
          page: snapshot.page as string | undefined,
          verificationPack: existingWorkItem?.verificationPack,
        }),
        completedVerificationIds: existingWorkItem?.completedVerificationIds || [],
      },
    }
  );
};
