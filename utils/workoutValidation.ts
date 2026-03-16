import { ExerciseSet, WeightUnit, WorkoutEntryDoc } from "./types";
import {
  formatWeightValue,
  getWeightInputConfig,
  normalizeWeightUnit,
  parseWeightInput,
} from "./weightUnits";

export const WORKOUT_VALUE_LIMITS = {
  reps: { min: 1, max: 100 },
  weight: { min: 1, max: 2000 },
  hours: { min: 0, max: 23 },
  minutes: { min: 0, max: 59 },
  seconds: { min: 0, max: 59 },
  totalSeconds: { min: 1, max: 24 * 60 * 60 },
  rest: { min: 0, max: 60 * 60 },
} as const;

type ParsedInteger =
  | { kind: "missing" }
  | { kind: "invalid" }
  | { kind: "value"; value: number };
type ParsedWeight =
  | { kind: "missing" }
  | { kind: "invalid" }
  | { kind: "value"; value: number };

const isBlank = (value: unknown) =>
  value === "" || value === null || value === undefined;

const parseInteger = (value: unknown): ParsedInteger => {
  if (isBlank(value)) {
    return { kind: "missing" };
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value) || !Number.isInteger(value)) {
      return { kind: "invalid" };
    }

    return { kind: "value", value };
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return { kind: "missing" };
    }

    if (!/^-?\d+$/.test(trimmed)) {
      return { kind: "invalid" };
    }

    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) {
      return { kind: "invalid" };
    }

    return { kind: "value", value: parsed };
  }

  return { kind: "invalid" };
};

const parseWeight = (
  value: unknown,
  unit: WeightUnit
): ParsedWeight => {
  if (isBlank(value)) {
    return { kind: "missing" };
  }

  const parsed = parseWeightInput(value);
  if (parsed === null || !Number.isFinite(parsed)) {
    return { kind: "invalid" };
  }

  const { step } = getWeightInputConfig(unit);
  const scaled = parsed / step;
  if (Math.abs(scaled - Math.round(scaled)) > 1e-6) {
    return { kind: "invalid" };
  }

  return { kind: "value", value: parsed };
};

const validateIntegerField = ({
  value,
  label,
  min,
  max,
  required = false,
}: {
  value: unknown;
  label: string;
  min: number;
  max: number;
  required?: boolean;
}) => {
  const parsed = parseInteger(value);

  if (parsed.kind === "missing") {
    return required ? `${label} is required.` : null;
  }

  if (parsed.kind === "invalid") {
    return `${label} must be a whole number.`;
  }

  if (parsed.value < min || parsed.value > max) {
    return `${label} must be between ${min} and ${max}.`;
  }

  return null;
};

const validateTimedParts = ({
  hours,
  minutes,
  seconds,
  prefix,
  required,
}: {
  hours: unknown;
  minutes: unknown;
  seconds: unknown;
  prefix: string;
  required: boolean;
}) => {
  const errors = [
    validateIntegerField({
      value: hours,
      label: `${prefix} hours`,
      min: WORKOUT_VALUE_LIMITS.hours.min,
      max: WORKOUT_VALUE_LIMITS.hours.max,
      required: false,
    }),
    validateIntegerField({
      value: minutes,
      label: `${prefix} minutes`,
      min: WORKOUT_VALUE_LIMITS.minutes.min,
      max: WORKOUT_VALUE_LIMITS.minutes.max,
      required: false,
    }),
    validateIntegerField({
      value: seconds,
      label: `${prefix} seconds`,
      min: WORKOUT_VALUE_LIMITS.seconds.min,
      max: WORKOUT_VALUE_LIMITS.seconds.max,
      required: false,
    }),
  ].filter(Boolean) as string[];

  if (errors.length > 0) {
    return errors;
  }

  const parsedHours = parseInteger(hours);
  const parsedMinutes = parseInteger(minutes);
  const parsedSeconds = parseInteger(seconds);
  const total =
    (parsedHours.kind === "value" ? parsedHours.value : 0) * 3600 +
    (parsedMinutes.kind === "value" ? parsedMinutes.value : 0) * 60 +
    (parsedSeconds.kind === "value" ? parsedSeconds.value : 0);

  if (required && total < WORKOUT_VALUE_LIMITS.totalSeconds.min) {
    return [
      `${prefix} duration must be between ${WORKOUT_VALUE_LIMITS.totalSeconds.min} and ${WORKOUT_VALUE_LIMITS.totalSeconds.max} seconds.`,
    ];
  }

  if (total > WORKOUT_VALUE_LIMITS.totalSeconds.max) {
    return [
      `${prefix} duration must be between ${WORKOUT_VALUE_LIMITS.totalSeconds.min} and ${WORKOUT_VALUE_LIMITS.totalSeconds.max} seconds.`,
    ];
  }

  return [];
};

