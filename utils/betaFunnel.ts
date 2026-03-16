export interface BetaFunnelAnalytics {
  landingCtaAt?: Date | string;
  signupCompletedAt?: Date | string;
  setupCompletedAt?: Date | string;
  firstWorkoutLoggedAt?: Date | string;
  secondWorkoutLoggedAt?: Date | string;
  secondWorkoutWithin7DaysAt?: Date | string;
  retainedWeek2At?: Date | string;
  retainedWeek4At?: Date | string;
  pricingPageViewedAt?: Date | string;
  upgradePromptViewedAt?: Date | string;
  checkoutStartedAt?: Date | string;
  checkoutCompletedAt?: Date | string;
  manualProGrantAppliedAt?: Date | string;
  billingPortalOpenedAt?: Date | string;
  cancelRequestedAt?: Date | string;
  subscriptionCanceledAt?: Date | string;
}

export const betaFunnelMilestoneMap = {
  landing_cta: "landingCtaAt",
  signup_completed: "signupCompletedAt",
  setup_completed: "setupCompletedAt",
  first_workout_logged: "firstWorkoutLoggedAt",
  second_workout_logged: "secondWorkoutLoggedAt",
  second_workout_within_7_days: "secondWorkoutWithin7DaysAt",
  retained_week_2: "retainedWeek2At",
  retained_week_4: "retainedWeek4At",
  pricing_page_viewed: "pricingPageViewedAt",
  upgrade_prompt_viewed: "upgradePromptViewedAt",
  checkout_started: "checkoutStartedAt",
  checkout_completed: "checkoutCompletedAt",
  manual_pro_grant_applied: "manualProGrantAppliedAt",
  billing_portal_opened: "billingPortalOpenedAt",
  cancel_requested: "cancelRequestedAt",
  subscription_canceled: "subscriptionCanceledAt",
} as const;

export type BetaFunnelMilestoneName = keyof typeof betaFunnelMilestoneMap;

export type MonetizationSummary = {
  pricingPageViews: number;
  upgradePromptViews: number;
  checkoutStarts: number;
  checkoutCompletions: number;
  manualProGrants: number;
  billingPortalOpens: number;
  cancelRequests: number;
  subscriptionCancellations: number;
  activePaidUsers: number;
  pricingToCheckoutStartRate: number;
  pricingToPaidRate: number;
  checkoutCompletionRate: number;
  cancellationRate: number;
};

const DAY_IN_MS = 24 * 60 * 60 * 1000;

const toValidDate = (value: unknown): Date | null => {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : new Date(value);
  }

  const parsed = new Date(value as string);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const toDateKey = (value: Date) => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const setMilestoneIfMissing = (
  next: BetaFunnelAnalytics,
  key: keyof BetaFunnelAnalytics,
  occurredAt: Date | null
) => {
  if (!occurredAt || next[key]) {
    return;
  }

  next[key] = occurredAt;
};

export const normalizeBetaFunnel = (
  value: unknown
): BetaFunnelAnalytics => {
  if (!value || typeof value !== "object") {
    return {};
  }

  const candidate = value as Record<string, unknown>;
  const normalized: BetaFunnelAnalytics = {};

  (
    [
      "landingCtaAt",
      "signupCompletedAt",
      "setupCompletedAt",
      "firstWorkoutLoggedAt",
      "secondWorkoutLoggedAt",
      "secondWorkoutWithin7DaysAt",
      "retainedWeek2At",
      "retainedWeek4At",
      "pricingPageViewedAt",
      "upgradePromptViewedAt",
      "checkoutStartedAt",
      "checkoutCompletedAt",
      "manualProGrantAppliedAt",
      "billingPortalOpenedAt",
      "cancelRequestedAt",
      "subscriptionCanceledAt",
    ] as Array<keyof BetaFunnelAnalytics>
  ).forEach((key) => {
    const parsed = toValidDate(candidate[key]);
    if (parsed) {
      normalized[key] = parsed;
    }
  });

  return normalized;
};

export const markBetaFunnelMilestone = ({
  funnel,
  key,
  occurredAt,
}: {
  funnel: unknown;
  key: keyof BetaFunnelAnalytics;
  occurredAt?: Date | string | null;
}) => {
  const next = normalizeBetaFunnel(funnel);
  setMilestoneIfMissing(next, key, toValidDate(occurredAt ?? new Date()));
  return next;
};

export const resolveBetaFunnelMilestoneKey = (
  milestone: string
): keyof BetaFunnelAnalytics | null =>
  betaFunnelMilestoneMap[milestone as BetaFunnelMilestoneName] ?? null;

