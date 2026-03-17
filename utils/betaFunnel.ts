export interface BetaFunnelAnalytics {
  anonymousFunnelId?: string;
  anonymousMergedAt?: Date | string;
  landingPageViewedAt?: Date | string;
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
  upgradePromptClickedAt?: Date | string;
  pricingCtaClickedAt?: Date | string;
  checkoutStartedAt?: Date | string;
  checkoutCompletedAt?: Date | string;
  manualProGrantAppliedAt?: Date | string;
  billingPortalOpenedAt?: Date | string;
  cancelRequestedAt?: Date | string;
  subscriptionCanceledAt?: Date | string;
  landingPageViewSources?: Record<string, number>;
  landingCtaSources?: Record<string, number>;
  pricingPageViewSources?: Record<string, number>;
  pricingCtaSources?: Record<string, number>;
  upgradePromptViewSources?: Record<string, number>;
  upgradePromptClickSources?: Record<string, number>;
  checkoutStartSources?: Record<string, number>;
}

export const betaFunnelMilestoneMap = {
  landing_page_viewed: "landingPageViewedAt",
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
  upgrade_prompt_clicked: "upgradePromptClickedAt",
  pricing_cta_clicked: "pricingCtaClickedAt",
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
  upgradePromptClicks: number;
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
  anonymousStage: {
    landingPageViews: number;
    pricingPageViews: number;
    upgradePromptViews: number;
    upgradePromptClicks: number;
    checkoutStarts: number;
  };
  authenticatedStage: {
    pricingPageViews: number;
    upgradePromptViews: number;
    upgradePromptClicks: number;
    checkoutStarts: number;
  };
  sourceBreakdown: {
    landingPageViews: Record<string, number>;
    landingCtas: Record<string, number>;
    pricingPageViews: Record<string, number>;
    pricingCtas: Record<string, number>;
    upgradePromptViews: Record<string, number>;
    upgradePromptClicks: Record<string, number>;
    checkoutStarts: Record<string, number>;
  };
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
      "anonymousMergedAt",
      "landingPageViewedAt",
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
      "upgradePromptClickedAt",
      "pricingCtaClickedAt",
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

  if (typeof candidate.anonymousFunnelId === "string" && candidate.anonymousFunnelId.trim()) {
    normalized.anonymousFunnelId = candidate.anonymousFunnelId.trim();
  }

  (
    [
      "landingPageViewSources",
      "landingCtaSources",
      "pricingPageViewSources",
      "pricingCtaSources",
      "upgradePromptViewSources",
      "upgradePromptClickSources",
      "checkoutStartSources",
    ] as const
  ).forEach((key) => {
    const rawValue = candidate[key];
    if (!rawValue || typeof rawValue !== "object") {
      return;
    }

    const entries = Object.entries(rawValue as Record<string, unknown>).reduce<
      Record<string, number>
    >((accumulator, [entryKey, count]) => {
      const normalizedKey = entryKey.trim();
      const normalizedCount = Number(count);
      if (!normalizedKey || !Number.isFinite(normalizedCount) || normalizedCount <= 0) {
        return accumulator;
      }
      accumulator[normalizedKey] = normalizedCount;
      return accumulator;
    }, {});

    if (Object.keys(entries).length > 0) {
      normalized[key] = entries;
    }
  });

  return normalized;
};

const incrementSourceCount = (
  next: BetaFunnelAnalytics,
  key:
    | "landingPageViewSources"
    | "landingCtaSources"
    | "pricingPageViewSources"
    | "pricingCtaSources"
    | "upgradePromptViewSources"
    | "upgradePromptClickSources"
    | "checkoutStartSources",
  source?: string | null
) => {
  const normalizedSource = typeof source === "string" ? source.trim() : "";
  if (!normalizedSource) {
    return;
  }

  next[key] = {
    ...(next[key] || {}),
    [normalizedSource]: Number(next[key]?.[normalizedSource] || 0) + 1,
  };
};

