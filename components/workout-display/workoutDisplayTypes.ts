import { Exercise, UserDoc, WorkoutExerciseView } from "../../utils/types";

export type WorkoutDisplayExercise = Exercise & Partial<WorkoutExerciseView>;

export type WorkoutStatusChip = {
  label: string;
  color: "default" | "primary" | "success" | "warning";
};

export type WorkoutTrendCard = {
  id: string;
  exerciseName: string;
  status: "new" | "up" | "steady" | "down";
  label: string;
  benchmark: string;
  detail: string;
};

export type WorkoutTrendSummary = {
  counts: {
    new: number;
    up: number;
    steady: number;
    down: number;
  };
  headline: string;
  supportingCopy: string;
};

export type WorkoutWeeklyConsistency = {
  state: "goal_hit" | "behind" | "on_track";
  completedCount: number;
  target: number;
  supportingCopy: string;
  scheduledCount: number;
  remainingScheduledCount: number;
  headline: string;
};

export type WorkoutComebackGuide = {
  headline: string;
  supportingCopy: string;
  missedScheduledCount: number;
  daysSinceLastLog: number | null;
};

export type WorkoutProgressLookup = Record<
  string,
  {
    summary: unknown;
    recommendation: unknown;
  }
>;

export type WorkoutDisplayUserProfile = Partial<UserDoc> | null | undefined;
