import { ingestSignal } from "../../domain/orchestration/service";
import { IngestSignalRequest } from "../../domain/orchestration/types";
import { isOrchestrationSeedEnabled } from "./config";
import { countOrchestrationDocumentsFromStore } from "./service";
import { getOrchestrationPersistence } from "./store";

const sampleSignals: IngestSignalRequest[] = [
  {
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
      environment: "production",
      location: "checkout/totals-card",
      runtimeContext: {
        environment: "production",
        release: "2026.03.15",
        route: "/billing/checkout",
      },
      evidence: {
        errorName: "TypeError",
        message: "Cannot read properties of undefined (reading 'amount')",
        stack: "CheckoutTotals.render -> pricing.ts:88",
      },
      reporter: {
        type: "system",
        name: "Sentry",
      },
      createdAt: "2026-03-15T11:30:00.000Z",
    },
  },
  {
    project: {
      slug: "acme-dashboard",
      name: "Acme Dashboard",
    },
    signal: {
      source: "zendesk",
      type: "runtime-error",
      title: "Checkout totals fail to render",
      description: "Support heard the totals vanish when discount codes are used.",
      severity: "medium",
      environment: "production",
      location: "checkout/totals-card",
      runtimeContext: {
        environment: "production",
        ticketId: "ZD-4821",
      },
      evidence: {
        ticketId: "ZD-4821",
        customerQuote: "The total disappears after I add a coupon.",
      },
      reporter: {
        type: "support",
        name: "A. Patel",
      },
      createdAt: "2026-03-15T13:10:00.000Z",
    },
  },
  {
    project: {
      slug: "field-ops-mobile",
      name: "Field Ops Mobile",
    },
    signal: {
      source: "manual-triage",
      type: "ux-friction",
      title: "Photo upload progress is unclear",
      description: "Technicians retry uploads because the progress state feels stalled.",
      severity: "low",
      environment: "production",
      location: "inspection/photo-upload",
      runtimeContext: {
        environment: "production",
        platform: "ios",
      },
      evidence: {
        note: "Observed in ride-along sessions with two field technicians.",
      },
      reporter: {
        type: "research",
        name: "Ops Research",
      },
      createdAt: "2026-03-14T16:45:00.000Z",
    },
  },
];

export const ensureSeededOrchestrationData = async () => {
  if (process.env.NODE_ENV === "test" || !isOrchestrationSeedEnabled()) {
    return;
  }

  const store = await getOrchestrationPersistence();
  const counts = await countOrchestrationDocumentsFromStore({ store });
  if (counts.projects > 0 || counts.signals > 0 || counts.workItems > 0) {
    return;
  }

  for (const request of sampleSignals) {
    await ingestSignal({
      store,
      request,
      now: new Date("2026-03-15T18:00:00.000Z"),
    });
  }
};
