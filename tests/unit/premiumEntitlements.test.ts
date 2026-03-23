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

  it("treats an active manual founding-beta grant as premium access", () => {
    const activeGrant = {
      manualProBetaAccess: {
        grantedAt: new Date("2026-03-16T00:00:00.000Z"),
        paymentCollectionNote: "Manual invoice",
      },
    };
    const expiredGrant = {
      manualProBetaAccess: {
        grantedAt: new Date("2026-03-01T00:00:00.000Z"),
        expiresAt: new Date("2026-03-10T00:00:00.000Z"),
      },
    };

    expect(resolveUserAccess(activeGrant as any)).toEqual({
      productPlan: "premium",
      entitlements: PREMIUM_ENTITLEMENTS,
      hasPremiumAccess: true,
    });

    expect(resolveUserAccess(expiredGrant as any)).toEqual({
      productPlan: "free",
      entitlements: FREE_ENTITLEMENTS,
      hasPremiumAccess: false,
    });
  });

  it("keeps recurring scheduling enabled even when older stored entitlements say false", () => {
    expect(
      resolveUserAccess({
        billingPlan: "free",
        subscriptionStatus: "inactive",
        entitlements: {
          ...FREE_ENTITLEMENTS,
          recurringWorkoutScheduling: false,
        },
      })
    ).toEqual({
      productPlan: "free",
      entitlements: FREE_ENTITLEMENTS,
      hasPremiumAccess: false,
    });
  });

  it("keeps premium gates enforced only for the remaining paid features", () => {
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
    const foundingBetaApi = fs.readFileSync(
      path.join(process.cwd(), "pages", "api", "admin", "founding-beta.ts"),
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

    expect(recurringRuleApi).not.toContain('getEntitlementMessage("recurringWorkoutScheduling")');
    expect(recurringRuleApi).not.toContain('hasEntitlement(user, "recurringWorkoutScheduling")');

    expect(exerciseProgressApi).toContain("progressionRecommendations");
    expect(exerciseProgressApi).toContain("recommendation = hasEntitlement");

    expect(coachChatApi).toContain("assistantPlanRegeneration");
    expect(coachChatApi).toContain("create_recurring_exercise");
    expect(coachChatApi).toContain("buildUpsellReply");

    expect(foundingBetaApi).toContain('operation?: "grant" | "revoke" | "update"');
    expect(foundingBetaApi).toContain("manualProBetaAccess");
    expect(foundingBetaApi).toContain("paymentCollectionNote");

    expect(routinesPage).toContain("Upgrade for planning");
    expect(routinesPage).toContain('openUpgradePrompt("assistant_generation")');
    expect(routinesPage).toContain("Generate a workout plan with the assistant");
  });
});
