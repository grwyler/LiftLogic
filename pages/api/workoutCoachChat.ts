import { NextApiRequest, NextApiResponse } from "next";
import OpenAI from "openai";
import {
  buildFallbackCoachReply,
  WorkoutCoachResponse,
} from "../../utils/workoutGeneration";
import { SetupFormValues } from "../../utils/profileSetup";

type ChatTurn = {
  role: "coach" | "user";
  text: string;
};

const isAffirmative = (value: string) =>
  /\b(yes|yeah|yep|sure|ok|okay|please|go ahead|do it)\b/i.test(value);

const assistantAskedToUpdateWorkout = (history: ChatTurn[]) =>
  history
    .slice(-3)
    .some(
      (turn) =>
        turn.role === "coach" &&
        /want me to update the workout|update the workout around/i.test(turn.text)
    );

type CoachAction =
  | { type: "remove_day_schedule"; dayKey: string }
  | { type: "clear_all_schedules" }
  | {
      type: "create_catalog_exercise";
      exercise: {
        name: string;
        type: "weight" | "timed";
        equipment: string[];
        target?: string;
        bodyPart?: string;
        aliases?: string[];
        description?: string;
      };
    }
  | {
      type: "create_recurring_exercise";
      exerciseName: string;
      exerciseType?: "weight" | "timed";
      dayKey?: string;
      recurrenceType?: "daily" | "weekly";
      endDate?: string;
    };

type PreferredDaySwap = {
  fromDay: string;
  toDay: string;
  preferredTrainingDays: string[];
};

const isTimedExerciseName = (name: string) =>
  /\b(run|row|rowing|bike|cycling|walk|jump rope|plank|carry|cardio|yoga|mobility|flow|stretch|elliptical|stair|interval|hold|hang|wall sit|dead hang|hollow hold|support hold)\b/i.test(
    String(name).trim().toLowerCase()
  );

const inferExerciseMetadata = (name: string) => {
  const lower = String(name).trim().toLowerCase();
  const type: "weight" | "timed" = isTimedExerciseName(lower) ? "timed" : "weight";

  if (type === "timed") {
    if (/dead hang|hang|support hold/.test(lower)) {
      return {
        type,
        equipment: ["Pull-Up Bar"],
        target: "lats",
        bodyPart: "pull",
      };
    }

    if (/carry/.test(lower)) {
      return {
        type,
        equipment: /dumbbell/.test(lower)
          ? ["Dumbbells"]
          : /trap bar/.test(lower)
          ? ["Trap Bar"]
          : ["Bodyweight"],
        target: "grip",
        bodyPart: "core",
      };
    }

    if (/plank|dead bug|hollow hold|wall sit/.test(lower)) {
      return {
        type,
        equipment: ["Bodyweight"],
        target: "core",
        bodyPart: "core",
      };
    }

    if (/yoga|stretch|mobility|flow/.test(lower)) {
      return {
        type,
        equipment: ["Bodyweight"],
        target: "mobility",
        bodyPart: "mobility",
      };
    }

    if (/treadmill/.test(lower)) {
      return {
        type,
        equipment: ["Treadmill"],
        target: "conditioning",
        bodyPart: "conditioning",
      };
    }

    if (/bike|cycling/.test(lower)) {
      return {
        type,
        equipment: ["Stationary Bike"],
        target: "conditioning",
        bodyPart: "conditioning",
      };
    }

    if (/row/.test(lower)) {
      return {
        type,
        equipment: ["Rowing Machine"],
        target: "conditioning",
        bodyPart: "conditioning",
      };
    }

    if (/jump rope/.test(lower)) {
      return {
        type,
        equipment: ["Jump Rope"],
        target: "conditioning",
        bodyPart: "conditioning",
      };
    }

    return {
      type,
      equipment: ["Bodyweight"],
      target: "conditioning",
      bodyPart: "conditioning",
    };
  }

  return {
    type,
    equipment: /dumbbell/.test(lower)
      ? ["Dumbbells"]
      : /barbell/.test(lower)
      ? ["Barbell"]
      : /cable/.test(lower)
      ? ["Cable Machine"]
      : /machine|press|curl|extension/.test(lower)
      ? ["Machine"]
      : ["Bodyweight"],
    target: "general",
    bodyPart: "full body",
  };
};

