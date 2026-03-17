import { describe, expect, it } from "vitest";
import { mergeFeatureFlagConfigs, resolveFeatureFlags } from "../../utils/featureFlags";
import { FeatureFlagDoc } from "../../utils/types";

describe("feature flag framework", () => {
  it("merges stored configs onto the default flag catalog", () => {
    const flags = mergeFeatureFlagConfigs([
      {
        key: "pricing_premium_proof_experiment",
        enabled: true,
        surface: "pricing",
        description: "Pricing experiment",
        rolloutPercent: 60,
      },
    ] as FeatureFlagDoc[]);

    expect(flags.map((flag) => flag.key)).toContain("pricing_premium_proof_experiment");
    expect(flags.map((flag) => flag.key)).toContain("onboarding_guided_starter");
  });

  it("keeps users outside rollout in control", () => {
    const [resolved] = resolveFeatureFlags({
      configs: [
        {
          key: "pricing_premium_proof_experiment",
          enabled: true,
          surface: "pricing",
          description: "Pricing experiment",
          rolloutPercent: 0,
        },
      ],
      route: "/pricing",
      identity: "user-1",
      isAuthenticated: true,
      billingPlan: "free",
    }).filter((flag) => flag.key === "pricing_premium_proof_experiment");

    expect(resolved.enabled).toBe(false);
    expect(resolved.variant).toBe("control");
    expect(resolved.reason).toContain("outside rollout percentage");
  });

  it("resolves deterministic variants for eligible users", () => {
    const configs = [
      {
        key: "pricing_premium_proof_experiment",
        enabled: true,
        surface: "pricing",
        description: "Pricing experiment",
        rolloutPercent: 100,
        variantWeights: {
          control: 0,
          variant_a: 100,
        },
        targeting: {
          routes: ["/pricing"],
          billingPlan: "any",
        },
      },
    ] as FeatureFlagDoc[];

    const [resolved] = resolveFeatureFlags({
      configs,
      route: "/pricing",
      identity: "user-123",
      isAuthenticated: true,
      billingPlan: "free",
    }).filter((flag) => flag.key === "pricing_premium_proof_experiment");

    expect(resolved.enabled).toBe(true);
    expect(resolved.variant).toBe("variant_a");
  });

  it("rejects users whose route does not match targeting", () => {
    const [resolved] = resolveFeatureFlags({
      configs: [
        {
          key: "workout_focus_mode",
          enabled: true,
          surface: "workout",
          description: "Workout focus mode",
          rolloutPercent: 100,
          targeting: {
            routes: ["/routines"],
            authenticatedOnly: true,
          },
        },
      ],
      route: "/pricing",
      identity: "anon-1",
      isAuthenticated: false,
      billingPlan: "free",
    }).filter((flag) => flag.key === "workout_focus_mode");

    expect(resolved.enabled).toBe(false);
    expect(resolved.reason).toContain("targeting did not match");
  });
});
