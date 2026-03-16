import { ObjectId } from "mongodb";
import { BetaFunnelAnalytics } from "./betaFunnel";

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
  intentionalLowVolume?: boolean;
  reducedVolumeIntentional?: boolean;
  volumeReductionIntentional?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export type BillingPlan = "free" | "pro_beta";
export type BillingInterval = "month" | "year";
export type BillingSubscriptionStatus =
  | "inactive"
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "unpaid"
  | "incomplete"
  | "incomplete_expired"
  | "paused";

export interface BillingPriceOption {
  interval: BillingInterval;
  label: string;
  checkoutEnabled: boolean;
}

export interface BillingSummaryResponse {
  configured: boolean;
  portalEnabled: boolean;
  billingPlan: BillingPlan;
  subscriptionStatus: BillingSubscriptionStatus;
  subscriptionInterval?: BillingInterval;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  billingEmail?: string;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd?: string;
  prices: BillingPriceOption[];
}

export interface UserDoc {
  _id?: ObjectId;
  username: string;
  email?: string;
  name?: string;
  provider?: string;
  providerAccountId?: string;
  sex?: string;
  age?: string;
  preferredUnits?: "lb" | "kg";
  height?: string;
  weight?: string;
  trainingGoal?: string;
  currentFitnessLevel?: string;
  workoutDaysPerWeek?: string;
  experienceLevel?: string;
  workoutLength?: string;
  equipmentAccess?: string[];
  maxDumbbellWeight?: string;
  preferredTrainingDays?: string[];
  limitations?: string;
  notes?: string;
  setupPromptSeen?: boolean;
  setupCompleted?: boolean;
  darkMode?: boolean;
  themePreference?: "light" | "dawn" | "night" | "evergreen";
  billingPlan?: BillingPlan;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  stripePriceId?: string;
  stripeProductId?: string;
  subscriptionStatus?: BillingSubscriptionStatus;
  subscriptionInterval?: BillingInterval;
  subscriptionCurrentPeriodEnd?: Date;
  subscriptionCancelAtPeriodEnd?: boolean;
  subscriptionCanceledAt?: Date;
  billingEmail?: string;
  betaFunnel?: BetaFunnelAnalytics;
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

export type FeedbackDeviceType =
  | "mobile"
  | "tablet"
  | "foldable"
  | "desktop"
  | "unknown";

export interface FeedbackRuntimeContext {
  appVersion?: string;
  commitSha?: string;
  environment?: string;
  route?: string;
  userAgent?: string;
  viewport?: {
    width: number;
    height: number;
  };
  online?: boolean;
}

export interface FeedbackItemDoc {
  _id?: ObjectId;
  userId: string;
  username?: string;
  email?: string;
  reporterRole?: "admin" | "user";
  type: "bug" | "feature";
  title: string;
  description: string;
  status?: FeedbackLegacyStatus;
  triageStatus?: FeedbackTriageStatus;
  severity?: "low" | "medium" | "high";
  page?: string;
  deviceType?: FeedbackDeviceType;
  runtimeContext?: FeedbackRuntimeContext;
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
  deviceType?: FeedbackDeviceType;
  latestRuntimeContext?: FeedbackRuntimeContext;
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
  latestReporterRole?: "admin" | "user";
  fixThreadId?: string;
  fixCommitSha?: string;
  resolvedAt?: Date | string;
  firstReportedAt?: Date;
  lastReportedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}