const normalizeCoachAction = (action: CoachAction | null | undefined): CoachAction | null => {
  if (!action) {
    return null;
  }

  if (action.type === "create_catalog_exercise") {
    const inferred = inferExerciseMetadata(action.exercise?.name ?? "");

    return {
      ...action,
      exercise: {
        ...action.exercise,
        type: inferred.type,
        equipment:
          Array.isArray(action.exercise?.equipment) && action.exercise.equipment.length > 0
            ? action.exercise.equipment
            : inferred.equipment,
        target: action.exercise?.target || inferred.target,
        bodyPart: action.exercise?.bodyPart || inferred.bodyPart,
      },
    };
  }

  if (action.type === "create_recurring_exercise") {
    return {
      ...action,
      exerciseType: inferExerciseMetadata(action.exerciseName).type,
    };
  }

  return action;
};

const weekdayTokenMap: Record<string, string> = {
  mon: "Mon",
  monday: "Mon",
  tue: "Tue",
  tues: "Tue",
  tuesday: "Tue",
  wed: "Wed",
  weds: "Wed",
  wednesday: "Wed",
  thu: "Thu",
  thur: "Thu",
  thurs: "Thu",
  thursday: "Thu",
  fri: "Fri",
  friday: "Fri",
  sat: "Sat",
  saturday: "Sat",
  sun: "Sun",
  sunday: "Sun",
};

const weekdayMentionPattern =
  "\\b(mon(?:day)?|tue(?:s|sday)?|wed(?:nesday|s)?|thu(?:r|rs|rsday|rday)?|fri(?:day)?|sat(?:urday)?|sun(?:day)?)\\b";

const normalizeWeekdayToken = (value?: string | null) => {
  if (!value) return null;
  return weekdayTokenMap[String(value).trim().toLowerCase()] ?? null;
};

const extractExplicitDaySwapTargets = (message: string) => {
  const swapTargetPrefixPattern =
    "(?:(?:it|that|this|my\\s+workout|the\\s+workout|training\\s+day|day)\\s+)?";
  const patterns = [
    {
      regex: new RegExp(
        `(?:move|switch|swap|shift|replace)\\s+${swapTargetPrefixPattern}(?:from\\s+)?${weekdayMentionPattern}\\s+(?:to|for|with)\\s+${weekdayMentionPattern}`,
        "i"
      ),
      fromIndex: 1,
      toIndex: 2,
    },
    {
      regex: new RegExp(
        `(?:can't|cannot|unable|not available|won't work|do not work|don't work)\\s+(?:do\\s+)?${weekdayMentionPattern}.*?(?:move|switch|swap|shift)\\s+${swapTargetPrefixPattern}(?:to|for|with)\\s+${weekdayMentionPattern}`,
        "i"
      ),
      fromIndex: 1,
      toIndex: 2,
    },
    {
      regex: new RegExp(
        `${weekdayMentionPattern}.*?(?:can't|cannot|doesn't work|does not work|not available|won't work|do not work|don't work|prefer not|rather not).*?(?:move|switch|swap|shift).+?(?:to|for|with)\\s+${weekdayMentionPattern}`,
        "i"
      ),
      fromIndex: 1,
      toIndex: 2,
    },
    {
      regex: new RegExp(
        `${weekdayMentionPattern}\\s+instead of\\s+${weekdayMentionPattern}`,
        "i"
      ),
      fromIndex: 2,
      toIndex: 1,
    },
  ];

  for (const pattern of patterns) {
    const match = message.match(pattern.regex);
    if (!match) {
      continue;
    }

    const fromDay = normalizeWeekdayToken(match[pattern.fromIndex]);
    const toDay = normalizeWeekdayToken(match[pattern.toIndex]);

    if (fromDay && toDay && fromDay !== toDay) {
      return { fromDay, toDay };
    }
  }

  return null;
};

