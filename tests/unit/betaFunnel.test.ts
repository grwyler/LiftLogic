import { describe, expect, it } from "vitest";
import {
  applyWorkoutMilestones,
  getDistinctWorkoutDates,
  markBetaFunnelMilestone,
  summarizeMonetizationFunnel,
} from "../../utils/betaFunnel";

describe("beta funnel analytics", () => {
  it("preserves the first timestamp when a milestone is marked twice", () => {
    const first = new Date("2026-03-01T12:00:00.000Z");
    const second = new Date("2026-03-02T12:00:00.000Z");

    const once = markBetaFunnelMilestone({
      funnel: {},
      key: "signupCompletedAt",
      occurredAt: first,
    });
    const twice = markBetaFunnelMilestone({
      funnel: once,
      key: "signupCompletedAt",
      occurredAt: second,
    });

    expect(new Date(String(twice.signupCompletedAt)).toISOString()).toBe(
      first.toISOString()
    );
  });

  it("deduplicates workout milestones by local calendar day", () => {
    const workoutDates = getDistinctWorkoutDates([
      "2026-03-02T10:00:00.000Z",
      "2026-03-02T18:00:00.000Z",
      "2026-03-05T10:00:00.000Z",
    ]);

    expect(workoutDates).toHaveLength(2);
    expect(workoutDates.map((date) => date.toISOString())).toEqual([
      "2026-03-02T10:00:00.000Z",
      "2026-03-05T10:00:00.000Z",
    ]);
  });

  it("captures first, second, seven-day, week-2, and week-4 milestones", () => {
    const funnel = applyWorkoutMilestones({
      funnel: {
        signupCompletedAt: "2026-03-01T09:00:00.000Z",
      },
      signupCompletedAt: "2026-03-01T09:00:00.000Z",
      workoutDates: [
        "2026-03-03T12:00:00.000Z",
        "2026-03-07T12:00:00.000Z",
        "2026-03-10T12:00:00.000Z",
        "2026-03-24T12:00:00.000Z",
      ],
    });

    expect(new Date(String(funnel.firstWorkoutLoggedAt)).toISOString()).toBe(
      "2026-03-03T12:00:00.000Z"
    );
    expect(new Date(String(funnel.secondWorkoutLoggedAt)).toISOString()).toBe(
      "2026-03-07T12:00:00.000Z"
    );
    expect(
      new Date(String(funnel.secondWorkoutWithin7DaysAt)).toISOString()
    ).toBe("2026-03-07T12:00:00.000Z");
    expect(new Date(String(funnel.retainedWeek2At)).toISOString()).toBe(
      "2026-03-10T12:00:00.000Z"
    );
    expect(new Date(String(funnel.retainedWeek4At)).toISOString()).toBe(
      "2026-03-24T12:00:00.000Z"
    );
  });

  it("summarizes monetization conversion counts and rates", () => {
    const summary = summarizeMonetizationFunnel({
      users: [
        {
          betaFunnel: {
            pricingPageViewedAt: "2026-03-10T00:00:00.000Z",
            checkoutStartedAt: "2026-03-10T00:05:00.000Z",
            checkoutCompletedAt: "2026-03-10T00:10:00.000Z",
          },
          paid: true,
        },
        {
          betaFunnel: {
            pricingPageViewedAt: "2026-03-11T00:00:00.000Z",
            upgradePromptViewedAt: "2026-03-11T00:01:00.000Z",
            manualProGrantAppliedAt: "2026-03-11T00:02:00.000Z",
            cancelRequestedAt: "2026-03-14T00:00:00.000Z",
          },
          paid: true,
        },
        {
          betaFunnel: {
            subscriptionCanceledAt: "2026-03-20T00:00:00.000Z",
          },
          paid: false,
        },
      ] as Array<{ betaFunnel?: unknown; paid: boolean }>,
      hasPaidAccess: (user) => Boolean((user as any).paid),
    });

    expect(summary).toEqual({
      pricingPageViews: 2,
      upgradePromptViews: 1,
      checkoutStarts: 1,
      checkoutCompletions: 1,
      manualProGrants: 1,
      billingPortalOpens: 0,
      cancelRequests: 1,
      subscriptionCancellations: 1,
      activePaidUsers: 2,
      pricingToCheckoutStartRate: 0.5,
      pricingToPaidRate: 1,
      checkoutCompletionRate: 1,
      cancellationRate: 0.5,
    });
  });
});