export const getDistinctWorkoutDates = (dates: Array<Date | string>) => {
  const unique = new Map<string, Date>();

  dates.forEach((value) => {
    const parsed = toValidDate(value);
    if (!parsed) {
      return;
    }

    const key = toDateKey(parsed);
    if (!unique.has(key)) {
      unique.set(key, parsed);
    }
  });

  return Array.from(unique.values()).sort(
    (left, right) => left.getTime() - right.getTime()
  );
};

export const applyWorkoutMilestones = ({
  funnel,
  signupCompletedAt,
  workoutDates,
}: {
  funnel: unknown;
  signupCompletedAt?: Date | string | null;
  workoutDates: Array<Date | string>;
}) => {
  const next = normalizeBetaFunnel(funnel);
  const distinctDates = getDistinctWorkoutDates(workoutDates);
  const firstWorkout = distinctDates[0] ?? null;
  const secondWorkout = distinctDates[1] ?? null;
  const signupDate = toValidDate(signupCompletedAt) ?? null;

  setMilestoneIfMissing(next, "firstWorkoutLoggedAt", firstWorkout);
  setMilestoneIfMissing(next, "secondWorkoutLoggedAt", secondWorkout);

  if (
    firstWorkout &&
    secondWorkout &&
    secondWorkout.getTime() - firstWorkout.getTime() <= 7 * DAY_IN_MS
  ) {
    setMilestoneIfMissing(
      next,
      "secondWorkoutWithin7DaysAt",
      secondWorkout
    );
  }

  if (signupDate) {
    const week2Hit =
      distinctDates.find((date) => {
        const delta = date.getTime() - signupDate.getTime();
        return delta >= 7 * DAY_IN_MS && delta < 14 * DAY_IN_MS;
      }) ?? null;
    const week4Hit =
      distinctDates.find((date) => {
        const delta = date.getTime() - signupDate.getTime();
        return delta >= 21 * DAY_IN_MS && delta < 28 * DAY_IN_MS;
      }) ?? null;

    setMilestoneIfMissing(next, "retainedWeek2At", week2Hit);
    setMilestoneIfMissing(next, "retainedWeek4At", week4Hit);
  }

  return next;
};

const countUsersWithMilestone = (
  funnels: BetaFunnelAnalytics[],
  key: keyof BetaFunnelAnalytics
) => funnels.filter((funnel) => Boolean(funnel[key])).length;

const toRate = (numerator: number, denominator: number) =>
  denominator > 0 ? Number((numerator / denominator).toFixed(3)) : 0;

export const summarizeMonetizationFunnel = ({
  users,
  hasPaidAccess,
}: {
  users: Array<{ betaFunnel?: unknown }>;
  hasPaidAccess: (user: { betaFunnel?: unknown }) => boolean;
}): MonetizationSummary => {
  const funnels = users.map((user) => normalizeBetaFunnel(user.betaFunnel));
  const pricingPageViews = countUsersWithMilestone(funnels, "pricingPageViewedAt");
  const upgradePromptViews = countUsersWithMilestone(funnels, "upgradePromptViewedAt");
  const checkoutStarts = countUsersWithMilestone(funnels, "checkoutStartedAt");
  const checkoutCompletions = countUsersWithMilestone(funnels, "checkoutCompletedAt");
  const manualProGrants = countUsersWithMilestone(funnels, "manualProGrantAppliedAt");
  const billingPortalOpens = countUsersWithMilestone(funnels, "billingPortalOpenedAt");
  const cancelRequests = countUsersWithMilestone(funnels, "cancelRequestedAt");
  const subscriptionCancellations = countUsersWithMilestone(
    funnels,
    "subscriptionCanceledAt"
  );
  const activePaidUsers = users.filter((user) => hasPaidAccess(user)).length;
  const paidActivations = checkoutCompletions + manualProGrants;

  return {
    pricingPageViews,
    upgradePromptViews,
    checkoutStarts,
    checkoutCompletions,
    manualProGrants,
    billingPortalOpens,
    cancelRequests,
    subscriptionCancellations,
    activePaidUsers,
    pricingToCheckoutStartRate: toRate(checkoutStarts, pricingPageViews),
    pricingToPaidRate: toRate(paidActivations, pricingPageViews),
    checkoutCompletionRate: toRate(checkoutCompletions, checkoutStarts),
    cancellationRate: toRate(subscriptionCancellations, paidActivations),
  };
};
