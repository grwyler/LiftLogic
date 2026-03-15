import { Db } from "mongodb";

export const buildDefaultRoutine = (userId: string) => ({
  userId,
  days: {
    sunday: [{ title: "Sunday Workout", exercises: [] }],
    monday: [{ title: "Monday Workout", exercises: [] }],
    tuesday: [{ title: "Tuesday Workout", exercises: [] }],
    wednesday: [{ title: "Wednesday Workout", exercises: [] }],
    thursday: [{ title: "Thursday Workout", exercises: [] }],
    friday: [{ title: "Friday Workout", exercises: [] }],
    saturday: [{ title: "Saturday Workout", exercises: [] }],
  },
});

export const getProgramResetStartDate = (now = new Date()) => {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  return start;
};

export const clearUpcomingProgramData = async ({
  db,
  userId,
  now = new Date(),
}: {
  db: Db;
  userId: string;
  now?: Date;
}) => {
  const recurringRuleCollection = db.collection("recurringRules");
  const workoutEntryCollection = db.collection("workoutEntries");
  const startDate = getProgramResetStartDate(now);

  const [ruleResult, entryResult] = await Promise.all([
    recurringRuleCollection.updateMany(
      { userId, active: true },
      { $set: { active: false, updatedAt: new Date() } }
    ),
    workoutEntryCollection.deleteMany({
      userId,
      date: { $gte: startDate },
      complete: { $ne: true },
      "sets.complete": { $ne: true },
    }),
  ]);

  return {
    deactivatedRuleCount: ruleResult.modifiedCount ?? 0,
    deletedEntryCount: entryResult.deletedCount ?? 0,
    startDate,
  };
};

export const saveRoutineDocument = async ({
  db,
  userId,
  routine,
}: {
  db: Db;
  userId: string;
  routine?: Record<string, any> | null;
}) => {
  const routineCollection = db.collection("routines");
  const baseRoutine = buildDefaultRoutine(userId);
  const existingRoutine = await routineCollection.findOne({ userId });
  const nextRoutine = {
    ...baseRoutine,
    ...(routine ?? {}),
    userId,
    days: routine?.days ?? baseRoutine.days,
  };

  if (existingRoutine) {
    await routineCollection.updateOne(
      { userId },
      {
        $set: {
          ...nextRoutine,
          updatedAt: new Date(),
        },
      }
    );
    return nextRoutine;
  }

  await routineCollection.insertOne({
    ...nextRoutine,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  return nextRoutine;
};
