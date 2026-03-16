import { NextApiRequest, NextApiResponse } from "next";
import { ObjectId } from "mongodb";
import OpenAI from "openai";
import { connectToDatabase } from "../../utils/mongodb";
import {
  buildFallbackCoachReply,
  WorkoutCoachResponse,
} from "../../utils/workoutGeneration";
import {
  AIResponseSourceDetail,
  inferAIFallbackReason,
} from "../../utils/aiFallback";
import { SetupFormValues } from "../../utils/profileSetup";
import {
  assistantAskedToUpdateWorkout,
  ChatTurn,
  CoachAction,
  extractFallbackAction,
  extractFallbackPatch,
  isAffirmative,
  normalizeCoachAction,
} from "../../utils/workoutCoachFallback";
import {
  getEntitlementMessage,
  hasEntitlement,
} from "../../utils/entitlements";

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
      userId,
    } = req.body as {
      message?: string;
      history?: ChatTurn[];
      profile?: SetupFormValues;
      coachResponse?: WorkoutCoachResponse;
      userId?: string;
    };

    if (!message?.trim() || !profile || !coachResponse) {
      return res
        .status(400)
        .json({ message: "message, profile, and coachResponse are required" });
    }

    const db = await connectToDatabase();
    const users = db.collection("users");
    const user =
      typeof userId === "string" && ObjectId.isValid(userId)
        ? await users.findOne({ _id: new ObjectId(userId) })
        : null;
    const canRegeneratePlan = hasEntitlement(
      user as any,
      "assistantPlanRegeneration"
    );
    const canScheduleRecurring = hasEntitlement(
      user as any,
      "recurringWorkoutScheduling"
    );

    const buildUpsellReply = (messageText: string) => ({
      reply: messageText,
      suggestedReplies: [
        "What can I still do on free?",
        "Show me pricing",
        "Help me track workouts instead",
      ],
      profilePatch: {},
      shouldRegeneratePlan: false,
      action: null,
      source: "fallback",
      sourceDetail: "rule_based",
    });

    const hasAIConfig = Boolean(
      process.env.AI_GATEWAY_API_KEY || process.env.OPENAI_API_KEY
    );

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
        sourceDetail: "rule_based",
      });
    }

    const extracted = extractFallbackPatch(message, profile, coachResponse);
    if (extracted.unavailableDays) {
      if (!canRegeneratePlan) {
        return res
          .status(200)
          .json(
            buildUpsellReply(getEntitlementMessage("assistantPlanRegeneration"))
          );
      }

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
        sourceDetail: "rule_based",
      });
    }

    if (extracted.preferredDaySwap) {
      if (!canRegeneratePlan) {
        return res
          .status(200)
          .json(
            buildUpsellReply(getEntitlementMessage("assistantPlanRegeneration"))
          );
      }

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
        sourceDetail: "rule_based",
      });
    }

    if (extracted.shouldRegeneratePlan && Object.keys(extracted.patch).length === 0) {
      if (!canRegeneratePlan) {
        return res
          .status(200)
          .json(
            buildUpsellReply(getEntitlementMessage("assistantPlanRegeneration"))
          );
      }

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
        sourceDetail: "rule_based",
      });
    }

    if (extracted.shouldRegeneratePlan && Object.keys(extracted.patch).length > 0) {
      if (!canRegeneratePlan) {
        return res
          .status(200)
          .json(
            buildUpsellReply(getEntitlementMessage("assistantPlanRegeneration"))
          );
      }

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
        sourceDetail: "rule_based",
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
        sourceDetail: "rule_based",
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
        sourceDetail: "rule_based",
      });
    }

    if (directAction?.type === "create_recurring_exercise") {
      if (!canScheduleRecurring) {
        return res
          .status(200)
          .json(
            buildUpsellReply(getEntitlementMessage("recurringWorkoutScheduling"))
          );
      }

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
        sourceDetail: "rule_based",
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
        sourceDetail: "rule_based",
      });
    }

    let fallbackSourceDetail: AIResponseSourceDetail = hasAIConfig
      ? "unknown"
      : "not_configured";

    try {
      const aiReply = await askCoachWithAI({
        message,
        history,
        profile,
        coachResponse,
      });

      if (aiReply?.reply) {
          const normalizedAction = normalizeCoachAction(aiReply.action ?? null);
          const actionRequiresRecurringScheduling =
            normalizedAction?.type === "create_recurring_exercise";

          if (aiReply.shouldRegeneratePlan && !canRegeneratePlan) {
            return res
              .status(200)
              .json(
                buildUpsellReply(
                  getEntitlementMessage("assistantPlanRegeneration")
                )
              );
          }

          if (actionRequiresRecurringScheduling && !canScheduleRecurring) {
            return res
              .status(200)
              .json(
                buildUpsellReply(
                  getEntitlementMessage("recurringWorkoutScheduling")
                )
              );
          }

          return res.status(200).json({
            reply: aiReply.reply,
            suggestedReplies:
              Array.isArray(aiReply.suggestedReplies) && aiReply.suggestedReplies.length > 0
                ? aiReply.suggestedReplies
              : coachResponse.suggestedReplies,
            profilePatch: aiReply.profilePatch ?? {},
            shouldRegeneratePlan: Boolean(aiReply.shouldRegeneratePlan),
            action: normalizedAction,
            source: "ai",
          });
      }
    } catch (error) {
      console.error("workoutCoachChat AI fallback triggered:", error);
      fallbackSourceDetail = inferAIFallbackReason(error, hasAIConfig);
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
      sourceDetail: fallbackSourceDetail,
    });
  } catch (error) {
    console.error("workoutCoachChat error:", error);
    return res.status(500).json({ message: "Failed to chat with coach" });
  }
}
