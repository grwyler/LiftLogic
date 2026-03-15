import { describe, expect, it } from "vitest";
import {
  buildCodexCopyText,
  getFeedbackEvidenceForWorkItem,
  sortFeedbackEvidence,
  summarizeBugReportEvidence,
} from "../../utils/feedbackDetails";
import { FeedbackItemDoc, FeedbackWorkItemDoc } from "../../utils/types";

describe("feedback details helpers", () => {
  it("returns only reports linked to the selected work item, newest first", () => {
    const workItem = {
      _id: "work-1",
      type: "bug",
      title: "Workout log failed",
      latestDescription: "Latest description",
      fingerprint: "wrk_1",
      occurrenceCount: 2,
      triageStatus: "new",
    } as unknown as FeedbackWorkItemDoc;

    const feedbackItems = [
      {
        _id: "fb-older",
        workItemId: "work-1",
        type: "bug",
        userId: "user-1",
        title: "Older report",
        description: "Older",
        createdAt: "2026-03-14T10:00:00.000Z",
      },
      {
        _id: "fb-other",
        workItemId: "work-2",
        type: "bug",
        userId: "user-1",
        title: "Other report",
        description: "Other",
        createdAt: "2026-03-14T12:00:00.000Z",
      },
      {
        _id: "fb-newer",
        workItemId: "work-1",
        type: "bug",
        userId: "user-1",
        title: "Newer report",
        description: "Newer",
        createdAt: "2026-03-14T11:00:00.000Z",
      },
    ] as unknown as FeedbackItemDoc[];

    expect(
      getFeedbackEvidenceForWorkItem({ workItem, feedbackItems }).map((item) =>
        String(item._id)
      )
    ).toEqual(["fb-newer", "fb-older"]);
  });

  it("sorts evidence by createdAt and then updatedAt", () => {
    const sorted = sortFeedbackEvidence([
      {
        _id: "fb-1",
        type: "bug",
        userId: "user-1",
        title: "A",
        description: "A",
        createdAt: "2026-03-14T11:00:00.000Z",
        updatedAt: "2026-03-14T11:01:00.000Z",
      },
      {
        _id: "fb-2",
        type: "bug",
        userId: "user-1",
        title: "B",
        description: "B",
        createdAt: "2026-03-14T11:00:00.000Z",
        updatedAt: "2026-03-14T11:03:00.000Z",
      },
    ] as unknown as FeedbackItemDoc[]);

    expect(sorted.map((item) => String(item._id))).toEqual(["fb-2", "fb-1"]);
  });

  it("summarizes recorded bug evidence into triage-friendly buckets", () => {
    const summary = summarizeBugReportEvidence({
      _id: "fb-1",
      type: "bug",
      userId: "user-1",
      title: "Workout log failed",
      description: "Recorded repro",
      bugReport: {
        mode: "recorded",
        interactions: [
          {
            timestamp: "2026-03-14T12:00:00.000Z",
            type: "lifecycle",
            page: "/routines",
            kind: "semantic",
            label: "Open logging flow",
          },
          {
            timestamp: "2026-03-14T12:00:05.000Z",
            type: "click",
            page: "/routines",
            kind: "raw",
            target: "button",
          },
        ],
        errors: [
          {
            timestamp: "2026-03-14T12:00:06.000Z",
            source: "window-error",
            page: "/routines",
            message: "saveWorkoutEntry 500",
          },
        ],
      },
    } as unknown as FeedbackItemDoc);

    expect(summary.errorCount).toBe(1);
    expect(summary.interactionCount).toBe(2);
    expect(summary.semanticSteps).toHaveLength(1);
    expect(summary.rawSteps).toHaveLength(1);
    expect(summary.latestError?.message).toBe("saveWorkoutEntry 500");
  });

  it("appends standardized Codex execution instructions to copied work item details", () => {
    const workItem = {
      _id: "work-1",
      type: "bug",
      title: "Workout log failed",
      latestDescription: "Logging a set throws an error.",
      fingerprint: "wrk_1",
      occurrenceCount: 2,
      triageStatus: "new",
    } as unknown as FeedbackWorkItemDoc;

    const copyText = buildCodexCopyText({
      workItem,
      evidence: [],
    });

    expect(copyText).toContain("Codex execution instructions");
    expect(copyText).toContain("Implement the requested change.");
    expect(copyText).toContain(
      "Add or update tests needed to cover the change and ensure relevant tests pass."
    );
    expect(copyText).toContain(
      "When the work is complete, move this work item to the appropriate status."
    );
    expect(copyText).toContain(
      "If you identify related bugs, edge cases, or follow-up work that should not be handled in this same change, create additional bug reports or feature requests for them."
    );
    expect(copyText).toContain(
      "Clearly distinguish what was completed from any follow-up items."
    );
  });
});
