import { ObjectId } from "mongodb";

export interface ExerciseSet {
  name: string;
  reps?: number;
  percentage?: number;
  weight?: number;
  actualReps?: number | string;
  actualWeight?: number | string;
  seconds?: number;
  actualSeconds?: number | string;
  minutes?: number;
  actualMinutes?: number | string;
  hours?: number;
  actualHours?: number | string;
  totalSeconds?: number | string;
  complete?: boolean;
  completedDate?: Date | string;
}

export interface Exercise {
  name: string;
  type: "timed" | "weight";
  max?: number;
  rest: number;
  complete: boolean;
  sets: ExerciseSet[];
}

interface Day {
  title: string;
  complete?: boolean;
  exercises: Exercise[];
}

export interface Routine {
  name: string;
  description: string;
  days: {
    sunday: Day;
    monday: Day;
    tuesday: Day;
    wednesday: Day;
    thursday: Day;
    friday: Day;
    saturday: Day;
  };
}

export interface ExerciseCatalogDoc {
  _id?: ObjectId;
  name: string;
  type: "weight" | "timed";
  defaultMax?: number;
  equipment?: string[];
  target?: string;
  bodyPart?: string;
  aliases?: string[];
  videoUrl?: string;
  muscleGroup?: string;
  createdBy?: string | null;
  description?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface RecurringRuleDoc {
  _id?: ObjectId;
  userId: string;
  exerciseId: ObjectId | string;
  routineName: string;
  sortOrder?: number;
  recurrenceType?: "daily" | "weekly" | "custom" | "monthly";
  interval?: number;
  daysOfWeek?: number[];
  dayOfWeek: number;
  dayOfMonth?: number;
  intervalWeeks: number;
  startDate: Date;
  endDate?: Date;
  templateSets?: ExerciseSet[];
  active: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface WorkoutEntryDoc {
  _id?: ObjectId;
  userId: string;
  exerciseId: ObjectId | string;
  sortOrder?: number;
  name?: string;
  type?: "timed" | "weight";
  max?: number;
  routineName: string;
  date: Date;
  rest?: number;
  complete?: boolean;
  sets?: ExerciseSet[];
  ruleId?: string;
  skipped?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export type FeedbackLegacyStatus =
  | "new"
  | "reviewing"
  | "planned"
  | "resolved"
  | "closed";

export type FeedbackTriageStatus =
  | "new"
  | "duplicate"
  | "queued"
  | "fixing"
  | "resolved"
  | "verified";

export type FeedbackNotificationStatus =
  | "pending"
  | "sent"
  | "skipped"
  | "failed";

export interface FeedbackItemDoc {
  _id?: ObjectId;
  userId: string;
  username?: string;
  email?: string;
  type: "bug" | "feature";
  title: string;
  description: string;
  status?: FeedbackLegacyStatus;
  triageStatus?: FeedbackTriageStatus;
  severity?: "low" | "medium" | "high";
  page?: string;
  deviceType?: "mobile" | "desktop" | "unknown";
  fingerprint?: string;
  workItemId?: ObjectId | string;
  notificationStatus?: FeedbackNotificationStatus;
  lastNotificationError?: string;
  fixThreadId?: string;
  fixCommitSha?: string;
  resolvedAt?: Date | string;
  bugReport?: {
    mode: "recorded";
    startedAt?: Date | string;
    completedAt?: Date | string;
    currentPath?: string;
    userAgent?: string;
    viewport?: {
      width: number;
      height: number;
    };
    interactions?: Array<{
      timestamp: string;
      type: "click" | "change" | "submit" | "navigation" | "lifecycle";
      page: string;
      kind?: "raw" | "semantic";
      target?: string;
      value?: string;
      detail?: string;
      label?: string;
      expected?: string;
      actual?: string;
      status?: "info" | "success" | "failure";
    }>;
    errors?: Array<{
      timestamp: string;
      source: "window-error" | "unhandled-rejection" | "console-error";
      page: string;
      message: string;
      detail?: string;
    }>;
  };
  coachFeedback?: {
    sentiment: "like" | "dislike";
    messageId?: string;
    selectedResponse?: string;
    explanation?: string;
    conversation?: Array<{
      role: "coach" | "user";
      text: string;
    }>;
  };
  createdAt?: Date;
  updatedAt?: Date;
}

export interface FeedbackWorkItemDoc {
  _id?: ObjectId;
  type: "bug" | "feature";
  title: string;
  latestDescription: string;
  page?: string;
  severity?: "low" | "medium" | "high";
  deviceType?: "mobile" | "desktop" | "unknown";
  fingerprint: string;
  occurrenceCount: number;
  status?: FeedbackLegacyStatus;
  triageStatus: FeedbackTriageStatus;
  notificationStatus?: FeedbackNotificationStatus;
  lastNotificationError?: string;
  firstReportId?: ObjectId | string;
  latestReportId?: ObjectId | string;
  reportIds?: Array<ObjectId | string>;
  latestReporter?: string;
  latestEmail?: string;
  fixThreadId?: string;
  fixCommitSha?: string;
  resolvedAt?: Date | string;
  firstReportedAt?: Date;
  lastReportedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}