export const markBetaFunnelMilestone = ({
  funnel,
  key,
  occurredAt,
  source,
  anonymousFunnelId,
}: {
  funnel: unknown;
  key: keyof BetaFunnelAnalytics;
  occurredAt?: Date | string | null;
  source?: string | null;
  anonymousFunnelId?: string | null;
}) => {
  const next = normalizeBetaFunnel(funnel);
  if (typeof anonymousFunnelId === "string" && anonymousFunnelId.trim()) {
    next.anonymousFunnelId = anonymousFunnelId.trim();
  }
  setMilestoneIfMissing(next, key, toValidDate(occurredAt ?? new Date()));

  switch (key) {
    case "landingPageViewedAt":
      incrementSourceCount(next, "landingPageViewSources", source);
      break;
    case "landingCtaAt":
      incrementSourceCount(next, "landingCtaSources", source);
      break;
    case "pricingPageViewedAt":
      incrementSourceCount(next, "pricingPageViewSources", source);
      break;
    case "pricingCtaClickedAt":
      incrementSourceCount(next, "pricingCtaSources", source);
      break;
    case "upgradePromptViewedAt":
      incrementSourceCount(next, "upgradePromptViewSources", source);
      break;
    case "upgradePromptClickedAt":
      incrementSourceCount(next, "upgradePromptClickSources", source);
      break;
    case "checkoutStartedAt":
      incrementSourceCount(next, "checkoutStartSources", source);
      break;
    default:
      break;
  }
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

const mergeSourceBreakdown = (
  funnels: BetaFunnelAnalytics[],
  key:
    | "landingPageViewSources"
    | "landingCtaSources"
    | "pricingPageViewSources"
    | "pricingCtaSources"
    | "upgradePromptViewSources"
    | "upgradePromptClickSources"
    | "checkoutStartSources"
) =>
  funnels.reduce<Record<string, number>>((accumulator, funnel) => {
    Object.entries(funnel[key] || {}).forEach(([source, count]) => {
      accumulator[source] = Number(accumulator[source] || 0) + Number(count || 0);
    });
    return accumulator;
  }, {});

export const mergeBetaFunnels = ({
  base,
  incoming,
  mergedAt,
}: {
  base: unknown;
  incoming: unknown;
  mergedAt?: Date | string | null;
}) => {
  const next = normalizeBetaFunnel(base);
  const incomingFunnel = normalizeBetaFunnel(incoming);

  (
    [
      "landingPageViewedAt",
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
      "upgradePromptClickedAt",
      "pricingCtaClickedAt",
      "checkoutStartedAt",
      "checkoutCompletedAt",
      "manualProGrantAppliedAt",
      "billingPortalOpenedAt",
      "cancelRequestedAt",
      "subscriptionCanceledAt",
    ] as Array<keyof BetaFunnelAnalytics>
  ).forEach((key) => {
    if (!next[key] && incomingFunnel[key]) {
      next[key] = incomingFunnel[key];
    }
  });

  (
    [
      "landingPageViewSources",
      "landingCtaSources",
      "pricingPageViewSources",
      "pricingCtaSources",
      "upgradePromptViewSources",
      "upgradePromptClickSources",
      "checkoutStartSources",
    ] as const
  ).forEach((key) => {
    const merged = { ...(next[key] || {}) };
    Object.entries(incomingFunnel[key] || {}).forEach(([source, count]) => {
      merged[source] = Number(merged[source] || 0) + Number(count || 0);
    });
    if (Object.keys(merged).length > 0) {
      next[key] = merged;
    }
  });

  if (!next.anonymousFunnelId && incomingFunnel.anonymousFunnelId) {
    next.anonymousFunnelId = incomingFunnel.anonymousFunnelId;
  }

  setMilestoneIfMissing(next, "anonymousMergedAt", toValidDate(mergedAt ?? new Date()));
  return next;
};

const toRate = (numerator: number, denominator: number) =>
  denominator > 0 ? Number((numerator / denominator).toFixed(3)) : 0;

export const summarizeMonetizationFunnel = ({
  users,
  anonymousFunnels = [],
  hasPaidAccess,
}: {
  users: Array<{ betaFunnel?: unknown }>;
  anonymousFunnels?: Array<{ betaFunnel?: unknown }>;
  hasPaidAccess: (user: { betaFunnel?: unknown }) => boolean;
}): MonetizationSummary => {
  const funnels = users.map((user) => normalizeBetaFunnel(user.betaFunnel));
  const anonymousStageFunnels = anonymousFunnels.map((entry) =>
    normalizeBetaFunnel(entry.betaFunnel)
  );
  const pricingPageViews = countUsersWithMilestone(funnels, "pricingPageViewedAt");
  const upgradePromptViews = countUsersWithMilestone(funnels, "upgradePromptViewedAt");
  const upgradePromptClicks = countUsersWithMilestone(funnels, "upgradePromptClickedAt");
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
    upgradePromptClicks,
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
    anonymousStage: {
      landingPageViews: countUsersWithMilestone(anonymousStageFunnels, "landingPageViewedAt"),
      pricingPageViews: countUsersWithMilestone(anonymousStageFunnels, "pricingPageViewedAt"),
      upgradePromptViews: countUsersWithMilestone(anonymousStageFunnels, "upgradePromptViewedAt"),
      upgradePromptClicks: countUsersWithMilestone(anonymousStageFunnels, "upgradePromptClickedAt"),
      checkoutStarts: countUsersWithMilestone(anonymousStageFunnels, "checkoutStartedAt"),
    },
    authenticatedStage: {
      pricingPageViews,
      upgradePromptViews,
      upgradePromptClicks,
      checkoutStarts,
    },
    sourceBreakdown: {
      landingPageViews: mergeSourceBreakdown(anonymousStageFunnels, "landingPageViewSources"),
      landingCtas: mergeSourceBreakdown(
        [...anonymousStageFunnels, ...funnels],
        "landingCtaSources"
      ),
      pricingPageViews: mergeSourceBreakdown(
        [...anonymousStageFunnels, ...funnels],
        "pricingPageViewSources"
      ),
      pricingCtas: mergeSourceBreakdown(
        [...anonymousStageFunnels, ...funnels],
        "pricingCtaSources"
      ),
      upgradePromptViews: mergeSourceBreakdown(
        [...anonymousStageFunnels, ...funnels],
        "upgradePromptViewSources"
      ),
      upgradePromptClicks: mergeSourceBreakdown(
        [...anonymousStageFunnels, ...funnels],
        "upgradePromptClickSources"
      ),
      checkoutStarts: mergeSourceBreakdown(
        [...anonymousStageFunnels, ...funnels],
        "checkoutStartSources"
      ),
    },
  };
};