const extractPreferredDaySwap = (
  message: string,
  profile: SetupFormValues,
  coachResponse: WorkoutCoachResponse
) : PreferredDaySwap | null => {
  const explicitSwap = extractExplicitDaySwapTargets(message);
  if (!explicitSwap) {
    return null;
  }

  const currentDays =
    profile.preferredTrainingDays.length > 0
      ? profile.preferredTrainingDays
      : (coachResponse.planSnapshot ?? [])
          .map((day) => normalizeWeekdayToken(day.dayLabel))
          .filter(Boolean) as string[];

  if (currentDays.length > 0 && !currentDays.includes(explicitSwap.fromDay)) {
    return null;
  }

  const baseDays =
    currentDays.length > 0 ? currentDays : [explicitSwap.fromDay, explicitSwap.toDay];
  const preferredTrainingDays = Array.from(
    new Set(baseDays.map((day) => (day === explicitSwap.fromDay ? explicitSwap.toDay : day)))
  );

  return {
    fromDay: explicitSwap.fromDay,
    toDay: explicitSwap.toDay,
    preferredTrainingDays,
  };
};

const extractUnavailableDays = (
  message: string,
  profile: SetupFormValues,
  coachResponse: WorkoutCoachResponse,
  preferredDaySwap: PreferredDaySwap | null
) => {
  if (preferredDaySwap) {
    return null;
  }

  const normalized = message.toLowerCase();
  if (
    !/(can't|cannot|unable|not available|won't work|doesn't work|does not work|do not work|don't work|don't like|do not like|hate|prefer not|rather not|avoid)/.test(
      normalized
    )
  ) {
    return null;
  }

  const matchedDays =
    normalized.match(new RegExp(weekdayMentionPattern, "g")) ?? [];

  const unavailableDays = Array.from(
    new Set(
      matchedDays
        .map((day) => normalizeWeekdayToken(day))
        .filter(Boolean) as string[]
    )
  );

  if (unavailableDays.length === 0) {
    return null;
  }

  const currentDays =
    profile.preferredTrainingDays.length > 0
      ? profile.preferredTrainingDays
      : (coachResponse.planSnapshot ?? [])
          .map((day) => normalizeWeekdayToken(day.dayLabel))
          .filter(Boolean) as string[];

  const remainingCurrentDays = currentDays.filter(
    (day) => !unavailableDays.includes(day)
  );
  const fallbackDays = Object.values(weekdayTokenMap).filter(
    (day, index, array) =>
      array.indexOf(day) === index &&
      !unavailableDays.includes(day) &&
      !remainingCurrentDays.includes(day)
  );

  const targetCount = Math.max(
    2,
    Math.min(6, Number(profile.workoutDaysPerWeek || currentDays.length || 3))
  );
  const preferredTrainingDays = [...remainingCurrentDays, ...fallbackDays].slice(
    0,
    targetCount
  );

  if (preferredTrainingDays.length === 0) {
    return null;
  }

  return { unavailableDays, preferredTrainingDays };
};

