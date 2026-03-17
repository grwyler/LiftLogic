import {
  BillingPlan,
  FeatureFlagDoc,
  FeatureFlagKey,
  FeatureFlagResolution,
  FeatureFlagVariant,
} from "./types";

const DEFAULT_VARIANT_WEIGHTS: Record<FeatureFlagVariant, number> = {
  control: 50,
  variant_a: 50,
  variant_b: 0,
};

export const DEFAULT_FEATURE_FLAGS: FeatureFlagDoc[] = [
  {
    key: "onboarding_guided_starter",
    enabled: false,
    surface: "onboarding",
    description: "Gate the guided first-session starter for tracker-first users.",
    rolloutPercent: 0,
    variantWeights: { control: 50, variant_a: 50 },
    targeting: {
      routes: ["/routines"],
      billingPlan: "any",
    },
  },
  {
    key: "pricing_premium_proof_experiment",
    enabled: false,
    surface: "pricing",
    description: "Experiment with premium-proof emphasis and CTA framing on pricing.",
    rolloutPercent: 0,
    variantWeights: { control: 50, variant_a: 50 },
    targeting: {
      routes: ["/pricing"],
      billingPlan: "any",
    },
  },
  {
    key: "workout_focus_mode",
    enabled: false,
    surface: "workout",
    description: "Gate focused workout UX changes during active training sessions.",
    rolloutPercent: 0,
    variantWeights: { control: 50, variant_a: 50 },
    targeting: {
      routes: ["/routines"],
      billingPlan: "any",
    },
  },
];

const normalizePercent = (value: number) =>
  Math.min(100, Math.max(0, Math.round(value)));

const normalizeRoute = (value?: string) =>
  String(value || "")
    .trim()
    .split("?")[0]
    .replace(/\/+$/, "");

const hashString = (value: string) => {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash;
};

const getNormalizedVariantWeights = (
  weights?: Partial<Record<FeatureFlagVariant, number>>
): Record<FeatureFlagVariant, number> => {
  const merged = {
    ...DEFAULT_VARIANT_WEIGHTS,
    ...(weights || {}),
  };

  const total = Object.values(merged).reduce(
    (sum, value) => sum + Math.max(0, Number(value) || 0),
    0
  );

  if (total <= 0) {
    return DEFAULT_VARIANT_WEIGHTS;
  }

  return {
    control: Math.max(0, Number(merged.control) || 0),
    variant_a: Math.max(0, Number(merged.variant_a) || 0),
    variant_b: Math.max(0, Number(merged.variant_b) || 0),
  };
};

export const mergeFeatureFlagConfigs = (configs?: FeatureFlagDoc[] | null) => {
  const byKey = new Map<FeatureFlagKey, FeatureFlagDoc>();

  DEFAULT_FEATURE_FLAGS.forEach((flag) => {
    byKey.set(flag.key, flag);
  });

  (configs || []).forEach((flag) => {
    byKey.set(flag.key, {
      ...(byKey.get(flag.key) || flag),
      ...flag,
      rolloutPercent: normalizePercent(Number(flag.rolloutPercent || 0)),
      variantWeights: getNormalizedVariantWeights(flag.variantWeights),
    });
  });

  return Array.from(byKey.values());
};

const chooseVariant = ({
  key,
  identity,
  weights,
}: {
  key: FeatureFlagKey;
  identity: string;
  weights: Record<FeatureFlagVariant, number>;
}): FeatureFlagVariant => {
  const total = Object.values(weights).reduce((sum, value) => sum + value, 0);
  if (total <= 0) {
    return "control";
  }

  const bucket = hashString(`${key}:${identity}:variant`) % total;
  let cursor = 0;

  for (const variant of ["control", "variant_a", "variant_b"] as FeatureFlagVariant[]) {
    cursor += weights[variant];
    if (bucket < cursor) {
      return variant;
    }
  }

  return "control";
};

export const resolveFeatureFlags = ({
  configs,
  route,
  identity,
  isAuthenticated,
  billingPlan = "free",
}: {
  configs?: FeatureFlagDoc[] | null;
  route?: string;
  identity: string;
  isAuthenticated: boolean;
  billingPlan?: BillingPlan;
}): FeatureFlagResolution[] => {
  const normalizedRoute = normalizeRoute(route);

  return mergeFeatureFlagConfigs(configs).map((flag) => {
    const matchesRoute =
      !flag.targeting?.routes?.length ||
      flag.targeting.routes.map(normalizeRoute).includes(normalizedRoute);
    const matchesAuth =
      !flag.targeting?.authenticatedOnly || isAuthenticated;
    const matchesBillingPlan =
      !flag.targeting?.billingPlan ||
      flag.targeting.billingPlan === "any" ||
      flag.targeting.billingPlan === billingPlan;

    if (!flag.enabled) {
      return {
        key: flag.key,
        enabled: false,
        surface: flag.surface,
        variant: "control",
        rolloutPercent: normalizePercent(flag.rolloutPercent),
        reason: "disabled in config",
      };
    }

    if (!matchesRoute || !matchesAuth || !matchesBillingPlan) {
      return {
        key: flag.key,
        enabled: false,
        surface: flag.surface,
        variant: "control",
        rolloutPercent: normalizePercent(flag.rolloutPercent),
        reason: "targeting did not match this request",
      };
    }

    const rolloutPercent = normalizePercent(flag.rolloutPercent);
    const rolloutBucket = hashString(`${flag.key}:${identity}:rollout`) % 100;
    if (rolloutBucket >= rolloutPercent) {
      return {
        key: flag.key,
        enabled: false,
        surface: flag.surface,
        variant: "control",
        rolloutPercent,
        reason: "outside rollout percentage",
      };
    }

    return {
      key: flag.key,
      enabled: true,
      surface: flag.surface,
      variant: chooseVariant({
        key: flag.key,
        identity,
        weights: getNormalizedVariantWeights(flag.variantWeights),
      }),
      rolloutPercent,
      reason: "matched targeting and rollout",
    };
  });
};
