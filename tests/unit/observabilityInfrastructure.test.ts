import { describe, expect, it } from "vitest";
import {
  OBSERVABILITY_ALERT_THRESHOLDS,
  buildObservabilityFingerprint,
  sanitizeObservabilityEvent,
  shouldCreateObservabilityAlert,
  summarizeObservabilityAlerts,
} from "../../utils/observability";

describe("observability infrastructure", () => {
  it("builds stable fingerprints from kind, route, source, and message", () => {
    expect(
      buildObservabilityFingerprint({
        kind: "checkout_failure",
        route: "/pricing",
        source: "pricing_checkout_month",
        message: "Stripe session creation failed",
      })
    ).toBe(
      "checkout_failure::/pricing::pricing_checkout_month::Stripe session creation failed"
    );
  });

  it("normalizes incoming events with defaults and trims unsafe fields", () => {
    const event = sanitizeObservabilityEvent({
      kind: "route_performance",
      status: "warning",
      route: "  /routines  ",
      source: "router.events.routeChangeComplete",
      message: "  Slow route transition detected  ",
      durationMs: 2750,
    });

    expect(event.route).toBe("/routines");
    expect(event.message).toBe("Slow route transition detected");
    expect(event.durationMs).toBe(2750);
    expect(event.fingerprint).toContain("route_performance::/routines");
  });

  it("only promotes alerts once the threshold is crossed", () => {
    expect(
      shouldCreateObservabilityAlert(
        "workout_save_failure",
        OBSERVABILITY_ALERT_THRESHOLDS.workout_save_failure - 1
      )
    ).toBe(false);
    expect(
      shouldCreateObservabilityAlert(
        "workout_save_failure",
        OBSERVABILITY_ALERT_THRESHOLDS.workout_save_failure
      )
    ).toBe(true);
  });

  it("summarizes recent failures and open alerts for a shared dashboard view", () => {
    const summary = summarizeObservabilityAlerts(
      [
        sanitizeObservabilityEvent({
          kind: "route_performance",
          status: "warning",
          route: "/routines",
          source: "router.events.routeChangeComplete",
          message: "Slow route transition detected for /routines",
        }),
        sanitizeObservabilityEvent({
          kind: "workout_save_failure",
          status: "failure",
          route: "/routines",
          source: "saveWorkoutEntry",
          message: "saveWorkoutEntry 500: Internal Server Error",
        }),
        sanitizeObservabilityEvent({
          kind: "checkout_failure",
          status: "failure",
          route: "/pricing",
          source: "pricing_checkout_month",
          message: "Unable to start checkout.",
        }),
      ],
      [
        {
          kind: "checkout_failure",
          fingerprint: "checkout_failure::/pricing::pricing_checkout_month::Unable to start checkout.",
          count: 2,
          status: "open",
          firstTriggeredAt: new Date("2026-03-17T10:00:00.000Z"),
          lastTriggeredAt: new Date("2026-03-17T10:15:00.000Z"),
          latestEventAt: new Date("2026-03-17T10:15:00.000Z"),
        },
      ]
    );

    expect(summary.totalEvents).toBe(3);
    expect(summary.slowRouteCount).toBe(1);
    expect(summary.workoutSaveFailureCount).toBe(1);
    expect(summary.checkoutFailureCount).toBe(1);
    expect(summary.openAlerts).toBe(1);
    expect(summary.routeBreakdown["/routines"]).toBe(2);
  });
});