const askCoachWithAI = async ({
  message,
  history,
  profile,
  coachResponse,
}: {
  message: string;
  history: ChatTurn[];
  profile: SetupFormValues;
  coachResponse: WorkoutCoachResponse;
}) => {
  const gatewayKey = process.env.AI_GATEWAY_API_KEY;
  const openAIKey = process.env.OPENAI_API_KEY;

  if (!gatewayKey && !openAIKey) {
    return null;
  }

  const client = new OpenAI(
    gatewayKey
      ? {
          apiKey: gatewayKey,
          baseURL: "https://ai-gateway.vercel.sh/v1",
        }
      : {
          apiKey: openAIKey!,
        }
  );

  const model = gatewayKey
    ? process.env.WORKOUT_COACH_MODEL || process.env.WORKOUT_PLAN_MODEL || "openai/gpt-5-mini"
    : process.env.WORKOUT_COACH_MODEL || process.env.WORKOUT_PLAN_MODEL || "gpt-4.1-mini";

  const recentHistory = history.slice(-6).map((turn) => ({
    role: turn.role === "coach" ? "assistant" : "user",
    content: turn.text,
  })) as Array<{ role: "assistant" | "user"; content: string }>;

  const completion = await client.chat.completions.create({
    model,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You are the Lift Logic workout assistant. Explain plans like a calm, practical assistant. Return only JSON with keys reply, suggestedReplies, profilePatch, shouldRegeneratePlan, and action. reply should be 2-5 short sentences. suggestedReplies should be 2-4 short follow-up prompts. If the user changes training constraints like equipment, preferred training days, available dumbbell weight, goal, workout days, or workout length, include a profilePatch and set shouldRegeneratePlan true. If the user asks to move a workout from one weekday to another, update preferredTrainingDays to reflect that change and clearly say you handled it. If the user asks what plan or split would fit them best, and profile context is already enough to draft one, set shouldRegeneratePlan true even if profilePatch is empty. If the user wants a scheduled day removed, return action {\"type\":\"remove_day_schedule\",\"dayKey\":\"monday\"}. If the user wants the whole schedule cleared, return action {\"type\":\"clear_all_schedules\"}. If the user wants a recurring exercise added to the calendar, return action {\"type\":\"create_recurring_exercise\",\"exerciseName\":\"Squat\",\"dayKey\":\"monday\",\"recurrenceType\":\"weekly\",\"endDate\":\"2026-03-31\"}. If the user wants a new trackable exercise added to the app, return action {\"type\":\"create_catalog_exercise\",\"exercise\":{...}} with a simple useful exercise shape. Static holds, hangs, carries, planks, and similar duration-based movements should be typed as \"timed\", not \"weight\".",
      },
      {
        role: "user",
        content: JSON.stringify({
          profile,
          coachResponse,
          recentHistory,
          latestUserMessage: message,
        }),
      },
    ],
  });

  const content = completion.choices[0]?.message?.content ?? "{}";
  return JSON.parse(content) as {
    reply?: string;
    suggestedReplies?: string[];
    profilePatch?: Partial<SetupFormValues>;
    shouldRegeneratePlan?: boolean;
    action?: CoachAction;
  };
};

