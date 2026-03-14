import { FeedbackItemDoc, FeedbackWorkItemDoc } from "./types";

const toTimestamp = (value?: Date | string) => {
  if (!value) {
    return 0;
  }

  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
};

export const sortFeedbackEvidence = (items: FeedbackItemDoc[]) =>
  [...items].sort((left, right) => {
    const createdDelta = toTimestamp(right.createdAt) - toTimestamp(left.createdAt);
    if (createdDelta !== 0) {
      return createdDelta;
    }

    return toTimestamp(right.updatedAt) - toTimestamp(left.updatedAt);
  });

export const getFeedbackEvidenceForWorkItem = ({
  workItem,
  feedbackItems,
}: {
  workItem?: FeedbackWorkItemDoc | null;
  feedbackItems: FeedbackItemDoc[];
}) => {
  if (!workItem?._id) {
    return [];
  }

  const workItemId = String(workItem._id);

  return sortFeedbackEvidence(
    feedbackItems.filter((item) => String(item.workItemId || "") === workItemId)
  );
};

export const summarizeBugReportEvidence = (feedback: FeedbackItemDoc) => {
  const interactions = feedback.bugReport?.interactions || [];
  const errors = feedback.bugReport?.errors || [];

  return {
    errorCount: errors.length,
    interactionCount: interactions.length,
    semanticSteps: interactions.filter((item) => item.kind === "semantic"),
    rawSteps: interactions.filter((item) => item.kind !== "semantic"),
    latestError: errors[0],
  };
};
