import { describe, expect, it, vi } from "vitest";
import { createPostgresOrchestrationPersistence } from "../../server/orchestration/postgresStore";

describe("postgres orchestration persistence", () => {
  it("creates a project and maps the returned row", async () => {
    const query = vi.fn().mockResolvedValue({
      rows: [
        {
          id: "project-1",
          name: "Acme Dashboard",
          slug: "acme-dashboard",
          created_at: "2026-03-15T12:00:00.000Z",
        },
      ],
      rowCount: 1,
    });
    const store = createPostgresOrchestrationPersistence({
      queryable: { query },
    });

    const project = await store.createProject({
      name: "Acme Dashboard",
      slug: "acme-dashboard",
      createdAt: new Date("2026-03-15T12:00:00.000Z"),
    });

    expect(query).toHaveBeenCalledTimes(1);
    expect(project._id).toBe("project-1");
    expect(project.slug).toBe("acme-dashboard");
    expect(project.createdAt.toISOString()).toBe("2026-03-15T12:00:00.000Z");
  });

  it("updates a work item and nulls undefined mutable fields cleanly", async () => {
    const query = vi.fn().mockResolvedValue({
      rows: [
        {
          id: "work-item-1",
          project_id: "project-1",
          fingerprint: "sig_123",
          type: "runtime-error",
          title: "Updated title",
          latest_description: null,
          triage_status: "reviewing",
          severity: null,
          occurrence_count: 2,
          latest_signal_id: null,
          duplicate_of_work_item_id: null,
          duplicate_reason: null,
          created_at: "2026-03-15T12:00:00.000Z",
          updated_at: "2026-03-15T13:00:00.000Z",
        },
      ],
      rowCount: 1,
    });
    const store = createPostgresOrchestrationPersistence({
      queryable: { query },
    });

    const updated = await store.updateWorkItem("work-item-1", {
      title: "Updated title",
      latestDescription: undefined,
      severity: undefined,
      triageStatus: "reviewing",
      updatedAt: new Date("2026-03-15T13:00:00.000Z"),
    });

    const sql = String(query.mock.calls[0][0]);
    const values = query.mock.calls[0][1] as unknown[];

    expect(sql).toContain("update work_items");
    expect(values[0]).toBe("work-item-1");
    expect(values).toContain(null);
    expect(updated.title).toBe("Updated title");
    expect(updated.latestDescription).toBeUndefined();
    expect(updated.severity).toBeUndefined();
  });

  it("creates review actions with actor and payload mapping", async () => {
    const query = vi.fn().mockResolvedValue({
      rows: [
        {
          id: "action-1",
          work_item_id: "work-item-1",
          action_type: "note_added",
          actor_type: "human",
          actor_name: "Reviewer",
          payload: { note: "Investigating" },
          created_at: "2026-03-15T13:00:00.000Z",
        },
      ],
      rowCount: 1,
    });
    const store = createPostgresOrchestrationPersistence({
      queryable: { query },
    });

    const actions = await store.createReviewActions([
      {
        workItemId: "work-item-1",
        actionType: "note_added",
        actor: {
          type: "human",
          name: "Reviewer",
        },
        payload: {
          note: "Investigating",
        },
        createdAt: new Date("2026-03-15T13:00:00.000Z"),
      },
    ]);

    const sql = String(query.mock.calls[0][0]);
    expect(sql).toContain("insert into review_actions");
    expect(actions[0]._id).toBe("action-1");
    expect(actions[0].actor.name).toBe("Reviewer");
    expect(actions[0].payload).toEqual({ note: "Investigating" });
  });
});