const validateWeightField = ({
  value,
  label,
  unit,
  required = false,
}: {
  value: unknown;
  label: string;
  unit: WeightUnit;
  required?: boolean;
}) => {
  const parsed = parseWeight(value, unit);
  const { min, max, step, label: unitLabel } = getWeightInputConfig(unit);

  if (parsed.kind === "missing") {
    return required ? `${label} is required.` : null;
  }

  if (parsed.kind === "invalid") {
    return `${label} must use ${formatWeightValue(step)} ${unitLabel} increments.`;
  }

  if (parsed.value < min || parsed.value > max) {
    return `${label} must be between ${formatWeightValue(min)} and ${formatWeightValue(max)} ${unitLabel}.`;
  }

  return null;
};

export const validateWeightSetInput = ({
  weight,
  reps,
  unit = "lb",
  prefix = "Set",
}: {
  weight: unknown;
  reps: unknown;
  unit?: WeightUnit;
  prefix?: string;
}) =>
  [
    validateWeightField({
      value: weight,
      label: `${prefix} weight`,
      unit,
      required: true,
    }),
    validateIntegerField({
      value: reps,
      label: `${prefix} reps`,
      min: WORKOUT_VALUE_LIMITS.reps.min,
      max: WORKOUT_VALUE_LIMITS.reps.max,
      required: true,
    }),
  ].filter(Boolean) as string[];

export const validateTimedSetInput = ({
  hours,
  minutes,
  seconds,
  prefix = "Set",
}: {
  hours: unknown;
  minutes: unknown;
  seconds: unknown;
  prefix?: string;
}) =>
  validateTimedParts({
    hours,
    minutes,
    seconds,
    prefix,
    required: true,
  });

export const validateExerciseSetForEntry = ({
  set,
  type,
  index,
}: {
  set: ExerciseSet;
  type?: WorkoutEntryDoc["type"];
  index: number;
}) => {
  const prefix = `Set ${index + 1}`;

  if (type === "timed") {
    const errors = validateTimedSetInput({
      hours: set.hours,
      minutes: set.minutes,
      seconds: set.seconds,
      prefix: `${prefix} planned`,
    });

    if (set.complete) {
      errors.push(
        ...validateTimedSetInput({
          hours: (set as any).actualHours,
          minutes: (set as any).actualMinutes,
          seconds: (set as any).actualSeconds,
          prefix: `${prefix} logged`,
        })
      );
    } else {
      errors.push(
        ...validateTimedParts({
          hours: (set as any).actualHours,
          minutes: (set as any).actualMinutes,
          seconds: (set as any).actualSeconds,
          prefix: `${prefix} logged`,
          required: false,
        })
      );
    }

    return errors;
  }

  if (type === "weight") {
    const plannedUnit = normalizeWeightUnit(set.weightUnit);
    const actualUnit = normalizeWeightUnit(set.actualWeightUnit ?? set.weightUnit);
    const errors = validateWeightSetInput({
      weight: set.weight,
      reps: set.reps,
      unit: plannedUnit,
      prefix: `${prefix} target`,
    });

    if (set.complete) {
      errors.push(
        ...validateWeightSetInput({
          weight: set.actualWeight,
          reps: set.actualReps,
          unit: actualUnit,
          prefix: `${prefix} logged`,
        })
      );
    } else {
      if (!isBlank(set.actualWeight)) {
        const actualWeightError = validateWeightField({
          value: set.actualWeight,
          label: `${prefix} logged weight`,
          unit: actualUnit,
          required: false,
        });
        if (actualWeightError) {
          errors.push(actualWeightError);
        }
      }

      if (!isBlank(set.actualReps)) {
        const actualRepsError = validateIntegerField({
          value: set.actualReps,
          label: `${prefix} logged reps`,
          min: WORKOUT_VALUE_LIMITS.reps.min,
          max: WORKOUT_VALUE_LIMITS.reps.max,
          required: false,
        });
        if (actualRepsError) {
          errors.push(actualRepsError);
        }
      }
    }

    return errors;
  }

  return [];
};

export const validateWorkoutEntry = (entry: WorkoutEntryDoc) => {
  const errors: string[] = [];
  const weightUnit = normalizeWeightUnit(entry.weightUnit);

  if (!isBlank(entry.rest)) {
    const restError = validateIntegerField({
      value: entry.rest,
      label: "Rest time",
      min: WORKOUT_VALUE_LIMITS.rest.min,
      max: WORKOUT_VALUE_LIMITS.rest.max,
      required: false,
    });

    if (restError) {
      errors.push(restError);
    }
  }

  const sets = Array.isArray(entry.sets) ? entry.sets : [];
  sets.forEach((set, index) => {
    errors.push(
      ...validateExerciseSetForEntry({
        set: {
          ...set,
          weightUnit: set.weightUnit ?? weightUnit,
          actualWeightUnit: set.actualWeightUnit ?? set.weightUnit ?? weightUnit,
        },
        type: entry.type,
        index,
      })
    );
  });

  return errors;
};
