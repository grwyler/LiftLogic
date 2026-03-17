import { ObjectId } from "mongodb";
import { BetaFunnelAnalytics } from "./betaFunnel";

export type WeightUnit = "lb" | "kg";

export interface ExerciseSet {
  id?: string;
  name: string;
  weightUnit?: WeightUnit;
  actualWeightUnit?: WeightUnit;
  weightInLb?: number;
  actualWeightInLb?: number;
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
  weightUnit?: WeightUnit;
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
  entryInstanceId?: string;
  userId: string;
  exerciseId: ObjectId | string;
  weightUnit?: WeightUnit;
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

export interface WorkoutEntryAuditDoc {
  _id?: ObjectId;
  workoutEntryId?: ObjectId | string;
  entryInstanceId?: string;
  userId: string;
  actorUserId?: string;
  actorUsername?: string;
  actorEmail?: string;
  action: "create" | "update" | "delete";
  routineName?: string;
  exerciseId?: ObjectId | string;
  changedAt: Date | string;
  isHistoricalMutation: boolean;
  previousEntry?: Partial<WorkoutEntryDoc> | null;
  nextEntry?: Partial<WorkoutEntryDoc> | null;
}

export type BillingPlan = "free" | "pro_beta";
export type ProductPlan = "free" | "premium";
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

export interface UserEntitlements {
  assistantPlanGeneration: boolean;
  assistantPlanRegeneration: boolean;
  recurringWorkoutScheduling: boolean;
  progressionRecommendations: boolean;
}

export interface BillingSummaryResponse {
  configured: boolean;
  portalEnabled: boolean;
  billingPlan: BillingPlan;
  subscriptionStatus: BillingSubscriptionStatus;
  manualProBetaAccessActive?: boolean;
  manualProBetaAccessExpiresAt?: string;
  subscriptionInterval?: BillingInterval;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  billingEmail?: string;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd?: string;
  prices: BillingPriceOption[];
}

export interface MonetizationSummaryResponse {
  pricingPageViews: number;
  upgradePromptViews: number;
  checkoutStarts: number;
  checkoutCompletions: number;
  manualProGrants: number;
  billingPortalOpens: number;
  cancelRequests: number;
  subscriptionCancellations: number;
  activePaidUsers: number;
  pricingToCheckoutStartRate: number;
  pricingToPaidRate: number;
  checkoutCompletionRate: number;
  cancellationRate: number;
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
  preferredUnits?: WeightUnit;
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
  themePreference?:
    | "light"
    | "dawn"
    | "night"
    | "evergreen"
    | "graphite"
    | "ember"
    | "citrus";
  appearanceDensity?: "comfortable" | "compact";
  interfaceScale?: "normal" | "large";
  billingPlan?: BillingPlan;
  productPlan?: ProductPlan;
  entitlements?: UserEntitlements;
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
  manualProBetaAccess?: {
    grantedAt?: Date;
    grantedByUserId?: string;
    grantedByEmail?: string;
    expiresAt?: Date;
    revokedAt?: Date;
    revokedByUserId?: string;
    revokedByEmail?: string;
    paymentCollectionNote?: string;
  };
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
  | "details copied"
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

export interface FeedbackStructuredRepro {
  actualBehavior?: string;
  expectedBehavior?: string;
  reproSteps?: string[];
  affectedFlow?: string;
  triggerConditions?: string;
  regressionRisks?: string;
  source?: "manual" | "inferred" | "recorder";
}

export interface FeedbackImplementationLink {
  type: "route" | "component" | "api" | "hook" | "schema" | "test";
  path: string;
  label?: string;
  note?: string;
}

export interface FeedbackImplementationContext {
  summary?: string;
  confirmed?: FeedbackImplementationLink[];
  inferred?: FeedbackImplementationLink[];
}

export interface FeedbackVerificationItem {
  id: string;
  kind: "command" | "manual" | "done";
  label: string;
  command?: string;
}

export interface FeedbackVerificationPack {
  summary?: string;
  items: FeedbackVerificationItem[];
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
  structuredRepro?: FeedbackStructuredRepro;
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
  structuredRepro?: FeedbackStructuredRepro;
  implementationContext?: FeedbackImplementationContext;
  verificationPack?: FeedbackVerificationPack;
  completedVerificationIds?: string[];
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
