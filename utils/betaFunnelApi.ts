import { requestJson } from "./apiClient";
import { getOrCreateAnonymousFunnelId } from "./betaFunnelClient";
import { MonetizationSummaryResponse } from "./types";

export const trackBetaFunnelMilestone = async (
  milestone: string,
  options: {
    occurredAt?: string;
    source?: string;
    anonymousFunnelId?: string;
  } = {}
) => {
  const anonymousFunnelId =
    options.anonymousFunnelId ||
    (typeof window !== "undefined" ? getOrCreateAnonymousFunnelId() : "");

  return requestJson<{ success: true }>("/api/funnel", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      milestone,
      ...(options.occurredAt ? { occurredAt: options.occurredAt } : {}),
      ...(options.source ? { source: options.source } : {}),
      ...(anonymousFunnelId ? { anonymousFunnelId } : {}),
    }),
  });
};

export const mergeAnonymousBetaFunnel = async (anonymousFunnelId?: string) => {
  const resolvedAnonymousFunnelId =
    anonymousFunnelId ||
    (typeof window !== "undefined" ? getOrCreateAnonymousFunnelId() : "");

  if (!resolvedAnonymousFunnelId) {
    return { success: false as const };
  }

  return requestJson<{ success: true }>("/api/funnel", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      action: "mergeAnonymousFunnel",
      anonymousFunnelId: resolvedAnonymousFunnelId,
    }),
  });
};

export const fetchMonetizationSummary =
  async (): Promise<MonetizationSummaryResponse> =>
    requestJson<MonetizationSummaryResponse>("/api/funnel?summary=monetization");
