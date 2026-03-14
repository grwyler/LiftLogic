import {
  FeedbackItemDoc,
  FeedbackLegacyStatus,
  FeedbackNotificationStatus,
  FeedbackTriageStatus,
} from "./types";

export const FEEDBACK_TRIAGE_STATUSES: FeedbackTriageStatus[] = [
  "new",
  "duplicate",
  "queued",
  "fixing",
  "resolved",
  "verified",
];

export const FEEDBACK_NOTIFICATION_STATUSES: FeedbackNotificationStatus[] = [
  "pending",
  "sent",
  "skipped",
  "failed",
];

const dynamicDescriptionPattern =
  /^(started|completed|created|viewport|user agent|online|reporter|status|severity|page|current page):/i;

const normalizeText = (value: unknown, max = 220) =>
  String(value ?? "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);

const hashString = (value: string) => {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash +=
      (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }

  return (hash >>> 0).toString(16).padStart(8, "0");
};

const getStableDescriptionSignature = (description: string) =>
  description
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !dynamicDescriptionPattern.test(line))
    .slice(0, 4)
    .join(" ");

const getPrimarySignal = (feedback: Partial<FeedbackItemDoc>) => {
  const firstError = feedback.bugReport?.errors?.[0]?.message;
  const firstInteraction = feedback.bugReport?.interactions?.find(
    (interaction) => interaction.label || interaction.detail
  );
  const coachSignal = feedback.coachFeedback?.selectedResponse;

  return (
    firstError ||
    firstInteraction?.label ||
    firstInteraction?.detail ||
    coachSignal ||
    getStableDescriptionSignature(String(feedback.description ?? ""))
  );
};

export const createFeedbackFingerprint = (
  feedback: Partial<FeedbackItemDoc>
) => {
  const signature = [
    normalizeText(feedback.type),
    normalizeText(feedback.page),
    normalizeText(feedback.title),
    normalizeText(getPrimarySignal(feedback)),
    normalizeText(getStableDescriptionSignature(String(feedback.description ?? ""))),
  ].join("::");

  return `wrk_${hashString(signature || "empty-feedback")}`;
};

export const getLegacyStatusFromTriage = (
  triageStatus: FeedbackTriageStatus
): FeedbackLegacyStatus => {
  switch (triageStatus) {
    case "queued":
      return "planned";
    case "fixing":
      return "reviewing";
    case "resolved":
      return "resolved";
    case "verified":
    case "duplicate":
      return "closed";
    case "new":
    default:
      return "new";
  }
};

export const isHighSignalFeedback = (
  feedback: Partial<FeedbackItemDoc>,
  occurrenceCount = 1
) =>
  feedback.type === "bug" &&
  (feedback.severity === "high" ||
    feedback.bugReport?.mode === "recorded" ||
    Boolean(feedback.bugReport?.errors?.length) ||
    feedback.coachFeedback?.sentiment === "dislike" ||
    occurrenceCount >= 2);

export const shouldAutoQueueFixJob = ({
  feedback,
  occurrenceCount,
  triageStatus,
  hasFixThreadId,
}: {
  feedback: Partial<FeedbackItemDoc>;
  occurrenceCount: number;
  triageStatus?: FeedbackTriageStatus;
  hasFixThreadId?: boolean;
}) =>
  !hasFixThreadId &&
  (triageStatus === undefined ||
    triageStatus === "new" ||
    triageStatus === "duplicate") &&
  isHighSignalFeedback(feedback, occurrenceCount);

export const getWorkItemAnchorId = (workItemId: string) =>
  `work-item-${workItemId}`;

export const buildWorkItemUrl = ({
  appUrl,
  workItemId,
}: {
  appUrl: string;
  workItemId: string;
}) =>
  `${appUrl.replace(/\/$/, "")}/bugs#${getWorkItemAnchorId(workItemId)}`;

export const formatFingerprintLabel = (fingerprint?: string) =>
  fingerprint ? fingerprint.slice(0, 18) : "unknown";