const extractFallbackPatch = (
  message: string,
  profile: SetupFormValues,
  coachResponse: WorkoutCoachResponse
) => {
  const normalized = message.toLowerCase();
  const patch: Partial<SetupFormValues> = {};
  const preferredDaySwap = extractPreferredDaySwap(message, profile, coachResponse);
  const unavailableDays = extractUnavailableDays(
    message,
    profile,
    coachResponse,
    preferredDaySwap
  );

  if (unavailableDays) {
    patch.preferredTrainingDays = unavailableDays.preferredTrainingDays;
  } else if (preferredDaySwap) {
    patch.preferredTrainingDays = preferredDaySwap.preferredTrainingDays;
  }

  const dumbbellMatch =
    normalized.match(/(\d+)\s*(lb|lbs|pound|pounds|kg|kgs|kilogram|kilograms)\s+dumbbell/) ||
    normalized.match(/only have\s+(\d+)\s*(lb|lbs|pound|pounds|kg|kgs|kilogram|kilograms)/);

  if (dumbbellMatch) {
    patch.maxDumbbellWeight = dumbbellMatch[1];
    patch.equipmentAccess = Array.from(
      new Set(["Dumbbells", "Bodyweight only", ...(profile.equipmentAccess ?? [])])
    ).filter((item) => item !== "Full gym" && item !== "Barbell" && item !== "Machines");
  }

  if (/only have dumbbells|dumbbells only/.test(normalized)) {
    patch.equipmentAccess = ["Dumbbells", "Bodyweight only"];
  }

  const daysMatch =
    normalized.match(/(\d+)\s+days?\s+(per week|a week)/) ||
    normalized.match(/(\d+)[-\s]?day\s+split/) ||
    normalized.match(/split\s+for\s+(\d+)\s+days?/);
  if (daysMatch) {
    patch.workoutDaysPerWeek = daysMatch[1];
  }

  const minuteMatch = normalized.match(/(\d+)\s*(minute|min)\s+workout/);
  if (minuteMatch) {
    patch.workoutLength = minuteMatch[1];
  }

  if (/strength/.test(normalized)) patch.trainingGoal = "strength";
  if (/muscle|hypertrophy/.test(normalized)) patch.trainingGoal = "muscle";
  if (/fat loss|lose fat/.test(normalized)) patch.trainingGoal = "fat_loss";
  if (/recomp|recomposition/.test(normalized)) patch.trainingGoal = "recomp";
  if (/general fitness/.test(normalized)) patch.trainingGoal = "general_fitness";
  if (/athletic|athleticism|sport/.test(normalized)) patch.trainingGoal = "athleticism";
  if (/conditioning|cardio|endurance/.test(normalized)) patch.trainingGoal = "conditioning";
  if (
    /progressive overload|compound lifts?|compound exercises?|big lifts?/.test(
      normalized
    ) &&
    !patch.trainingGoal
  ) {
    patch.trainingGoal = "strength";
  }

  const explicitRebuildRequest = /(?:make|build|create|generate|give)\s+me\b/.test(
    normalized
  ) && /split|plan|program|workout/.test(normalized);
  const bestFitPlanRequest =
    /what\s+(?:plan|split|program)\s+(?:would|will)\s+fit\s+me\s+best/.test(
      normalized
    ) ||
    /what\s+would\s+fit\s+me\s+best/.test(normalized);

  return {
    patch,
    shouldRegeneratePlan:
      explicitRebuildRequest || bestFitPlanRequest || Object.keys(patch).length > 0,
    preferredDaySwap,
    unavailableDays,
  };
};

