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
  exerciseName?: string;
  exerciseType?: "timed" | "weight";
  defaultMax?: number;
  defaultRest?: number;
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
  requestIdempotencyKey?: string;
  lastKnownUpdatedAt?: Date | string;
  lastRequestIdempotencyKey?: string;
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

export interface WorkoutExerciseView {
  name: string;
  type: "timed" | "weight";
  weightUnit?: WeightUnit;
  max?: number;
  rest: number;
  complete: boolean;
  sets: ExerciseSet[];
  _id?: string;
  userId?: string;
  date?: Date | string;
  entryInstanceId?: string;
  exerciseId?: ObjectId | string;
  sortOrder?: number;
  isRepeating?: boolean;
  recurrenceType?: RecurringRuleDoc["recurrenceType"];
  interval?: number;
  intervalWeeks?: number;
  dayOfWeek?: number;
  daysOfWeek?: number[];
  dayOfMonth?: number;
  endDate?: Date | string;
  ruleId?: string | null;
  routineName: string;
}

export interface WorkoutEntryApiRequest {
  entry: WorkoutEntryDoc;
}

export interface WorkoutEntryApiResponse {
  message: string;
  entryId: string;
  entryInstanceId?: string;
  updatedAt?: Date | string;
  deduped?: boolean;
  conflict?: boolean;
  queued?: boolean;
  queueLength?: number;
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
  upgradePromptClicks: number;
  checkoutStarts: number;
  checkoutCompletions: number;
  manualProGrants: number;
  weeklyProBriefViews: number;
  billingPortalOpens: number;
  cancelRequests: number;
  subscriptionCancellations: number;
  activePaidUsers: number;
  pricingToCheckoutStartRate: number;
  pricingToPaidRate: number;
  checkoutCompletionRate: number;
  cancellationRate: number;
  anonymousStage?: {
    landingPageViews: number;
    pricingPageViews: number;
    upgradePromptViews: number;
    upgradePromptClicks: number;
    checkoutStarts: number;
    weeklyProBriefViews: number;
  };
  authenticatedStage?: {
    pricingPageViews: number;
    upgradePromptViews: number;
    upgradePromptClicks: number;
    checkoutStarts: number;
    weeklyProBriefViews: number;
  };
  sourceBreakdown?: {
    landingPageViews: Record<string, number>;
    landingCtas: Record<string, number>;
    pricingPageViews: Record<string, number>;
    pricingCtas: Record<string, number>;
    upgradePromptViews: Record<string, number>;
    upgradePromptClicks: Record<string, number>;
    checkoutStarts: Record<string, number>;
    weeklyProBriefViews: Record<string, number>;
  };
}

export type ObservabilityEventKind =
  | "client_error"
  | "route_performance"
  | "workout_save_failure"
  | "checkout_failure"
  | "checkout_success";

export type ObservabilityEventStatus =
  | "info"
  | "warning"
  | "failure"
  | "success";

export interface ObservabilityEventDoc {
  _id?: ObjectId;
  kind: ObservabilityEventKind;
  status: ObservabilityEventStatus;
  fingerprint?: string;
  route?: string;
  source?: string;
  message?: string;
  environment?: string;
  releaseVersion?: string;
  commitSha?: string;
  userId?: string;
  durationMs?: number;
  metadata?: Record<string, unknown>;
  createdAt?: Date;
}

export interface ObservabilityAlertDoc {
  _id?: ObjectId;
  kind: ObservabilityEventKind;
  fingerprint: string;
  route?: string;
  message?: string;
  count: number;
  status: "open" | "resolved";
  firstTriggeredAt: Date;
  lastTriggeredAt: Date;
  latestEventAt: Date;
}

export type ReminderDeliveryChannel = "in_app";

export interface ReminderPreferences {
  enabled?: boolean;
  scheduledWorkoutRemindersEnabled?: boolean;
  scheduledWorkoutReminderTime?: string;
  scheduledWorkoutReminderDays?: string[];
  quietHoursStart?: string;
  quietHoursEnd?: string;
  comebackNudgesEnabled?: boolean;
  comebackThresholdDays?: number;
  timezone?: string;
  deliveryChannel?: ReminderDeliveryChannel;
}

export interface ReminderDeliveryDoc {
  _id?: ObjectId;
  userId: string;
  kind: "scheduled_workout" | "comeback_nudge";
  reminderKey: string;
  title: string;
  message: string;
  route?: string;
  deliveryChannel: ReminderDeliveryChannel;
  scheduledForLocal?: string;
  timezone?: string;
  deliveredAt: Date;
  openedAt?: Date;
  readAt?: Date;
  postReminderWorkoutStartedAt?: Date;
  postReminderWorkoutEntryId?: string;
  metadata?: Record<string, unknown>;
}

