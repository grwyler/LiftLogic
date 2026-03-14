import { NextApiRequest, NextApiResponse } from "next";
import OpenAI from "openai";
import { connectToDatabase, disconnectFromDatabase } from "../../utils/mongodb";
import {
  buildWorkoutCoachResponse,
  buildFallbackWorkoutPlan,
  buildRoutineFromPlan,
  buildWorkoutGenerationPrompt,
  normalizeGeneratedPlan,
} from "../../utils/workoutGeneration";
import { SetupFormValues } from "../../utils/profileSetup";

const dayToIndex: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

const getNextOccurrence = (dayIndex: number) => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const delta = (dayIndex - start.getDay() + 7) % 7;
  start.setDate(start.getDate() + delta);
  return start;
};

const buildRecurringRules = (userId: string, plan: ReturnType<typeof buildFallbackWorkoutPlan>) =>
  plan.days.flatMap((day) =>
    day.exercises.map((exercise, index) => ({
      userId,
      exerciseId: exercise.name.toLowerCase().replace(/\s+/g, "-"),
      exerciseName: exercise.name,
      exerciseType: exercise.type,
      routineName: day.title,
      sortOrder: index,
      recurrenceType: "weekly",
      interval: 1,
      intervalWeeks: 1,
      dayOfWeek: dayToIndex[day.dayKey],
      daysOfWeek: [dayToIndex[day.dayKey]],
      dayOfMonth: undefined,
      startDate: getNextOccurrence(dayToIndex[day.dayKey]),
      templateSets: exercise.sets,
      defaultMax: exercise.max,
      defaultRest: exercise.rest,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }))
  );

const persistGeneratedPlan = async ({
  userId,
  plan,
  routine,
}: {
  userId: string;
  plan: ReturnType<typeof buildFallbackWorkoutPlan>;
  routine: ReturnType<typeof buildRoutineFromPlan>;
}) => {
  const db = await connectToDatabase();
  const recurringRuleCollection = db.collection("recurringRules");
  const routineCollection = db.collection("routines");

  await recurringRuleCollection.updateMany(
    { userId, active: true },
    { $set: { active: false, updatedAt: new Date() } }
  );

  const rules = buildRecurringRules(userId, plan);

  if (rules.length > 0) {
    await recurringRuleCollection.insertMany(rules);
  }

  const existingRoutine = await routineCollection.findOne({ userId });
  if (existingRoutine) {
    await routineCollection.updateOne(
      { userId },
      { $set: { ...routine, updatedAt: new Date() } }
    );
    return;
  }

  await routineCollection.insertOne({
    ...routine,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
};

const isRetryableMongoWriteError = (error: unknown) => {
  const code = String((error as { code?: unknown })?.code ?? "");
  const message =
    error instanceof Error ? error.message : String(error ?? "");

  return (
    code === "ECONNRESET" ||
    /ECONNRESET|Mongo(Network|ServerSelection)|connection.*reset|timed out/i.test(
      message
    )
  );
};

const generatePlanWithAI = async (profile: SetupFormValues) => {
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
    ? process.env.WORKOUT_PLAN_MODEL || "openai/gpt-5-mini"
    : process.env.WORKOUT_PLAN_MODEL || "gpt-4.1-mini";

  const completion = await client.chat.completions.create({
    model,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You generate practical weekly workout plans and return only JSON.",
      },
      {
        role: "user",
        content: buildWorkoutGenerationPrompt(profile),
      },
    ],
  });

  const content = completion.choices[0]?.message?.content ?? "{}";
  return JSON.parse(content);
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
    const { userId, profile } = req.body as {
      userId?: string;
      profile?: SetupFormValues;
    };

    if (!userId) {
      return res.status(400).json({ message: "userId required" });
    }

    if (!profile?.trainingGoal || !profile?.workoutDaysPerWeek) {
      return res
        .status(400)
        .json({ message: "trainingGoal and workoutDaysPerWeek are required" });
    }

    let rawPlan: any = null;
    let source: "ai" | "fallback" = "fallback";

    try {
      rawPlan = await generatePlanWithAI(profile);
      if (rawPlan) {
        source = "ai";
      }
    } catch (error) {
      console.error("AI workout generation failed, falling back", error);
    }

    const plan = rawPlan
      ? normalizeGeneratedPlan(rawPlan, profile)
      : buildFallbackWorkoutPlan(profile);
    const coachResponse = buildWorkoutCoachResponse(profile, plan);
    const routine = buildRoutineFromPlan(userId, plan);

    try {
      await persistGeneratedPlan({ userId, plan, routine });
    } catch (error) {
      if (!isRetryableMongoWriteError(error)) {
        throw error;
      }

      console.warn(
        "generateWorkout persistence hit a retryable Mongo error, retrying once",
        error
      );
      await disconnectFromDatabase();
      await persistGeneratedPlan({ userId, plan, routine });
    }

    return res.status(200).json({
      routine,
      summary: plan.summary,
      coachResponse,
      source,
      generatedDays: plan.days.length,
    });
  } catch (error) {
    console.error("generateWorkout error:", error);
    return res.status(500).json({ message: "Failed to generate workout plan" });
  }
}
