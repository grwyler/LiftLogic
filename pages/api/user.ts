// pages/api/user.ts
import { NextApiRequest, NextApiResponse } from "next";
import { ObjectId } from "mongodb";
import connectToDatabase, { disconnectFromDatabase } from "../../utils/mongodb";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "GET") {
    const { id } = req.query;
    try {
      // Connect to the MongoDB database
      const db = await connectToDatabase();
      if (id) {
        const user = await db
          .collection("users")
          .findOne({ _id: new ObjectId(id as string) });
        res.status(200).json({ user });
      } else {
        // Query the users collection to get all users
        const users = await db.collection("users").find({}).toArray();
        await disconnectFromDatabase();
        res.status(200).json({ users });
      }
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
  } else if (req.method === "POST") {
    const { user } = req.body;

    if (!user) {
      return res.status(400).json({ error: "User is required" });
    }
    try {
      const db = await connectToDatabase();
      const collection = db.collection("users");

      const existingUser = await collection.findOne({
        _id: new ObjectId(user._id as string),
      });

      if (existingUser) {
        // Remove _id field from the user object to prevent updating it
        const { _id, ...updatedUser } = user;

        // Construct the update document using $set operator
        const updateDocument = {
          $set: updatedUser,
        };

        // Update existing user
        await collection.updateOne({ _id: existingUser._id }, updateDocument);
      } else {
        // Insert new user
        await collection.insertOne(user);
      }

      await disconnectFromDatabase();

      res.status(200).json({ message: "User saved successfully!" });
    } catch (error) {
      console.error("Error updating user:", error);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  } else {
    res.status(405).json({ message: "Method Not Allowed" });
  }
}
