import { describe, expect, it } from "vitest";
import { ingestSignal } from "../../domain/orchestration/service";
import { InMemoryOrchestrationStore, toIdString } from "./orchestrationTestStore";

const baseRequest = {
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

describe("ingestSignal", () => {
  it("creates a new work item for a new signal", async () => {
    const store = new InMemoryOrchestrationStore();

    const result = await ingestSignal({
      store,
      request: baseRequest,
      now: new Date("2026-03-15T12:00:00.000Z"),
    });

    expect(result.duplicate).toBe(false);
    expect(store.projects).toHaveLength(1);
    expect(store.signals).toHaveLength(1);
    expect(store.workItems).toHaveLength(1);
    expect(result.workItem.occurrenceCount).toBe(1);
    expect(result.signal.fingerprint).toBe(result.workItem.fingerprint);
  });

  it("groups duplicate signals into an existing work item and increments occurrence count", async () => {
    const store = new InMemoryOrchestrationStore();

    await ingestSignal({
      store,
      request: baseRequest,
      now: new Date("2026-03-15T12:00:00.000Z"),
    });

    const result = await ingestSignal({
      store,
      request: {
        ...baseRequest,
        signal: {
          ...baseRequest.signal,
          source: "zendesk",
          severity: "medium",
          description: "Support reported the same totals issue from a customer ticket.",
          evidence: {
            ticketId: "ZD-4821",
          },
        },
      },
      now: new Date("2026-03-15T13:00:00.000Z"),
    });

    expect(result.duplicate).toBe(true);
    expect(store.signals).toHaveLength(2);
    expect(store.workItems).toHaveLength(1);
    expect(store.workItems[0].occurrenceCount).toBe(2);
    expect(toIdString(store.signals[1].workItemId)).toBe(toIdString(store.workItems[0]._id));
    expect(store.workItems[0].severity).toBe("high");
  });

  it("preserves raw evidence on every stored signal", async () => {
    const store = new InMemoryOrchestrationStore();

    await ingestSignal({
      store,
      request: baseRequest,
      now: new Date("2026-03-15T12:00:00.000Z"),
    });

    await ingestSignal({
      store,
      request: {
        ...baseRequest,
        signal: {
          ...baseRequest.signal,
          description: "Same issue from another source.",
          evidence: {
            ticketId: "ZD-1001",
            customerQuote: "My totals disappeared after coupon apply.",
          },
        },
      },
      now: new Date("2026-03-15T13:00:00.000Z"),
    });

    expect(store.signals[0].evidence).toEqual({
      message: "Cannot read properties of undefined (reading 'amount')",
    });
    expect(store.signals[1].evidence).toEqual({
      ticketId: "ZD-1001",
      customerQuote: "My totals disappeared after coupon apply.",
    });
  });
});
