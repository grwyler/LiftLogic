// api/saveExercise.ts
import connectToDatabase, { disconnectFromDatabase } from "../../utils/mongodb";

export default async function handler(req, res) {
  if (req.method === "POST") {
    const { exercise } = req.body;

    console.log("Received exercise:", exercise);

    try {
      const db = await connectToDatabase();

      const collection = db.collection("exercises");

      // Use insertOne for the latest MongoDB driver
      await collection.insertOne(exercise);
      await disconnectFromDatabase();

      res.status(201).json({ message: "User inputs saved successfully!" });
    } catch (error) {
      console.error("MongoDB connection or insertion error:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  } else {
    res.status(405).json({ message: "Method Not Allowed" });
  }
}
