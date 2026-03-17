import { ReminderPreferences, WorkoutEntryDoc } from "./types";

export const REMINDER_WEEKDAY_OPTIONS = [
  "Sun",
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
] as const;

const sanitizeText = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

const normalizeTime = (value: unknown, fallback = "") => {
  const candidate = sanitizeText(value);
  return /^\d{2}:\d{2}$/.test(candidate) ? candidate : fallback;
};

const normalizePositiveInteger = (value: unknown, fallback: number) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.max(1, Math.min(14, Math.round(parsed)));
};

export const normalizeReminderPreferences = (
  value: unknown,
  fallbackTimezone = "UTC"
): ReminderPreferences => {
  const candidate = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const scheduledWorkoutReminderDays = Array.isArray(candidate.scheduledWorkoutReminderDays)
    ? candidate.scheduledWorkoutReminderDays
        .map((entry) => sanitizeText(entry))
        .filter((entry): entry is (typeof REMINDER_WEEKDAY_OPTIONS)[number] =>
          REMINDER_WEEKDAY_OPTIONS.includes(entry as (typeof REMINDER_WEEKDAY_OPTIONS)[number])
        )
    : [];

  return {
    enabled: Boolean(candidate.enabled),
    scheduledWorkoutRemindersEnabled: Boolean(candidate.scheduledWorkoutRemindersEnabled),
    scheduledWorkoutReminderTime: normalizeTime(
      candidate.scheduledWorkoutReminderTime,
      "18:00"
    ),
    scheduledWorkoutReminderDays,
    quietHoursStart: normalizeTime(candidate.quietHoursStart),
    quietHoursEnd: normalizeTime(candidate.quietHoursEnd),
    comebackNudgesEnabled: Boolean(candidate.comebackNudgesEnabled),
    comebackThresholdDays: normalizePositiveInteger(
      candidate.comebackThresholdDays,
      4
    ),
    timezone: sanitizeText(candidate.timezone) || fallbackTimezone,
    deliveryChannel: "in_app",
  };
};

const parseTimeToMinutes = (value?: string) => {
  if (!value || !/^\d{2}:\d{2}$/.test(value)) {
    return null;
  }

  const [hour, minute] = value.split(":").map((part) => Number(part));
  return hour * 60 + minute;
};

const getLocalTimeParts = (value: Date, timezone: string) => {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(value).reduce<Record<string, string>>(
    (accumulator, part) => {
      if (part.type !== "literal") {
        accumulator[part.type] = part.value;
      }
      return accumulator;
    },
    {}
  );

  return {
    weekday: parts.weekday || "",
    time: `${parts.hour || "00"}:${parts.minute || "00"}`,
    minuteOfDay:
      Number(parts.hour || 0) * 60 + Number(parts.minute || 0),
  };
};

export const isWithinQuietHours = ({
  now,
  preferences,
}: {
  now: Date;
  preferences: ReminderPreferences;
}) => {
  const start = parseTimeToMinutes(preferences.quietHoursStart);
  const end = parseTimeToMinutes(preferences.quietHoursEnd);

  if (start === null || end === null) {
    return false;
  }

  const local = getLocalTimeParts(now, preferences.timezone || "UTC");
  const minuteOfDay = local.minuteOfDay;

  if (start === end) {
    return false;
  }

  if (start < end) {
    return minuteOfDay >= start && minuteOfDay < end;
  }

  return minuteOfDay >= start || minuteOfDay < end;
};

export const getMostRecentCompletedWorkoutAt = (entries: WorkoutEntryDoc[]) => {
  const timestamps = entries
    .filter((entry) => entry.complete && !entry.skipped && entry.date)
    .map((entry) => new Date(entry.date).getTime())
    .filter((value) => Number.isFinite(value));

  if (timestamps.length === 0) {
    return null;
  }

  return new Date(Math.max(...timestamps));
};

export const hasRecentWorkoutCompletion = ({
  entries,
  now,
  withinHours = 18,
}: {
  entries: WorkoutEntryDoc[];
  now: Date;
  withinHours?: number;
}) => {
  const latest = getMostRecentCompletedWorkoutAt(entries);
  if (!latest) {
    return false;
  }

  return now.getTime() - latest.getTime() < withinHours * 60 * 60 * 1000;
};

export const shouldDeliverScheduledWorkoutReminder = ({
  preferences,
  entries,
  now,
}: {
  preferences: ReminderPreferences;
  entries: WorkoutEntryDoc[];
  now: Date;
}) => {
  if (!preferences.enabled || !preferences.scheduledWorkoutRemindersEnabled) {
    return false;
  }

  if (isWithinQuietHours({ now, preferences })) {
    return false;
  }

  if (hasRecentWorkoutCompletion({ entries, now })) {
    return false;
  }

  const local = getLocalTimeParts(now, preferences.timezone || "UTC");
  const scheduledTime = preferences.scheduledWorkoutReminderTime || "18:00";

  return (
    preferences.scheduledWorkoutReminderDays?.includes(local.weekday) &&
    local.time === scheduledTime
  );
};

export const shouldDeliverComebackNudge = ({
  preferences,
  entries,
  now,
}: {
  preferences: ReminderPreferences;
  entries: WorkoutEntryDoc[];
  now: Date;
}) => {
  if (!preferences.enabled || !preferences.comebackNudgesEnabled) {
    return false;
  }

  if (isWithinQuietHours({ now, preferences })) {
    return false;
  }

  if (hasRecentWorkoutCompletion({ entries, now, withinHours: 24 })) {
    return false;
  }

  const latest = getMostRecentCompletedWorkoutAt(entries);
  if (!latest) {
    return true;
  }

  const daysSinceLastWorkout =
    (now.getTime() - latest.getTime()) / (24 * 60 * 60 * 1000);

  return daysSinceLastWorkout >= (preferences.comebackThresholdDays || 4);
};

export const buildReminderLocalDateKey = (value: Date, timezone: string) => {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return formatter.format(value);
};
