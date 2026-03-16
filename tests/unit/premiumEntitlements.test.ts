import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import {
  FREE_ENTITLEMENTS,
  PREMIUM_ENTITLEMENTS,
  resolveUserAccess,
} from "../../utils/entitlements";

describe("premium entitlements", () => {
  it("resolves free access for default accounts", () => {
    expect(resolveUserAccess(null)).toEqual({
      productPlan: "free",
      entitlements: FREE_ENTITLEMENTS,
      hasPremiumAccess: false,
    });

    expect(
      resolveUserAccess({
        billingPlan: "free",
        subscriptionStatus: "inactive",
      })
    ).toEqual({
      productPlan: "free",
      entitlements: FREE_ENTITLEMENTS,
      hasPremiumAccess: false,
    });
  });

  it("resolves premium access from active pro billing", () => {
    expect(
      resolveUserAccess({
        billingPlan: "pro_beta",
        subscriptionStatus: "active",
      })
    ).toEqual({
      productPlan: "premium",
      entitlements: PREMIUM_ENTITLEMENTS,
      hasPremiumAccess: true,
    });
  });

  it("keeps premium gates enforced across the routines flow and API routes", () => {
    const generateWorkoutApi = fs.readFileSync(
      path.join(process.cwd(), "pages", "api", "generateWorkout.ts"),
      "utf8"
    );
    const recurringRuleApi = fs.readFileSync(
      path.join(process.cwd(), "pages", "api", "recurringRule.ts"),
      "utf8"
    );
    const exerciseProgressApi = fs.readFileSync(
      path.join(process.cwd(), "pages", "api", "exerciseProgress.ts"),
      "utf8"
    );
    const coachChatApi = fs.readFileSync(
      path.join(process.cwd(), "pages", "api", "workoutCoachChat.ts"),
      "utf8"
    );
    const routinesPage = fs.readFileSync(
      path.join(process.cwd(), "pages", "routines.tsx"),
      "utf8"
    );

    expect(generateWorkoutApi).toContain("assistantPlanGeneration");
    expect(generateWorkoutApi).toContain("status(403)");

    expect(recurringRuleApi).toContain("recurringWorkoutScheduling");
    expect(recurringRuleApi).toContain("status(403)");

    expect(exerciseProgressApi).toContain("progressionRecommendations");
    expect(exerciseProgressApi).toContain("recommendation = hasEntitlement");

    expect(coachChatApi).toContain("assistantPlanRegeneration");
    expect(coachChatApi).toContain("create_recurring_exercise");
    expect(coachChatApi).toContain("buildUpsellReply");

    expect(routinesPage).toContain("Upgrade for planning");
    expect(routinesPage).toContain("Pro Beta is required to generate assistant-built workout plans.");
  });
});
