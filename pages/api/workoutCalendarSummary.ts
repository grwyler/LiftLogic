import { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "../../utils/mongodb";
import { endOfLocalDay, parseLocalDateInput, startOfLocalDay } from "../../utils/localDate";
import { RecurringRuleDoc, WorkoutEntryDoc } from "../../utils/types";

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

    const parsedStart = parseLocalDateInput(monthStart);
    const parsedEnd = parseLocalDateInput(monthEnd);
    if (!parsedStart || !parsedEnd) {
      return res.status(400).json({ message: "Bad month range" });
    }

    const start = startOfLocalDay(parsedStart);
    const end = endOfLocalDay(parsedEnd);

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
