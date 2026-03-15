export interface BetaFunnelAnalytics {
  landingCtaAt?: Date | string;
  signupCompletedAt?: Date | string;
  setupCompletedAt?: Date | string;
  firstWorkoutLoggedAt?: Date | string;
  secondWorkoutLoggedAt?: Date | string;
  secondWorkoutWithin7DaysAt?: Date | string;
  retainedWeek2At?: Date | string;
  retainedWeek4At?: Date | string;
}

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
