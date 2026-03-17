import { deleteWorkoutEntry, saveWorkoutEntry, toLocalDateKey } from "./helpers";
import {
  deactivateRecurringRule,
  normalizeRecurringSchedule,
  saveRecurringRule,
  type RecurringScheduleInput,
} from "./recurringRuleService";

const buildExerciseEntryPayload = ({
  exercise,
  currentUserId,
  routineName,
  formattedDate,
}: {
  exercise: any;
  currentUserId: string;
  routineName: string;
  formattedDate: string;
}) => ({
  ...exercise,
  _id: exercise._id,
  entryInstanceId:
    exercise.entryInstanceId ?? exercise._id?.toString?.() ?? exercise._id,
  name: exercise.name,
  type: exercise.type,
  max: exercise.max,
  userId: exercise.userId ?? currentUserId,
  exerciseId: exercise.exerciseId ?? exercise._id,
  routineName,
  date: formattedDate,
  rest: exercise.rest ?? 0,
});

export const removeExerciseRepeatSchedule = async ({
  currentExercise,
  currentUserId,
  formattedDate,
  parsedDate,
  routineName,
}: {
  currentExercise: any;
  currentUserId: string;
  formattedDate: string;
  parsedDate: Date;
  routineName: string;
}) => {
  if (currentExercise.ruleId) {
    await deactivateRecurringRule(String(currentExercise.ruleId));
  }

  const updatedExercise = {
    ...currentExercise,
    isRepeating: false,
    ruleId: undefined,
    recurrenceType: undefined,
    interval: undefined,
    intervalWeeks: undefined,
    dayOfWeek: undefined,
    daysOfWeek: undefined,
    dayOfMonth: undefined,
    endDate: undefined,
  };

  await saveWorkoutEntry({
    ...buildExerciseEntryPayload({
      exercise: updatedExercise,
      currentUserId,
      routineName,
      formattedDate: toLocalDateKey(parsedDate),
    }),
    isRepeating: false,
    ruleId: null,
    recurrenceType: null,
    interval: null,
    intervalWeeks: null,
    dayOfWeek: null,
    daysOfWeek: null,
    dayOfMonth: null,
    endDate: null,
  } as any);

  return updatedExercise;
};

export const saveExerciseRepeatSchedule = async ({
  currentExercise,
  currentUserId,
  formattedDate,
  parsedDate,
  routineName,
  scheduleInput,
}: {
  currentExercise: any;
  currentUserId: string;
  formattedDate: string;
  parsedDate: Date;
  routineName: string;
  scheduleInput: RecurringScheduleInput;
}) => {
  if (currentExercise.ruleId) {
    await deactivateRecurringRule(String(currentExercise.ruleId));
  }

  const schedule = normalizeRecurringSchedule(scheduleInput, parsedDate);
  const savedRule = await saveRecurringRule({
    userId: currentUserId,
    exerciseId: currentExercise.exerciseId ?? currentExercise._id,
    exerciseName: currentExercise.name,
    exerciseType: currentExercise.type,
    routineName,
    recurrenceType: schedule.recurrenceType,
    interval: schedule.interval,
    dayOfWeek: schedule.dayOfWeek,
    daysOfWeek: schedule.daysOfWeek,
    dayOfMonth: schedule.dayOfMonth,
    intervalWeeks: schedule.interval,
    startDate: parsedDate,
    endDate: schedule.endDate,
    templateSets: currentExercise.sets,
    defaultMax: currentExercise.max,
    defaultRest: currentExercise.rest,
    active: true,
  } as any);

  const updatedExercise = {
    ...currentExercise,
    isRepeating: true,
    ruleId: String(savedRule._id),
    recurrenceType: schedule.recurrenceType,
    interval: schedule.interval,
    intervalWeeks: schedule.interval,
    dayOfWeek: schedule.dayOfWeek,
    daysOfWeek: schedule.daysOfWeek,
    dayOfMonth: schedule.dayOfMonth,
    endDate: schedule.endDate,
  };

  await saveWorkoutEntry(
    buildExerciseEntryPayload({
      exercise: updatedExercise,
      currentUserId,
      routineName,
      formattedDate: toLocalDateKey(parsedDate),
    }) as any
  );

  return updatedExercise;
};

export const deleteExerciseWithScheduleScope = async ({
  currentExercise,
  isRepeating,
  scope,
}: {
  currentExercise: any;
  isRepeating: boolean;
  scope: "today" | "all";
}) => {
  const recurringRuleId = String(
    currentExercise.ruleId ?? currentExercise._id ?? ""
  ).trim();

  if (scope === "all" && isRepeating) {
    if (!recurringRuleId) {
      throw new Error("Recurring rule id missing");
    }

    await deactivateRecurringRule(recurringRuleId);

    const materializedEntryId = String(currentExercise._id ?? "").trim();
    if (materializedEntryId && materializedEntryId !== recurringRuleId) {
      await deleteWorkoutEntry(materializedEntryId);
    }
    return;
  }

  if (currentExercise._id && !isRepeating) {
    await deleteWorkoutEntry(currentExercise._id);
  }
};
