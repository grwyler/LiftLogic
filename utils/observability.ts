import {
  ObservabilityAlertDoc,
  ObservabilityEventDoc,
  ObservabilityEventKind,
} from "./types";

export const SLOW_ROUTE_TRANSITION_MS = 2500;
export const ALERT_LOOKBACK_WINDOW_MS = 60 * 60 * 1000;

export const OBSERVABILITY_ALERT_THRESHOLDS: Record<ObservabilityEventKind, number> = {
  client_error: 3,
  route_performance: 5,
  workout_save_failure: 3,
  checkout_failure: 2,
  checkout_success: Number.MAX_SAFE_INTEGER,
};

const sanitizeText = (value: unknown, max = 240) =>
  typeof value === "string" ? value.trim().slice(0, max) : "";

const sanitizeNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

export const buildObservabilityFingerprint = (
  event: Pick<ObservabilityEventDoc, "kind" | "route" | "source" | "message">
) =>
  [
    sanitizeText(event.kind, 64),
    sanitizeText(event.route, 120) || "unknown-route",
    sanitizeText(event.source, 120) || "unknown-source",
    sanitizeText(event.message, 120) || "no-message",
  ].join("::");

export const sanitizeObservabilityEvent = (
  value: Partial<ObservabilityEventDoc>
): ObservabilityEventDoc => {
  const sanitized: ObservabilityEventDoc = {
    kind: (sanitizeText(value.kind, 64) || "client_error") as ObservabilityEventKind,
    status: (sanitizeText(value.status, 32) || "info") as ObservabilityEventDoc["status"],
    route: sanitizeText(value.route, 160) || undefined,
    source: sanitizeText(value.source, 160) || undefined,
    message: sanitizeText(value.message, 320) || undefined,
    environment: sanitizeText(value.environment, 64) || undefined,
    releaseVersion: sanitizeText(value.releaseVersion, 32) || undefined,
    commitSha: sanitizeText(value.commitSha, 64) || undefined,
    userId: sanitizeText(value.userId, 64) || undefined,
    durationMs: sanitizeNumber(value.durationMs),
    metadata:
      value.metadata && typeof value.metadata === "object"
        ? value.metadata
        : undefined,
    createdAt: value.createdAt instanceof Date ? value.createdAt : new Date(),
  };

  sanitized.fingerprint =
    sanitizeText(value.fingerprint, 240) || buildObservabilityFingerprint(sanitized);

  return sanitized;
};

export const shouldCreateObservabilityAlert = (
  kind: ObservabilityEventKind,
  count: number
) => count >= OBSERVABILITY_ALERT_THRESHOLDS[kind];

export const summarizeObservabilityAlerts = (
  events: ObservabilityEventDoc[],
  alerts: ObservabilityAlertDoc[]
) => {
  const summary = {
    totalEvents: events.length,
    failureCount: events.filter((event) => event.status === "failure").length,
    slowRouteCount: events.filter((event) => event.kind === "route_performance").length,
    workoutSaveFailureCount: events.filter(
      (event) => event.kind === "workout_save_failure"
    ).length,
    checkoutFailureCount: events.filter(
      (event) => event.kind === "checkout_failure"
    ).length,
    openAlerts: alerts.filter((alert) => alert.status === "open").length,
    routeBreakdown: {} as Record<string, number>,
  };

  events.forEach((event) => {
    const routeKey = sanitizeText(event.route, 160) || "unknown";
    summary.routeBreakdown[routeKey] = (summary.routeBreakdown[routeKey] || 0) + 1;
  });

  return summary;
};
