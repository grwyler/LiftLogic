import { getCanonicalWeightFromSet } from "./weightUnits";
import { WorkoutEntryDoc } from "./types";

export type MilestoneCategory =
  | "workout_count"
  | "consistency"
  | "training_volume"
  | "comeback";

export type Milestone = {
  id: string;
  category: MilestoneCategory;
  threshold: number;
  title: string;
  detail: string;
  unlockedAt: string;
};

export type MilestoneSummary = {
  unlocked: Milestone[];
  recentlyUnlocked: Milestone[];
};

const workoutCountThresholds = [1, 5, 10, 25, 50];
const consistencyThresholds = [1, 4, 8, 12];
const trainingVolumeThresholds = [1000, 5000, 10000, 25000];
const comebackThresholds = [1];

const toLocalDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const hasLoggedEntry = (entry: WorkoutEntryDoc) =>
  Boolean(
    entry.complete ||
      (Array.isArray(entry.sets) && entry.sets.some((set) => Boolean(set.complete)))
  );

const getEntryVolume = (entry: WorkoutEntryDoc) =>
  (Array.isArray(entry.sets) ? entry.sets : []).reduce((total, set) => {
    if (!set?.complete) {
      return total;
    }

    const reps =
      typeof set.actualReps === "number" ? set.actualReps : Number(set.actualReps);
    const weightInLb = getCanonicalWeightFromSet(set as any, "actual");

    if (!Number.isFinite(reps) || reps <= 0 || !Number.isFinite(weightInLb) || weightInLb <= 0) {
      return total;
    }

    return total + reps * weightInLb;
  }, 0);

const getWeekStartKey = (dateKey: string) => {
  const date = new Date(`${dateKey}T00:00:00`);
  date.setDate(date.getDate() - date.getDay());
  return toLocalDateKey(date);
};

const unlockThresholdMilestones = ({
  thresholds,
  values,
  category,
  createMilestone,
}: {
  thresholds: number[];
  values: Array<{ value: number; unlockedAt: string }>;
  category: MilestoneCategory;
  createMilestone: (threshold: number, unlockedAt: string) => Omit<Milestone, "id" | "category" | "threshold" | "unlockedAt">;
}) => {
  const unlocked: Milestone[] = [];

  for (const threshold of thresholds) {
    const match = values.find((value) => value.value >= threshold);
    if (!match) {
      continue;
    }

    const milestone = createMilestone(threshold, match.unlockedAt);
    unlocked.push({
      id: `${category}:${threshold}`,
      category,
      threshold,
      unlockedAt: match.unlockedAt,
      ...milestone,
    });
  }

  return unlocked;
};

export const buildMilestoneSummary = ({
  entries,
  currentDate,
  weeklyTarget,
}: {
  entries: WorkoutEntryDoc[];
  currentDate: Date;
  weeklyTarget?: number | null;
}): MilestoneSummary => {
  const loggedEntries = [...entries]
    .filter(hasLoggedEntry)
    .sort((a, b) => +new Date(a.date) - +new Date(b.date));

  const loggedDates = Array.from(
    new Set(
      loggedEntries
        .map((entry) => {
          const parsed = new Date(entry.date);
          return Number.isNaN(parsed.getTime()) ? null : toLocalDateKey(parsed);
        })
        .filter((value): value is string => Boolean(value))
    )
  ).sort();

  const workoutCountValues = loggedDates.map((dateKey, index) => ({
    value: index + 1,
    unlockedAt: dateKey,
  }));

  let runningVolume = 0;
  const volumeValues = loggedEntries.map((entry) => {
    const entryDate = new Date(entry.date);
    runningVolume += getEntryVolume(entry);
    return {
      value: runningVolume,
      unlockedAt: toLocalDateKey(entryDate),
    };
  });

  const consistencyValues: Array<{ value: number; unlockedAt: string }> = [];
  if (weeklyTarget && weeklyTarget > 0) {
    const loggedDaysPerWeek = new Map<string, number>();
    for (const dateKey of loggedDates) {
      const weekKey = getWeekStartKey(dateKey);
      loggedDaysPerWeek.set(weekKey, (loggedDaysPerWeek.get(weekKey) ?? 0) + 1);
    }

    let goalHitWeeks = 0;
    for (const [weekKey, count] of Array.from(loggedDaysPerWeek.entries()).sort((a, b) =>
      a[0].localeCompare(b[0])
    )) {
      if (count >= weeklyTarget) {
        goalHitWeeks += 1;
        consistencyValues.push({
          value: goalHitWeeks,
          unlockedAt: weekKey,
        });
      }
    }
  }

  let comebackCount = 0;
  const comebackValues: Array<{ value: number; unlockedAt: string }> = [];
  for (let index = 1; index < loggedDates.length; index += 1) {
    const current = new Date(`${loggedDates[index]}T00:00:00`);
    const previous = new Date(`${loggedDates[index - 1]}T00:00:00`);
    const dayGap = Math.round((current.getTime() - previous.getTime()) / 86400000);
    if (dayGap >= 8) {
      comebackCount += 1;
      comebackValues.push({
        value: comebackCount,
        unlockedAt: loggedDates[index],
      });
    }
  }

  const unlocked = [
    ...unlockThresholdMilestones({
      thresholds: workoutCountThresholds,
      values: workoutCountValues,
      category: "workout_count",
      createMilestone: (threshold) => ({
        title: `${threshold} workouts logged`,
        detail:
          threshold === 1
            ? "The routine is real now. One finished session is enough to start the habit."
            : `You have stacked ${threshold} logged workouts. That is real training momentum.`,
      }),
    }),
    ...unlockThresholdMilestones({
      thresholds: consistencyThresholds,
      values: consistencyValues,
      category: "consistency",
      createMilestone: (threshold) => ({
        title: `${threshold} goal-hit week${threshold === 1 ? "" : "s"}`,
        detail:
          threshold === 1
            ? "You matched your weekly training target. Consistency is becoming part of the routine."
            : `You have hit your weekly target ${threshold} different times. That is how durable habits get built.`,
      }),
    }),
    ...unlockThresholdMilestones({
      thresholds: trainingVolumeThresholds,
      values: volumeValues,
      category: "training_volume",
      createMilestone: (threshold) => ({
        title: `${threshold.toLocaleString()} lb of logged volume`,
        detail: `You have moved ${threshold.toLocaleString()} pounds in logged training volume. Quiet work adds up.`,
      }),
    }),
    ...unlockThresholdMilestones({
      thresholds: comebackThresholds,
      values: comebackValues,
      category: "comeback",
      createMilestone: () => ({
        title: "Comeback session logged",
        detail: "You came back after time away and got a session done. That reset matters.",
      }),
    }),
  ].sort((a, b) => a.unlockedAt.localeCompare(b.unlockedAt));

  const currentDateKey = toLocalDateKey(currentDate);

  return {
    unlocked,
    recentlyUnlocked: unlocked.filter((milestone) => milestone.unlockedAt === currentDateKey),
  };
};
