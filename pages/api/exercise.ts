import { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "../../utils/mongodb";
import { ObjectId } from "mongodb";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const db = await connectToDatabase();
    const exerciseCollection = db.collection("exercises");

    if (req.method === "POST") {
      const { exercise } = req.body;
      console.log("Saving exercise:", exercise);
      await exerciseCollection.insertOne(exercise);
      return res.status(201).json({ message: "Exercise saved successfully!" });
    } else if (req.method === "GET") {
      try {
        const { userId, date, routineName } = req.query;

        if (!userId || !date) {
          return res
            .status(400)
            .json({ message: "User ID and date are required" });
        }

        // Split the date to get just the day of the week (e.g., "Tuesday" from "Tuesday, April 1")
        const [dayOfWeek] = (date as string).split(",");

        const exerciseCollection = db.collection("exercises");

        // Build query object
        // We'll match if 'date' is the full date OR just the dayOfWeek
        const query: any = {
          userId,
          $or: [
            { date: date },
            { date: dayOfWeek?.trim() }, // In case dayOfWeek has extra spaces
          ],
        };

        // Conditionally add routineName if it's provided
        if (routineName) {
          query.routineName = routineName;
        }

        const exercises = await exerciseCollection.find(query).toArray();

        return res.status(200).json({ exercises });
      } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal server error" });
      }
    } else if (req.method === "DELETE") {
      console.log("DELETE handler body:", req.body);
      const { exerciseId } = req.body;
      if (!exerciseId) {
        return res.status(400).json({ message: "Exercise ID is required" });
      }
      const result = await exerciseCollection.deleteOne({
        _id: new ObjectId(exerciseId),
      });
      if (result.deletedCount === 1) {
        return res
          .status(200)
          .json({ message: "Exercise deleted successfully" });
      } else {
        return res.status(404).json({ message: "Exercise not found" });
      }
    } else {
      res.setHeader("Allow", ["GET", "POST", "DELETE"]);
      return res.status(405).json({ message: "Method Not Allowed" });
    }
  } catch (error) {
    console.error("MongoDB connection or query error:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}
