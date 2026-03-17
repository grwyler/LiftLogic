import { requestJson } from "./apiClient";

export const fetchFoundingBetaUsers = async (search = "") => {
  const query = new URLSearchParams();
  if (search.trim()) {
    query.set("search", search.trim());
  }

  return requestJson<{ users: any[] }>(
    `/api/admin/founding-beta${query.toString() ? `?${query.toString()}` : ""}`
  );
};

export const saveFoundingBetaAccess = async ({
  userId,
  operation,
  expiresAt,
  paymentCollectionNote,
}: {
  userId: string;
  operation: "grant" | "revoke" | "update";
  expiresAt?: string;
  paymentCollectionNote?: string;
}) =>
  requestJson<{ user: any }>("/api/admin/founding-beta", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      userId,
      operation,
      expiresAt: expiresAt || "",
      paymentCollectionNote,
    }),
  });
