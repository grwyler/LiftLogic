import { connectToDatabase } from "../../utils/mongodb";
import { verifyAndUpgradePassword } from "../../utils/passwords";

export default async function handler(req, res) {
  if (req.method === "POST") {
    const username = String(req.body?.username ?? "").trim();
    const password = String(req.body?.password ?? "");

    try {
      const db = await connectToDatabase();
      const collection = db.collection("users");
      const user = await collection.findOne({ username });

      if (
        !user ||
        !(await verifyAndUpgradePassword({
          usersCollection: collection,
          user,
          candidatePassword: password,
        }))
      ) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Create a session identifier (e.g., random string)
      const sessionId = "session_" + Math.random().toString(36).substring(7);

      // Store the session identifier in the user document in the database
      await collection.updateOne(
        { _id: user._id },
        { $set: { sessionId, updatedAt: new Date() } }
      );
      res.status(200).json({ sessionId });
    } catch (error) {
      console.error("MongoDB connection or sign-in error:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  } else {
    res.status(405).json({ message: "Method Not Allowed" });
  }
}
