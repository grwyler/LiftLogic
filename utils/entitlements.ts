import {
  BillingPlan,
  BillingSubscriptionStatus,
  ProductPlan,
  UserDoc,
  UserEntitlements,
} from "./types";

export type EntitlementKey = keyof UserEntitlements;

const ACTIVE_BILLING_STATUSES = new Set<BillingSubscriptionStatus>([
  "trialing",
  "active",
  "past_due",
  "unpaid",
]);

export const FREE_ENTITLEMENTS: UserEntitlements = {
  assistantPlanGeneration: false,
  assistantPlanRegeneration: false,
  recurringWorkoutScheduling: false,
  progressionRecommendations: false,
};

export const PREMIUM_ENTITLEMENTS: UserEntitlements = {
  assistantPlanGeneration: true,
  assistantPlanRegeneration: true,
  recurringWorkoutScheduling: true,
  progressionRecommendations: true,
};

const cloneEntitlements = (entitlements: UserEntitlements): UserEntitlements => ({
  assistantPlanGeneration: entitlements.assistantPlanGeneration,
  assistantPlanRegeneration: entitlements.assistantPlanRegeneration,
  recurringWorkoutScheduling: entitlements.recurringWorkoutScheduling,
  progressionRecommendations: entitlements.progressionRecommendations,
});

const normalizeProductPlan = (value: unknown): ProductPlan | null => {
  return value === "premium" || value === "free" ? value : null;
};

const normalizeBillingPlan = (value: unknown): BillingPlan | null => {
  return value === "pro_beta" || value === "free" ? value : null;
};

const normalizeBillingStatus = (value: unknown): BillingSubscriptionStatus | null => {
  return ACTIVE_BILLING_STATUSES.has(value as BillingSubscriptionStatus) ||
    value === "inactive" ||
    value === "canceled" ||
    value === "incomplete" ||
    value === "incomplete_expired" ||
    value === "paused"
    ? (value as BillingSubscriptionStatus)
    : null;
};

export const getProductPlanFromUser = (user?: Partial<UserDoc> | null): ProductPlan => {
  const storedProductPlan = normalizeProductPlan(user?.productPlan);
  if (storedProductPlan) {
    return storedProductPlan;
  }

  const billingPlan = normalizeBillingPlan(user?.billingPlan);
  const subscriptionStatus = normalizeBillingStatus(user?.subscriptionStatus);
  if (
    billingPlan === "pro_beta" ||
    (subscriptionStatus && ACTIVE_BILLING_STATUSES.has(subscriptionStatus))
  ) {
    return "premium";
  }

  return "free";
};

export const getEntitlementsForPlan = (plan: ProductPlan): UserEntitlements =>
  cloneEntitlements(plan === "premium" ? PREMIUM_ENTITLEMENTS : FREE_ENTITLEMENTS);

export const resolveUserEntitlements = (user?: Partial<UserDoc> | null): UserEntitlements => {
  const expected = getEntitlementsForPlan(getProductPlanFromUser(user));
  const stored = user?.entitlements;

  if (!stored) {
    return expected;
  }

  return {
    assistantPlanGeneration:
      stored.assistantPlanGeneration ?? expected.assistantPlanGeneration,
    assistantPlanRegeneration:
      stored.assistantPlanRegeneration ?? expected.assistantPlanRegeneration,
    recurringWorkoutScheduling:
      stored.recurringWorkoutScheduling ?? expected.recurringWorkoutScheduling,
    progressionRecommendations:
      stored.progressionRecommendations ?? expected.progressionRecommendations,
  };
};

export const resolveUserAccess = (user?: Partial<UserDoc> | null) => {
  const productPlan = getProductPlanFromUser(user);
  const entitlements = resolveUserEntitlements(user);

  return {
    productPlan,
    entitlements,
    hasPremiumAccess: productPlan === "premium",
  };
};

export const withResolvedUserAccess = <T extends Partial<UserDoc> | null | undefined>(
  user: T
) => {
  if (!user) {
    return user;
  }

  const { productPlan, entitlements } = resolveUserAccess(user);
  return {
    ...user,
    productPlan,
    entitlements,
  };
};

export const hasEntitlement = (
  user: Partial<UserDoc> | null | undefined,
  key: EntitlementKey
) => resolveUserEntitlements(user)[key];

export const getEntitlementMessage = (key: EntitlementKey) => {
  switch (key) {
    case "assistantPlanGeneration":
      return "Pro Beta is required to generate assistant-built workout plans.";
    case "assistantPlanRegeneration":
      return "Pro Beta is required for assistant-led plan revisions.";
    case "recurringWorkoutScheduling":
      return "Pro Beta is required to schedule recurring workouts.";
    case "progressionRecommendations":
      return "Pro Beta is required for progression recommendations.";
    default:
      return "Pro Beta is required for this feature.";
  }
};
