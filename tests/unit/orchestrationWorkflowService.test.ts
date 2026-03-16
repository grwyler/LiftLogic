import { describe, expect, it } from "vitest";
import { ingestSignal } from "../../domain/orchestration/service";
import {
  clearWorkItemDuplicateInStore,
  getWorkItemDetailFromStore,
  listWorkItemsFromStore,
  markWorkItemDuplicateInStore,
  updateWorkItemReviewInStore,
} from "../../server/orchestration/service";
import { InMemoryOrchestrationStore } from "./orchestrationTestStore";

const baseSignal = {
  project: {
    slug: "acme-dashboard",
    name: "Acme Dashboard",
  },
  signal: {
    source: "sentry",
    type: "runtime-error",
    title: "Checkout totals fail to render",
    description: "Users see a blank totals card after applying a coupon.",
    severity: "high",
    location: "checkout/totals-card",
    evidence: {
      message: "Cannot read properties of undefined (reading 'amount')",
    },
  },
};

describe("orchestration workflow service", () => {
  it("lists queue data through the store abstraction", async () => {
    const store = new InMemoryOrchestrationStore();

    await ingestSignal({
      store,
      request: baseSignal,
      now: new Date("2026-03-15T12:00:00.000Z"),
    });

    const queue = await listWorkItemsFromStore({
      store,
      query: {
        search: "checkout",
      },
    });

    expect(queue.workItems).toHaveLength(1);
    expect(queue.filters.projects[0].slug).toBe("acme-dashboard");
  });

  it("records review actions and updates detail state through the store abstraction", async () => {
    const store = new InMemoryOrchestrationStore();
    const created = await ingestSignal({
      store,
      request: baseSignal,
      now: new Date("2026-03-15T12:00:00.000Z"),
    });

    await updateWorkItemReviewInStore({
      store,
      id: String(created.workItem._id),
      input: {
        actor: {
          type: "human",
          name: "Reviewer",
        },
        updates: {
          triageStatus: "reviewing",
          severity: "medium",
        },
        note: "Investigating.",
      },
    });

    const detail = await getWorkItemDetailFromStore({
      store,
      id: String(created.workItem._id),
    });

    expect(detail?.workItem.triageStatus).toBe("reviewing");
    expect(detail?.workItem.severity).toBe("medium");
    expect(detail?.reviewActions.map((action) => action.actionType)).toEqual(
      expect.arrayContaining(["status_changed", "severity_changed", "note_added"])
    );
  });

  it("manages duplicate state without deleting work items through the store abstraction", async () => {
    const store = new InMemoryOrchestrationStore();
    const canonical = await ingestSignal({
      store,
      request: baseSignal,
      now: new Date("2026-03-15T12:00:00.000Z"),
    });
    const duplicate = await ingestSignal({
      store,
      request: {
        project: {
          slug: "acme-dashboard",
          name: "Acme Dashboard",
        },
        signal: {
          source: "manual-triage",
          type: "ux-friction",
          title: "Coupon totals copy is confusing",
          description: "Users struggle to understand whether coupons applied.",
          severity: "low",
          location: "checkout/summary-copy",
          evidence: {
            note: "Observed in testing.",
          },
        },
      },
      now: new Date("2026-03-15T13:00:00.000Z"),
    });

    await markWorkItemDuplicateInStore({
      store,
      id: String(duplicate.workItem._id),
      targetWorkItemId: String(canonical.workItem._id),
      actor: {
        type: "human",
        name: "Reviewer",
      },
    });

    const activeQueue = await listWorkItemsFromStore({ store });
    expect(activeQueue.workItems).toHaveLength(1);

    await clearWorkItemDuplicateInStore({
      store,
      id: String(duplicate.workItem._id),
      actor: {
        type: "human",
        name: "Reviewer",
      },
    });

    const queueWithRestoredItem = await listWorkItemsFromStore({ store });
    expect(queueWithRestoredItem.workItems).toHaveLength(2);
  });
});
