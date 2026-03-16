import { describe, expect, it } from "vitest";
import { serializeDetail, serializeQueueRecord } from "../../server/orchestration/serialization";
import { WorkItemDetailRecord, WorkItemQueueRecord } from "../../domain/orchestration/types";

describe("orchestration serialization", () => {
  it("omits optional undefined work item fields from queue records", () => {
    const record: WorkItemQueueRecord = {
      id: "work-item-1",
      projectId: "project-1",
      fingerprint: "wrk_123",
      type: "bug",
      title: "Broken queue item",
      triageStatus: "new",
      occurrenceCount: 1,
      projectName: "Acme Dashboard",
      projectSlug: "acme-dashboard",
      createdAt: new Date("2026-03-15T00:00:00.000Z"),
      updatedAt: new Date("2026-03-15T01:00:00.000Z"),
    };

    expect(serializeQueueRecord(record)).toEqual({
      id: "work-item-1",
      fingerprint: "wrk_123",
      type: "bug",
      title: "Broken queue item",
      triageStatus: "new",
      occurrenceCount: 1,
      projectName: "Acme Dashboard",
      projectSlug: "acme-dashboard",
      createdAt: "2026-03-15T00:00:00.000Z",
      updatedAt: "2026-03-15T01:00:00.000Z",
    });
  });

  it("omits undefined optional fields from detail signals", () => {
    const detail: WorkItemDetailRecord = {
      workItem: {
        id: "work-item-1",
        projectId: "project-1",
        fingerprint: "wrk_123",
        type: "bug",
        title: "Broken queue item",
        triageStatus: "new",
        occurrenceCount: 1,
        projectName: "Acme Dashboard",
        projectSlug: "acme-dashboard",
        createdAt: new Date("2026-03-15T00:00:00.000Z"),
        updatedAt: new Date("2026-03-15T01:00:00.000Z"),
      },
      project: {
        id: "project-1",
        name: "Acme Dashboard",
        slug: "acme-dashboard",
        createdAt: new Date("2026-03-14T00:00:00.000Z"),
      },
      signals: [
        {
          id: "signal-1",
          projectId: "project-1",
          source: "manual",
          type: "bug",
          title: "Broken queue item",
          fingerprint: "wrk_123",
          createdAt: new Date("2026-03-15T00:30:00.000Z"),
        },
      ],
      reviewActions: [],
      duplicateChildren: [],
    };

    expect(serializeDetail(detail).signals[0]).toEqual({
      id: "signal-1",
      projectId: "project-1",
      source: "manual",
      type: "bug",
      title: "Broken queue item",
      fingerprint: "wrk_123",
      createdAt: "2026-03-15T00:30:00.000Z",
    });
  });
});
