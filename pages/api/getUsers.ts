// pages/api/getUsers.ts

import { NextApiRequest, NextApiResponse } from "next";
import connectToDatabase from "../../utils/mongodb";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "GET") {
    try {
      // Connect to the MongoDB database
      const db = await connectToDatabase();

      // Query the users collection to get all users
      const users = await db.collection("users").find({}).toArray();

      res.status(200).json({ users });
    } catch (error) {
      console.error("MongoDB query error:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  } else {
    res.status(405).json({ message: "Method Not Allowed" });
  }
}
