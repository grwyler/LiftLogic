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
  state?:
    | "early_drift"
    | "missed_sessions"
    | "returning_after_lapse"
    | "missed_sessions_and_lapse";
  headline: string;
  supportingCopy: string;
  missedScheduledCount: number;
  daysSinceLastLog: number | null;
  lastCompletedLabel?: string | null;
  adjustmentCopy?: string | null;
};

export type WorkoutWeeklyReviewPreview = {
  reviewHeadline: string;
  reviewCopy: string;
  previewHeadline: string;
  previewCopy: string;
  thisWeekCompleted: number;
  lastWeekCompleted: number;
  nextWeekScheduledCount: number;
  nextWeekFirstDayLabel: string | null;
  recommendedFocus?: string;
  recentBriefs?: Array<{
    id: string;
    label: string;
    headline: string;
    summary: string;
  }>;
};

export type WorkoutTrainingAnalyticsSummary = {
  period: "week" | "month";
  label: string;
  completedWorkouts: number;
  plannedWorkouts: number;
  totalSets: number;
  totalVolume: number;
  workoutStreak: number;
  consistencyRate: number;
  muscleDistribution: Array<{
    group: string;
    sets: number;
    share: number;
  }>;
  liftTrendHighlights: Array<{
    exerciseId: string;
    exerciseName: string;
    status: "new" | "up" | "steady" | "down";
    label: string;
    benchmark: string;
    detail: string;
  }>;
};

export type WorkoutProgressLookup = Record<
  string,
  {
    summary: unknown;
    recommendation: unknown;
    entries?: unknown[];
    latestFeedback?: unknown;
  }
>;

export type WorkoutDisplayUserProfile = Partial<UserDoc> | null | undefined;