const extractFallbackAction = (message: string): CoachAction | null => {
  const normalized = message.toLowerCase().trim();

  if (
    /(?:remove|delete|unschedule|clear|cancel)\s+(?:all|everything|all exercises|the schedule|my schedule|all workouts|all scheduled exercises)/.test(
      normalized
    )
  ) {
    return { type: "clear_all_schedules" };
  }

  const removeMatch =
    normalized.match(/(?:remove|delete|unschedule|clear)\s+(?:the\s+)?(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/) ||
    normalized.match(/(?:remove|delete|unschedule|clear)\s+(?:my\s+)?(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\s+workout/);

  if (removeMatch) {
    return {
      type: "remove_day_schedule",
      dayKey: removeMatch[1],
    };
  }

  const scheduleMatch =
    normalized.match(
      /(?:add|schedule|put|track|log|include)\s+(.+?)\s+on\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)(.*)/
    ) ??
    normalized.match(
      /(?:every|each)\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)(?:.*)\s+(?:add|schedule|put|track|log)\s+(.+)/
    );

  if (scheduleMatch) {
    const rawExerciseName = (scheduleMatch[2] ? scheduleMatch[1] : scheduleMatch[2]) ?? "";
    const rawDayKey = (scheduleMatch[2] ? scheduleMatch[2] : scheduleMatch[1]) ?? "";
    const trailingText = (scheduleMatch[3] ?? "").trim();
    const cleanedName = rawExerciseName
      .replace(/\s+(for me|please)$/i, "")
      .replace(/\s+/g, " ")
      .trim();

    if (cleanedName && rawDayKey) {
      const now = new Date();
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      const endDate = /\bthis month\b/.test(trailingText)
        ? `${endOfMonth.getFullYear()}-${String(endOfMonth.getMonth() + 1).padStart(
            2,
            "0"
          )}-${String(endOfMonth.getDate()).padStart(2, "0")}`
        : undefined;
      const lowerName = cleanedName.toLowerCase();

      return {
        type: "create_recurring_exercise",
        exerciseName: cleanedName.replace(/\b\w/g, (char) => char.toUpperCase()),
        exerciseType: inferExerciseMetadata(cleanedName).type,
        dayKey: rawDayKey,
        recurrenceType: "weekly",
        endDate,
      };
    }
  }

  const addExerciseMatch =
    normalized.match(/(?:add|track|include|create)\s+(?:an?\s+)?exercise\s+(?:called\s+)?(.+)/) ||
    normalized.match(/(?:add|track|include|create)\s+(.+?)\s+(?:to the library|to the app|as an exercise)/);

  if (addExerciseMatch) {
    const rawName = addExerciseMatch[1]
      .replace(/\s+(for me|please)$/i, "")
      .replace(/\s+/g, " ")
      .trim();

    if (rawName) {
      const titleCased = rawName.replace(/\b\w/g, (char) => char.toUpperCase());
      const lower = rawName.toLowerCase();

      const inferred = inferExerciseMetadata(rawName);

      return {
        type: "create_catalog_exercise",
        exercise: {
          name: titleCased,
          type: inferred.type,
          equipment: inferred.equipment,
          target: inferred.target,
          bodyPart: inferred.bodyPart,
          aliases: [],
          description: `Added by Lift Logic workout assistant from user request: ${titleCased}.`,
        },
      };
    }
  }

  return null;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  try {
    const {
      message,
      history = [],
      profile,
      coachResponse,
    } = req.body as {
      message?: string;
      history?: ChatTurn[];
      profile?: SetupFormValues;
      coachResponse?: WorkoutCoachResponse;
    };

    if (!message?.trim() || !profile || !coachResponse) {
      return res
        .status(400)
        .json({ message: "message, profile, and coachResponse are required" });
    }

    if (assistantAskedToUpdateWorkout(history) && isAffirmative(message)) {
      return res.status(200).json({
        reply:
          "Yeah. Tell me what equipment you do have available and I can update the workout around that.",
        suggestedReplies: [
          "I have dumbbells and a bench",
          "I have a full gym",
          "Bodyweight and bands only",
        ],
        profilePatch: {},
        shouldRegeneratePlan: false,
        action: null,
        source: "fallback",
      });
    }

    const extracted = extractFallbackPatch(message, profile, coachResponse);
    if (extracted.unavailableDays) {
      return res.status(200).json({
        reply: `Yeah, I removed ${extracted.unavailableDays.unavailableDays.join(
          " and "
        )} from your training days and rebuilt the schedule around the days you can actually train.`,
        suggestedReplies: [
          "Can you show me the updated week?",
          "Can you shorten one of the days?",
          "Can I swap an exercise too?",
        ],
        profilePatch: extracted.patch,
        shouldRegeneratePlan: true,
        action: null,
        source: "fallback",
      });
    }

    if (extracted.preferredDaySwap) {
      return res.status(200).json({
        reply: `Yeah, I switched that from ${extracted.preferredDaySwap.fromDay} to ${extracted.preferredDaySwap.toDay}.`,
        suggestedReplies: [
          "Can you show me the updated week?",
          "Can you shorten one of the days?",
          "Can I swap an exercise too?",
        ],
        profilePatch: extracted.patch,
        shouldRegeneratePlan: true,
        action: null,
        source: "fallback",
      });
    }

    if (extracted.shouldRegeneratePlan && Object.keys(extracted.patch).length === 0) {
      return res.status(200).json({
        reply:
          "I’m building that plan now and I’ll map it onto your current schedule so you have something concrete to start with.",
        suggestedReplies: [
          "Can you walk me through the week?",
          "Can you keep the workouts shorter?",
          "Can you make it more beginner friendly?",
        ],
        profilePatch: {},
        shouldRegeneratePlan: true,
        action: null,
        source: "fallback",
      });
    }

    if (extracted.shouldRegeneratePlan && Object.keys(extracted.patch).length > 0) {
      return res.status(200).json({
        reply:
          "I updated your setup from that request and I’m rebuilding the weekly plan so it actually matches what you asked for.",
        suggestedReplies: [
          "Can you walk me through the new week?",
          "Can you make one day shorter?",
          "Can I swap an exercise?",
        ],
        profilePatch: extracted.patch,
        shouldRegeneratePlan: true,
        action: null,
        source: "fallback",
      });
    }

    const directAction = extractFallbackAction(message);
    if (directAction?.type === "clear_all_schedules") {
      return res.status(200).json({
        reply:
          "I cleared the current scheduled workouts, so your calendar should be blank again.",
        suggestedReplies: [
          "Build me a new split instead",
          "Actually just remove Friday",
          "Can you show me an easier week?",
        ],
        profilePatch: {},
        shouldRegeneratePlan: false,
        action: normalizeCoachAction(directAction),
        source: "fallback",
      });
    }

    if (directAction?.type === "remove_day_schedule") {
      const dayLabel =
        directAction.dayKey.charAt(0).toUpperCase() + directAction.dayKey.slice(1);
      return res.status(200).json({
        reply: `I cleared the scheduled workout on ${dayLabel}.`,
        suggestedReplies: [
          "Can you move it to Wednesday instead?",
          "Show me the updated week",
          "Build me a new split instead",
        ],
        profilePatch: {},
        shouldRegeneratePlan: false,
        action: normalizeCoachAction(directAction),
        source: "fallback",
      });
    }

    if (directAction?.type === "create_recurring_exercise") {
      return res.status(200).json({
        reply: `I added ${directAction.exerciseName} to ${
          directAction.dayKey
        } and put it on the calendar${
          directAction.endDate ? " for the rest of this month" : ""
        }.`,
        suggestedReplies: [
          "Can you add another day too?",
          "Can you make that bodyweight instead?",
          "Show me what is on the calendar now",
        ],
        profilePatch: {},
        shouldRegeneratePlan: false,
        action: normalizeCoachAction(directAction),
        source: "fallback",
      });
    }

    if (directAction?.type === "create_catalog_exercise") {
      return res.status(200).json({
        reply: `I added ${directAction.exercise.name} to your exercise library so it is available in the app.`,
        suggestedReplies: [
          "Can you schedule it too?",
          "Make it a timed exercise instead",
          "Show me what it should replace",
        ],
        profilePatch: {},
        shouldRegeneratePlan: false,
        action: normalizeCoachAction(directAction),
        source: "fallback",
      });
    }

    try {
      const aiReply = await askCoachWithAI({
        message,
        history,
        profile,
        coachResponse,
      });

      if (aiReply?.reply) {
        return res.status(200).json({
          reply: aiReply.reply,
          suggestedReplies:
            Array.isArray(aiReply.suggestedReplies) && aiReply.suggestedReplies.length > 0
              ? aiReply.suggestedReplies
              : coachResponse.suggestedReplies,
          profilePatch: aiReply.profilePatch ?? {},
          shouldRegeneratePlan: Boolean(aiReply.shouldRegeneratePlan),
          action: normalizeCoachAction(aiReply.action ?? null),
          source: "ai",
        });
      }
    } catch (error) {
      console.error("workoutCoachChat AI fallback triggered:", error);
    }

    const fallback = buildFallbackCoachReply({
      message,
      profile,
      coachResponse,
    });
    const fallbackReply = extracted.preferredDaySwap
      ? {
          reply: `Yeah, I switched that from ${extracted.preferredDaySwap.fromDay} to ${extracted.preferredDaySwap.toDay} and rebuilt the schedule around it.`,
          suggestedReplies: [
            "Can you show me the updated week?",
            "Can you shorten one of the days?",
            "Can I swap an exercise too?",
          ],
        }
      : fallback;

    return res.status(200).json({
      ...fallbackReply,
      profilePatch: extracted.patch,
      shouldRegeneratePlan: extracted.shouldRegeneratePlan,
      action: null,
      source: "fallback",
    });
  } catch (error) {
    console.error("workoutCoachChat error:", error);
    return res.status(500).json({ message: "Failed to chat with coach" });
  }
}
