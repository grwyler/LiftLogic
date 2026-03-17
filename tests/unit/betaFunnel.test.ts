import { describe, expect, it } from "vitest";
import {
  applyWorkoutMilestones,
  getDistinctWorkoutDates,
  markBetaFunnelMilestone,
  mergeBetaFunnels,
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
            pricingPageViewSources: { pricing_page_authenticated: 1 },
            checkoutStartSources: { pricing_checkout_month: 1 },
          },
          paid: true,
        },
        {
          betaFunnel: {
            pricingPageViewedAt: "2026-03-11T00:00:00.000Z",
            upgradePromptViewedAt: "2026-03-11T00:01:00.000Z",
            upgradePromptClickedAt: "2026-03-11T00:01:30.000Z",
            manualProGrantAppliedAt: "2026-03-11T00:02:00.000Z",
            cancelRequestedAt: "2026-03-14T00:00:00.000Z",
            pricingPageViewSources: { pricing_page_authenticated: 1 },
            upgradePromptViewSources: { recurring_schedule: 1 },
            upgradePromptClickSources: { recurring_schedule: 1 },
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
      anonymousFunnels: [
        {
          betaFunnel: {
            landingPageViewedAt: "2026-03-09T00:00:00.000Z",
            pricingPageViewedAt: "2026-03-09T00:02:00.000Z",
            landingPageViewSources: { landing_page: 1 },
            landingCtaSources: { hero_primary_create_account: 1 },
            pricingPageViewSources: { pricing_page_anonymous: 1 },
          },
        },
      ],
      hasPaidAccess: (user) => Boolean((user as any).paid),
    });

    expect(summary).toEqual({
      pricingPageViews: 2,
      upgradePromptViews: 1,
      upgradePromptClicks: 1,
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
      anonymousStage: {
        landingPageViews: 1,
        pricingPageViews: 1,
        upgradePromptViews: 0,
        upgradePromptClicks: 0,
        checkoutStarts: 0,
      },
      authenticatedStage: {
        pricingPageViews: 2,
        upgradePromptViews: 1,
        upgradePromptClicks: 1,
        checkoutStarts: 1,
      },
      sourceBreakdown: {
        landingPageViews: { landing_page: 1 },
        landingCtas: { hero_primary_create_account: 1 },
        pricingPageViews: {
          pricing_page_anonymous: 1,
          pricing_page_authenticated: 2,
        },
        pricingCtas: {},
        upgradePromptViews: { recurring_schedule: 1 },
        upgradePromptClicks: { recurring_schedule: 1 },
        checkoutStarts: { pricing_checkout_month: 1 },
      },
    });
  });

  it("merges anonymous funnel context into an authenticated funnel", () => {
    const merged = mergeBetaFunnels({
      base: {
        signupCompletedAt: "2026-03-12T00:00:00.000Z",
      },
      incoming: {
        anonymousFunnelId: "anon_123",
        landingPageViewedAt: "2026-03-10T00:00:00.000Z",
        pricingPageViewedAt: "2026-03-10T00:05:00.000Z",
        landingPageViewSources: { landing_page: 1 },
        pricingPageViewSources: { pricing_page_anonymous: 1 },
      },
      mergedAt: "2026-03-12T00:05:00.000Z",
    });

    expect(merged.anonymousFunnelId).toBe("anon_123");
    expect(new Date(String(merged.landingPageViewedAt)).toISOString()).toBe(
      "2026-03-10T00:00:00.000Z"
    );
    expect(new Date(String(merged.anonymousMergedAt)).toISOString()).toBe(
      "2026-03-12T00:05:00.000Z"
    );
    expect(merged.pricingPageViewSources).toEqual({
      pricing_page_anonymous: 1,
    });
  });
});
