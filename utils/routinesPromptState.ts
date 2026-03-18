export type RoutinesUpgradePromptKey =
  | "assistant_generation"
  | "coach_regeneration"
  | "recurring_schedule"
  | "progression_recommendation"
  | "personal_record_celebration";

export type UpgradePromptDismissalReason = "declined" | "snoozed";

export type UpgradePromptDismissalRecord = {
  reason: UpgradePromptDismissalReason;
  at: string;
};

export type UpgradePromptDismissalMap = Partial<
  Record<RoutinesUpgradePromptKey, UpgradePromptDismissalRecord>
>;

export const ASSISTANT_SETUP_DEFER_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;
export const UPGRADE_PROMPT_DECLINE_COOLDOWN_MS = 3 * 24 * 60 * 60 * 1000;
export const UPGRADE_PROMPT_SNOOZE_COOLDOWN_MS = 24 * 60 * 60 * 1000;

const parseValidDate = (value: unknown) => {
  if (!value) {
    return null;
  }

  const parsed = value instanceof Date ? new Date(value) : new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const normalizeUpgradePromptDismissals = (
  value: unknown
): UpgradePromptDismissalMap => {
  if (!value || typeof value !== "object") {
    return {};
  }

  const candidate = value as Record<string, unknown>;
  const next: UpgradePromptDismissalMap = {};

  (
    [
      "assistant_generation",
      "coach_regeneration",
      "recurring_schedule",
      "progression_recommendation",
      "personal_record_celebration",
    ] as RoutinesUpgradePromptKey[]
  ).forEach((key) => {
    const rawEntry = candidate[key];
    if (!rawEntry || typeof rawEntry !== "object") {
      return;
    }

    const entry = rawEntry as Record<string, unknown>;
    const at = parseValidDate(entry.at);
    const reason =
      entry.reason === "declined" || entry.reason === "snoozed"
        ? entry.reason
        : null;

    if (!at || !reason) {
      return;
    }

    next[key] = {
      reason,
      at: at.toISOString(),
    };
  });

  return next;
};

export const recordUpgradePromptDismissal = ({
  existing,
  key,
  reason,
  now = new Date(),
}: {
  existing: UpgradePromptDismissalMap;
  key: RoutinesUpgradePromptKey;
  reason: UpgradePromptDismissalReason;
  now?: Date;
}): UpgradePromptDismissalMap => ({
  ...existing,
  [key]: {
    reason,
    at: now.toISOString(),
  },
});

export const clearUpgradePromptDismissal = ({
  existing,
  key,
}: {
  existing: UpgradePromptDismissalMap;
  key: RoutinesUpgradePromptKey;
}): UpgradePromptDismissalMap => {
  const next = { ...existing };
  delete next[key];
  return next;
};

export const getUpgradePromptCooldownState = ({
  existing,
  key,
  now = new Date(),
}: {
  existing: UpgradePromptDismissalMap;
  key: RoutinesUpgradePromptKey;
  now?: Date;
}) => {
  const record = existing[key];
  if (!record) {
    return {
      blocked: false,
      remainingMs: 0,
      reminderMode: "modal" as const,
    };
  }

  const dismissedAt = parseValidDate(record.at);
  if (!dismissedAt) {
    return {
      blocked: false,
      remainingMs: 0,
      reminderMode: "modal" as const,
    };
  }

  const cooldownMs =
    record.reason === "snoozed"
      ? UPGRADE_PROMPT_SNOOZE_COOLDOWN_MS
      : UPGRADE_PROMPT_DECLINE_COOLDOWN_MS;
  const remainingMs = dismissedAt.getTime() + cooldownMs - now.getTime();

  if (remainingMs > 0) {
    return {
      blocked: true,
      remainingMs,
      reminderMode: "inline" as const,
      reason: record.reason,
    };
  }

  return {
    blocked: false,
    remainingMs: 0,
    reminderMode: "inline" as const,
    reason: record.reason,
  };
};

export const shouldShowAssistantSetupPromptCard = ({
  setupCompleted,
  assistantSetupDeferredAt,
  now = new Date(),
}: {
  setupCompleted?: boolean | null;
  assistantSetupDeferredAt?: string | Date | null;
  now?: Date;
}) => {
  if (setupCompleted) {
    return false;
  }

  const deferredAt = parseValidDate(assistantSetupDeferredAt);
  if (!deferredAt) {
    return true;
  }

  return now.getTime() - deferredAt.getTime() >= ASSISTANT_SETUP_DEFER_WINDOW_MS;
};
