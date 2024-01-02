// pages/api/user.ts
import { NextApiRequest, NextApiResponse } from "next";
import { ObjectId } from "mongodb";
import connectToDatabase, { disconnectFromDatabase } from "../../utils/mongodb";

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
      await disconnectFromDatabase();
      res.status(200).json({ users });
    } catch (error) {
      console.error("MongoDB query error:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  } else if (req.method === "DELETE") {
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({ error: "User ID is required" });
    }

    try {
      const db = await connectToDatabase();
      const collection = db.collection("users");

      const result = await collection.deleteOne({
        _id: new ObjectId(id as string),
      });

      if (result.deletedCount === 1) {
        // Delete related documents in the 'routines' collection
        const routinesCollection = db.collection("routines");
        await routinesCollection.deleteMany({ userId: id });

        // Delete related documents in the 'exercises' collection
        const exercisesCollection = db.collection("exercises");
        await exercisesCollection.deleteMany({ userId: id });

        return res.status(200).json({ message: "User deleted successfully" });
      } else {
        return res.status(404).json({ error: "User not found" });
      }
    } catch (error) {
      console.error("Error deleting user:", error);
      return res.status(500).json({ error: "Internal Server Error" });
    } finally {
      await disconnectFromDatabase();
    }
  } else if (req.method === "PUT") {
    const { id } = req.query;
    const { name, email } = req.body;

    if (!id) {
      return res.status(400).json({ error: "User ID is required" });
    }

    if (!name || !email) {
      return res
        .status(400)
        .json({ error: "Name and email are required for update" });
    }

    try {
      const db = await connectToDatabase();
      const collection = db.collection("users");

      const result = await collection.updateOne(
        { _id: new ObjectId(id as string) },
        { $set: { name, email } }
      );
      await disconnectFromDatabase();

      if (result.modifiedCount === 1) {
        return res.status(200).json({ message: "User updated successfully" });
      } else {
        return res.status(404).json({ error: "User not found" });
      }
    } catch (error) {
      console.error("Error updating user:", error);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  } else {
    res.status(405).json({ message: "Method Not Allowed" });
  }
}