export interface UserDoc {
  _id?: ObjectId;
  username: string;
  email?: string;
  name?: string;
  roles?: string[];
  permissions?: {
    bugWorkflowAdmin?: boolean;
    foundingBetaAdmin?: boolean;
  };
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
  reminderPreferences?: ReminderPreferences;
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

export type FeedbackRegressionOutcome =
  | "passed"
  | "failed"
  | "not_applicable"
  | "pending";

export interface FeedbackRegressionCheck {
  label: string;
  outcome: FeedbackRegressionOutcome;
  notes?: string;
}

export interface FeedbackResolutionMetadata {
  validatedCommands?: string[];
  manualChecks?: string[];
  verificationOwner?: string;
  resolvedAppVersion?: string;
  resolvedDeployId?: string;
  shippedSummary?: string;
  deferredFollowUps?: string[];
  regressionChecklist?: FeedbackRegressionCheck[];
}

export type FeedbackBugArchetype =
  | "general"
  | "ui"
  | "api"
  | "performance"
  | "refactor";

export interface FeedbackBugContextUi {
  selectors?: string[];
  screenshotUrls?: string[];
  viewports?: string[];
}

export interface FeedbackBugContextApi {
  endpoint?: string;
  method?: string;
  requestShape?: string;
  responseShape?: string;
  schemaPaths?: string[];
}

export interface FeedbackBugContextPerformance {
  benchmark?: string;
  metric?: string;
  baseline?: string;
  regression?: string;
  deviceContext?: string;
}

export interface FeedbackBugContextRefactor {
  touchedSystems?: string[];
  contractSurfaces?: string[];
  migrationRisks?: string[];
}

export interface FeedbackBugContext {
  ui?: FeedbackBugContextUi;
  api?: FeedbackBugContextApi;
  performance?: FeedbackBugContextPerformance;
  refactor?: FeedbackBugContextRefactor;
}

export interface FeedbackScopeGuardrails {
  inScope?: string[];
  outOfScope?: string[];
  nonGoals?: string[];
  allowedTouchAreas?: string[];
}

export interface FeedbackFollowUpItem {
  title: string;
  type?: "bug" | "feature";
  status?: "proposed" | "tracked" | "resolved";
  notes?: string;
  workItemId?: ObjectId | string;
  createdAt?: Date | string;
}

export interface FeedbackDerivedCommit {
  sha: string;
  summary: string;
  file?: string;
}

export interface FeedbackDerivedContext {
  likelyFilePaths?: string[];
  ownershipHints?: string[];
  stackClues?: string[];
  runtimeProvenance?: string[];
  recentCommits?: FeedbackDerivedCommit[];
  openQuestions?: string[];
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
  type: "route" | "schema" | "api" | "hook" | "component" | "test";
  path: string;
  label?: string;
  note?: string;
}

export interface FeedbackImplementationContext {
  summary?: string;
  confirmed?: FeedbackImplementationLink[];
  inferred?: FeedbackImplementationLink[];
  derived?: FeedbackDerivedContext;
}

export interface FeedbackVerificationItem {
  id: string;
  kind: "command" | "manual" | "acceptance" | "done";
  label: string;
  command?: string;
}

export interface FeedbackVerificationPack {
  summary?: string;
  items?: FeedbackVerificationItem[];
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
  bugArchetype?: FeedbackBugArchetype;
  bugContext?: FeedbackBugContext;
  scopeGuardrails?: FeedbackScopeGuardrails;
  parentWorkItemId?: ObjectId | string;
  fingerprint?: string;
  workItemId?: ObjectId | string;
  notificationStatus?: FeedbackNotificationStatus;
  lastNotificationError?: string;
  fixThreadId?: string;
  fixCommitSha?: string;
  resolution?: FeedbackResolutionMetadata;
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
  labels?: string[];
  page?: string;
  severity?: "low" | "medium" | "high";
  deviceType?: FeedbackDeviceType;
  latestRuntimeContext?: FeedbackRuntimeContext;
  structuredRepro?: FeedbackStructuredRepro;
  implementationContext?: FeedbackImplementationContext;
  verificationPack?: FeedbackVerificationPack;
  completedVerificationIds?: string[];
  bugArchetype?: FeedbackBugArchetype;
  bugContext?: FeedbackBugContext;
  scopeGuardrails?: FeedbackScopeGuardrails;
  followUps?: FeedbackFollowUpItem[];
  parentWorkItemId?: ObjectId | string;
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
  resolution?: FeedbackResolutionMetadata;
  resolvedAt?: Date | string;
  firstReportedAt?: Date;
  lastReportedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface RecurringRuleApiRequest {
  rule: {
    _id?: ObjectId | string;
    userId: string;
    exerciseId: ObjectId | string;
    exerciseName: string;
    exerciseType: "weight" | "timed";
    routineName: string;
    sortOrder?: number;
    recurrenceType?: "daily" | "weekly" | "custom" | "monthly";
    interval?: number;
    daysOfWeek?: number[];
    dayOfWeek?: number;
    dayOfMonth?: number;
    intervalWeeks?: number;
    startDate: Date | string;
    endDate?: Date | string;
    templateSets?: ExerciseSet[];
    defaultMax?: number;
    defaultRest?: number;
    active?: boolean;
  };
}

export interface RecurringRuleApiResponse {
  rule: RecurringRuleDoc | (RecurringRuleDoc & { _id?: ObjectId | string });
}
