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

type CoachAction =
  | { type: "remove_day_schedule"; dayKey: string }
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

const normalizeWeekdayToken = (value?: string | null) => {
  if (!value) return null;
  return weekdayTokenMap[String(value).trim().toLowerCase()] ?? null;
};

const extractPreferredDaySwap = (
  message: string,
  profile: SetupFormValues,
  coachResponse: WorkoutCoachResponse
) => {
  const normalized = message.toLowerCase();
  const matchedDays =
    normalized.match(
      /\b(mon(?:day)?|tue(?:s|sday)?|wed(?:nesday|s)?|thu(?:r|rs|rsday|rday)?|fri(?:day)?|sat(?:urday)?|sun(?:day)?)\b/g
    ) ?? [];

  const days = Array.from(
    new Set(
      matchedDays
        .map((day) => normalizeWeekdayToken(day))
        .filter(Boolean) as string[]
    )
  );

  if (days.length < 2) {
    return null;
  }

  const currentDays =
    profile.preferredTrainingDays.length > 0
      ? profile.preferredTrainingDays
      : (coachResponse.planSnapshot ?? [])
          .map((day) => normalizeWeekdayToken(day.dayLabel))
          .filter(Boolean) as string[];

  const fromDay = days.find((day) => currentDays.includes(day)) ?? days[0];
  const toDay = days.find((day) => day !== fromDay) ?? days[1];

  if (!fromDay || !toDay || fromDay === toDay) {
    return null;
  }

  const baseDays = currentDays.length > 0 ? currentDays : days;
  const preferredTrainingDays = Array.from(
    new Set(baseDays.map((day) => (day === fromDay ? toDay : day)))
  );

  return { fromDay, toDay, preferredTrainingDays };
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
          "You are the Lift Logic workout assistant. Explain plans like a calm, practical assistant. Return only JSON with keys reply, suggestedReplies, profilePatch, shouldRegeneratePlan, and action. reply should be 2-5 short sentences. suggestedReplies should be 2-4 short follow-up prompts. If the user changes training constraints like equipment, preferred training days, available dumbbell weight, goal, workout days, or workout length, include a profilePatch and set shouldRegeneratePlan true. If the user asks to move a workout from one weekday to another, update preferredTrainingDays to reflect that change and clearly say you handled it. If the user wants a scheduled day removed, return action {\"type\":\"remove_day_schedule\",\"dayKey\":\"monday\"}. If the user wants a new trackable exercise added to the app, return action {\"type\":\"create_catalog_exercise\",\"exercise\":{...}} with a simple useful exercise shape.",
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

  if (preferredDaySwap) {
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

  const daysMatch = normalized.match(/(\d+)\s+days?\s+(per week|a week)/);
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

  return {
    patch,
    shouldRegeneratePlan: Object.keys(patch).length > 0,
    preferredDaySwap,
  };
};

const extractFallbackAction = (message: string): CoachAction | null => {
  const normalized = message.toLowerCase().trim();

  const removeMatch =
    normalized.match(/(?:remove|delete|unschedule|clear)\s+(?:the\s+)?(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/) ||
    normalized.match(/(?:remove|delete|unschedule|clear)\s+(?:my\s+)?(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\s+workout/);

  if (removeMatch) {
    return {
      type: "remove_day_schedule",
      dayKey: removeMatch[1],
    };
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

      const type: "weight" | "timed" =
        /run|rowing|cycling|bike|jump rope|plank|yoga|walk|elliptical|stair/.test(lower)
          ? "timed"
          : "weight";

      const equipment =
        type === "timed"
          ? /treadmill/.test(lower)
            ? ["Treadmill"]
            : /bike|cycling/.test(lower)
            ? ["Stationary Bike"]
            : /row/.test(lower)
            ? ["Rowing Machine"]
            : /jump rope/.test(lower)
            ? ["Jump Rope"]
            : ["Bodyweight"]
          : /dumbbell/.test(lower)
          ? ["Dumbbells"]
          : /barbell/.test(lower)
          ? ["Barbell"]
          : /cable/.test(lower)
          ? ["Cable Machine"]
          : /machine|press|curl|extension/.test(lower)
          ? ["Machine"]
          : ["Bodyweight"];

      return {
        type: "create_catalog_exercise",
        exercise: {
          name: titleCased,
          type,
          equipment,
          target: type === "timed" ? "conditioning" : "general",
          bodyPart: type === "timed" ? "conditioning" : "full body",
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
          action: aiReply.action ?? null,
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
    const extracted = extractFallbackPatch(message, profile, coachResponse);
    const fallbackAction = extractFallbackAction(message);
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
      action: fallbackAction,
      source: "fallback",
    });
  } catch (error) {
    console.error("workoutCoachChat error:", error);
    return res.status(500).json({ message: "Failed to chat with coach" });
  }
}
