// pages/api/signup.ts
import { connectToDatabase } from "../../utils/mongodb";

export default async function handler(req, res) {
  if (req.method === "POST") {
    const username = String(req.body?.username ?? "").trim();
    const password = String(req.body?.password ?? "");

    try {
      const db = await connectToDatabase();
      const collection = db.collection("users");

      if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
      }

      const existingUser = await collection.findOne({ username });
      if (existingUser) {
        return res.status(409).json({ message: "Username already exists" });
      }

      const result = await collection.insertOne({
        username,
        password: password, // TODO: hash passwords before storing them in production
        preferredUnits: "lb",
        trainingGoal: "",
        darkMode: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      if (result.insertedId) {
        res.status(201).json({ message: "User registered successfully!" });
      } else {
        res.status(500).json({ message: "Failed to register user." });
      }
    } catch (error) {
      console.error("MongoDB connection or registration error:", error);
      const isLocal = process.env.NEXT_PUBLIC_ENV === "local";
      const message =
        isLocal && error instanceof Error
          ? error.message
          : "Internal Server Error";
      res.status(500).json({ message });
    }
  } else {
    res.status(405).json({ message: "Method Not Allowed" });
  }
}
