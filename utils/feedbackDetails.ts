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

const formatTimestamp = (value?: Date | string) => {
  if (!value) {
    return "";
  }

  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) ? parsed.toISOString() : "";
};

const pushIfPresent = (lines: string[], label: string, value?: unknown) => {
  if (value === undefined || value === null || value === "") {
    return;
  }

  lines.push(`${label}: ${String(value)}`);
};

export const buildCodexCopyText = ({
  workItem,
  evidence,
}: {
  workItem: FeedbackWorkItemDoc;
  evidence: FeedbackItemDoc[];
}) => {
  const lines: string[] = [
    "Please investigate and fix this Lift Logic work item.",
    "",
    "Work item",
    `ID: ${String(workItem._id || "")}`,
    `Type: ${workItem.type}`,
    `Title: ${workItem.title}`,
    `Queue status: ${workItem.triageStatus}`,
    `Fingerprint: ${workItem.fingerprint}`,
    `Occurrence count: ${workItem.occurrenceCount}`,
  ];

  pushIfPresent(lines, "Severity", workItem.severity);
  pushIfPresent(lines, "Page", workItem.page);
  pushIfPresent(lines, "First reported", formatTimestamp(workItem.firstReportedAt));
  pushIfPresent(lines, "Last reported", formatTimestamp(workItem.lastReportedAt));

  lines.push("", "Current description", workItem.latestDescription || "No description provided.");

  if (workItem.latestRuntimeContext) {
    lines.push("", "Latest runtime context");
    pushIfPresent(lines, "Environment", workItem.latestRuntimeContext.environment);
    pushIfPresent(lines, "Route", workItem.latestRuntimeContext.route);
    pushIfPresent(lines, "App version", workItem.latestRuntimeContext.appVersion);
    pushIfPresent(lines, "Build commit", workItem.latestRuntimeContext.commitSha);
    pushIfPresent(
      lines,
      "Viewport",
      workItem.latestRuntimeContext.viewport
        ? `${workItem.latestRuntimeContext.viewport.width}x${workItem.latestRuntimeContext.viewport.height}`
        : ""
    );
    pushIfPresent(lines, "Online", typeof workItem.latestRuntimeContext.online === "boolean"
      ? workItem.latestRuntimeContext.online
        ? "yes"
        : "no"
      : "");
    pushIfPresent(lines, "User agent", workItem.latestRuntimeContext.userAgent);
  }

  if (evidence.length > 0) {
    lines.push("", "Linked evidence");

    evidence.forEach((entry, index) => {
      const bugSummary = summarizeBugReportEvidence(entry);
      lines.push("", `Evidence ${index + 1}`);
      pushIfPresent(lines, "Feedback ID", String(entry._id || ""));
      pushIfPresent(lines, "Title", entry.title);
      pushIfPresent(lines, "Type", entry.type);
      pushIfPresent(lines, "Queue status", entry.triageStatus);
      pushIfPresent(lines, "Severity", entry.severity);
      pushIfPresent(lines, "Page", entry.page);
      pushIfPresent(lines, "Created", formatTimestamp(entry.createdAt));
      pushIfPresent(lines, "Description", entry.description);

      if (entry.bugReport?.mode) {
        pushIfPresent(lines, "Recorded mode", entry.bugReport.mode);
        pushIfPresent(lines, "Recorded path", entry.bugReport.currentPath);
        pushIfPresent(lines, "Recorded errors", bugSummary.errorCount);
        pushIfPresent(lines, "Recorded interactions", bugSummary.interactionCount);

        if (bugSummary.semanticSteps.length > 0) {
          lines.push("Semantic reproduction steps:");
          bugSummary.semanticSteps.slice(0, 8).forEach((step, stepIndex) => {
            lines.push(
              `${stepIndex + 1}. ${step.label || step.detail || step.target || step.type}${
                step.actual ? ` | actual: ${step.actual}` : ""
              }${step.expected ? ` | expected: ${step.expected}` : ""}`
            );
          });
        }

        if (bugSummary.latestError?.message) {
          lines.push("Latest captured error:");
          lines.push(bugSummary.latestError.message);
          if (bugSummary.latestError.detail) {
            lines.push(bugSummary.latestError.detail);
          }
        }
      }

      if (entry.coachFeedback) {
        pushIfPresent(lines, "Coach feedback sentiment", entry.coachFeedback.sentiment);
        pushIfPresent(
          lines,
          "Selected response",
          entry.coachFeedback.selectedResponse
        );
        pushIfPresent(lines, "Explanation", entry.coachFeedback.explanation);
      }
    });
  }

  lines.push(
    "",
    "Codex execution instructions",
    "Implement the requested change.",
    "For testing and validation, prefer observing real production behavior over a local run unless this is specifically a code audit.",
    "Front-end audits and end-to-end workflow checks should be evaluated against production functionality whenever possible; use local execution mainly for code-level investigation, debugging, or implementation work.",
    "Add or update tests needed to cover the change and ensure relevant tests pass.",
    "Keep this work item's ticket status updated in the database while you are working on it and when the work is done.",
    "When the work is complete, move this work item to the appropriate status.",
    "If you identify related bugs, edge cases, or follow-up work that should not be handled in this same change, create additional bug reports or feature requests for them.",
    "Clearly distinguish what was completed from any follow-up items.",
    "",
    "Please inspect the relevant code, implement the fix, run appropriate verification, and summarize what changed."
  );

  return lines.join("\n");
};
