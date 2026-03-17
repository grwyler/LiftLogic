import { requestJson } from "./apiClient";
import { FeatureFlagDoc, FeatureFlagKey, FeatureFlagResolution, FeatureFlagVariant } from "./types";

export const fetchResolvedFeatureFlags = async (route: string) =>
  requestJson<{ flags: FeatureFlagResolution[] }>(
    `/api/feature-flags?route=${encodeURIComponent(route)}`
  );

export const fetchFeatureFlagConfigs = async () =>
  requestJson<{ flags: FeatureFlagDoc[] }>("/api/feature-flags?admin=1");

export const saveFeatureFlagConfig = async (flag: Partial<FeatureFlagDoc> & { key: FeatureFlagKey }) =>
  requestJson<{ flag: FeatureFlagDoc }>("/api/feature-flags", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      action: "upsertConfig",
      flag,
    }),
  });

export const logFeatureFlagExposure = async ({
  key,
  variant,
  route,
  source,
  anonymousId,
}: {
  key: FeatureFlagKey;
  variant: FeatureFlagVariant;
  route: string;
  source?: string;
  anonymousId?: string;
}) =>
  requestJson<{ success: true }>("/api/feature-flags", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      action: "logExposure",
      key,
      variant,
      route,
      source,
      anonymousId,
    }),
  });
