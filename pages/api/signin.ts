// pages/api/signin.ts

import { NextApiRequest, NextApiResponse } from "next";
import connectToDatabase from "../../utils/mongodb";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "POST") {
    const { username, password } = req.body;

    try {
      // Connect to the MongoDB database
      const db = await connectToDatabase();

      // Query the users collection to check if the user exists
      const user = await db.collection("users").findOne({ username, password });

      if (user) {
        // User authenticated successfully
        res.status(200).json({ message: "Sign-in successful" });
      } else {
        // User not found or password incorrect
        res.status(401).json({ message: "Invalid credentials" });
      }
    } catch (error) {
      console.error("MongoDB query error:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  } else {
    res.status(405).json({ message: "Method Not Allowed" });
  }
}
