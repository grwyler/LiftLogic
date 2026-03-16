import { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "../../utils/mongodb";
import { RecurringRuleDoc, WorkoutEntryDoc } from "../../utils/types";

const parseLocalDate = (value: unknown) => {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value !== "string") {
    return null;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    const parsed = new Date(year, month - 1, day);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  try {
    const { userId, monthStart, monthEnd, routineName } = req.query;

    if (!userId || typeof userId !== "string") {
      return res.status(400).json({ message: "userId required" });
    }

    const parsedStart = parseLocalDate(monthStart);
    const parsedEnd = parseLocalDate(monthEnd);
    if (!parsedStart || !parsedEnd) {
      return res.status(400).json({ message: "Bad month range" });
    }

    const start = new Date(parsedStart);
    start.setHours(0, 0, 0, 0);
    const end = new Date(parsedEnd);
    end.setHours(23, 59, 59, 999);

    const db = await connectToDatabase();
    const workoutEntryCollection = db.collection<WorkoutEntryDoc>("workoutEntries");
    const recurringRuleCollection = db.collection<RecurringRuleDoc>("recurringRules");

    const entryQuery: Record<string, unknown> = {
      userId,
      date: { $gte: start, $lte: end },
      skipped: { $ne: true },
    };
    const ruleQuery: Record<string, unknown> = {
      userId,
      active: { $ne: false },
    };

    if (typeof routineName === "string" && routineName) {
      entryQuery.routineName = routineName;
      ruleQuery.routineName = routineName;
    }

    const [entries, rules] = await Promise.all([
      workoutEntryCollection.find(entryQuery).sort({ date: -1 }).toArray(),
      recurringRuleCollection.find(ruleQuery).toArray(),
    ]);

    return res.status(200).json({ entries, rules });
  } catch (error) {
    console.error("workoutCalendarSummary error:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}
