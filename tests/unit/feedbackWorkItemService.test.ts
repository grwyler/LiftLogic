import { describe, expect, it } from "vitest";
import {
  buildWorkItemSnapshotFromReports,
  buildWorkItemUpdate,
} from "../../utils/feedbackWorkItemService";
import { FeedbackWorkItemDoc } from "../../utils/types";

describe("feedbackWorkItemService", () => {
  it("builds a direct work-item patch outside the route", () => {
    const existing: FeedbackWorkItemDoc = {
      type: "bug",
      title: "Old title",
      latestDescription: "Old description",
      fingerprint: "wrk_1",
      occurrenceCount: 2,
      triageStatus: "new",
    };

    const patch = buildWorkItemUpdate({
      existing,
      triageStatus: "resolved",
      severity: "high",
      fixThreadId: "thread-1",
      fixCommitSha: "abc123",
      title: "New title",
      latestDescription: "New description",
      now: new Date("2026-03-16T12:00:00Z"),
    });

    expect(patch).toMatchObject({
      title: "New title",
      latestDescription: "New description",
      severity: "high",
      triageStatus: "resolved",
      status: "resolved",
      fixThreadId: "thread-1",
      fixCommitSha: "abc123",
    });
    expect(patch.resolvedAt).toBeTruthy();
  });

  it("rebuilds work-item state from remaining reports after a delete", () => {
    const snapshot = buildWorkItemSnapshotFromReports([
      {
        _id: "latest-id" as any,
        userId: "u1",
        type: "bug",
        title: "Latest bug",
        description: "Latest description",
        severity: "medium",
        page: "/bugs",
        username: "latest-user",
        createdAt: new Date("2026-03-16T12:00:00Z"),
      },
      {
        _id: "oldest-id" as any,
        userId: "u1",
        type: "bug",
        title: "Old bug",
        description: "Old description",
        severity: "high",
        page: "/bugs",
        username: "old-user",
        createdAt: new Date("2026-03-15T12:00:00Z"),
      },
    ] as any);

    expect(snapshot).toMatchObject({
      title: "Latest bug",
      latestDescription: "Latest description",
      occurrenceCount: 2,
      latestReportId: "latest-id",
      firstReportId: "oldest-id",
      severity: "high",
      latestReporter: "latest-user",
    });
  });
});
