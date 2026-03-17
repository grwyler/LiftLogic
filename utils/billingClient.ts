import { requestJson } from "./apiClient";
import { BillingSummaryResponse } from "./types";

export const fetchBillingSummary = async (): Promise<BillingSummaryResponse> =>
  requestJson<BillingSummaryResponse>("/api/billing/summary");

export const createBillingCheckoutSession = async (
  interval: "month" | "year"
) =>
  requestJson<{ url: string }>("/api/billing/create-checkout-session", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ interval }),
  });

export const createBillingPortalSession = async () =>
  requestJson<{ url: string }>("/api/billing/create-portal-session", {
    method: "POST",
  });
