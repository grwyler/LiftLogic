import { ExerciseSet, WeightUnit, WorkoutEntryDoc } from "./types";

const LB_PER_KG = 2.2046226218;
const ROUNDING_PRECISION = 10;

export const DEFAULT_WEIGHT_UNIT: WeightUnit = "lb";

export const WEIGHT_UNIT_CONFIG = {
  lb: {
    label: "lb",
    step: 1,
    min: 1,
    max: 2000,
    recommendationIncrement: 5,
    barbellWeight: 45,
    plates: [45, 35, 25, 10, 5, 2.5],
  },
  kg: {
    label: "kg",
    step: 0.5,
    min: 0.5,
    max: 907.5,
    recommendationIncrement: 2.5,
    barbellWeight: 20,
    plates: [25, 20, 15, 10, 5, 2.5, 1.25],
  },
} as const;

const isBlank = (value: unknown) =>
  value === "" || value === null || value === undefined;

const roundToPrecision = (value: number, precision = ROUNDING_PRECISION) =>
  Math.round(value * precision) / precision;

export const normalizeWeightUnit = (value?: unknown): WeightUnit =>
  value === "kg" ? "kg" : "lb";

export const parseWeightInput = (value: unknown): number | null => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }

    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
};

export const convertWeight = (
  value: number,
  fromUnit: WeightUnit,
  toUnit: WeightUnit
) => {
  if (!Number.isFinite(value)) {
    return value;
  }

  if (fromUnit === toUnit) {
    return value;
  }

  return fromUnit === "kg" ? value * LB_PER_KG : value / LB_PER_KG;
};

export const toCanonicalWeightLb = (value: number, unit: WeightUnit) =>
  roundToPrecision(convertWeight(value, unit, "lb"));

export const fromCanonicalWeightLb = (value: number, unit: WeightUnit) =>
  roundToPrecision(convertWeight(value, "lb", unit));

export const roundToWeightIncrement = (value: number, unit: WeightUnit) => {
  const increment = WEIGHT_UNIT_CONFIG[unit].recommendationIncrement;
  return roundToPrecision(Math.round(value / increment) * increment);
};

export const formatWeightValue = (value: number) =>
  Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, "");

export const formatWeight = (value: number | null | undefined, unit: WeightUnit) => {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "";
  }

  return `${formatWeightValue(value)} ${WEIGHT_UNIT_CONFIG[unit].label}`;
};

export const getWeightInputConfig = (unit: WeightUnit) => WEIGHT_UNIT_CONFIG[unit];

export const getCanonicalWeightFromSet = (
  set: ExerciseSet | undefined | null,
  kind: "planned" | "actual"
) => {
  if (!set) {
    return null;
  }

  const value =
    kind === "planned" ? parseWeightInput(set.weight) : parseWeightInput(set.actualWeight);
  if (value === null || value <= 0) {
    const canonicalValue =
      kind === "planned"
        ? parseWeightInput(set.weightInLb)
        : parseWeightInput(set.actualWeightInLb);
    return canonicalValue !== null && canonicalValue > 0 ? canonicalValue : null;
  }

  const sourceUnit = normalizeWeightUnit(
    kind === "planned" ? set.weightUnit : set.actualWeightUnit ?? set.weightUnit
  );
  return toCanonicalWeightLb(value, sourceUnit);
};

export const getDisplayWeightFromSet = (
  set: ExerciseSet | undefined | null,
  kind: "planned" | "actual",
  preferredUnit: WeightUnit
) => {
  const canonical = getCanonicalWeightFromSet(set, kind);
  if (canonical === null) {
    return null;
  }

  return fromCanonicalWeightLb(canonical, preferredUnit);
};

export const normalizeWeightSetForStorage = (
  set: ExerciseSet,
  defaultUnit: WeightUnit
): ExerciseSet => {
  const weightUnit = normalizeWeightUnit(set.weightUnit ?? defaultUnit);
  const actualWeightUnit = normalizeWeightUnit(
    set.actualWeightUnit ?? set.weightUnit ?? defaultUnit
  );

  const plannedWeight = parseWeightInput(set.weight);
  const actualWeight = parseWeightInput(set.actualWeight);

  return {
    ...set,
    weightUnit,
    actualWeightUnit: isBlank(set.actualWeight) ? undefined : actualWeightUnit,
    weightInLb:
      plannedWeight !== null && plannedWeight > 0
        ? toCanonicalWeightLb(plannedWeight, weightUnit)
        : undefined,
    actualWeightInLb:
      actualWeight !== null && actualWeight > 0
        ? toCanonicalWeightLb(actualWeight, actualWeightUnit)
        : undefined,
  };
};

export const normalizeWorkoutEntryWeights = (
  entry: WorkoutEntryDoc,
  defaultUnit: WeightUnit
) => {
  const weightUnit = normalizeWeightUnit(entry.weightUnit ?? defaultUnit);
  return {
    ...entry,
    weightUnit,
    sets: Array.isArray(entry.sets)
      ? entry.sets.map((set) => normalizeWeightSetForStorage(set, weightUnit))
      : entry.sets,
  };
};

export const calculatePlateBreakdown = (totalWeight: number, unit: WeightUnit) => {
  const normalizedWeight = parseWeightInput(totalWeight);
  if (normalizedWeight === null || normalizedWeight <= 0) {
    return "";
  }

  const { barbellWeight, plates, label } = WEIGHT_UNIT_CONFIG[unit];
  if (normalizedWeight < barbellWeight) {
    return unit === "kg"
      ? "Below a standard 20 kg barbell load."
      : "Below a standard 45 lb barbell load.";
  }

  let remainingWeight = roundToPrecision((normalizedWeight - barbellWeight) / 2);
  const requiredWeights: string[] = [];

  for (const plateWeight of plates) {
    const count = Math.floor((remainingWeight + 1e-6) / plateWeight);
    if (count <= 0) {
      continue;
    }

    requiredWeights.push(`${count}x ${formatWeightValue(plateWeight)} ${label}`);
    remainingWeight = roundToPrecision(remainingWeight - count * plateWeight);
  }

  if (remainingWeight > 0.001) {
    return "Cannot achieve the exact weight with the available plates.";
  }

  return requiredWeights.join(", ");
};
