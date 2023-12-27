import connectToDatabase from "../../utils/mongodb";

export default async function handler(req, res) {
  if (req.method === "POST") {
    const { username, password } = req.body;

    try {
      const db = await connectToDatabase();
      const collection = db.collection("users");

      const user = await collection.findOne({ username, password });

      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Create a session identifier (e.g., random string)
      const sessionId = "session_" + Math.random().toString(36).substring(7);

      // Store the session identifier in the user document in the database
      await collection.updateOne({ _id: user._id }, { $set: { sessionId } });

      res.status(200).json({ sessionId });
    } catch (error) {
      console.error("MongoDB connection or sign-in error:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  } else {
    res.status(405).json({ message: "Method Not Allowed" });
  }
}
