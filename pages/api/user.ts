// pages/api/user.ts
import { NextApiRequest, NextApiResponse } from "next";
import { ObjectId } from "mongodb";
import { connectToDatabase, disconnectFromDatabase } from "../../utils/mongodb";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    if (req.method === "GET") {
      const db = await connectToDatabase();
      const userCollection = await db.collection("users");
      const { id } = req.query;
      if (id) {
        const matchingUser = await userCollection.findOne({
          _id: new ObjectId(id as string),
        });

        if (!matchingUser) {
          return res.status(404).json({ message: "User not found" });
        }

        return res.status(200).json({ user: matchingUser });
      } else {
        const users = await userCollection.find({}).toArray();
        return res.status(200).json({ users });
      }
    } else if (req.method === "DELETE") {
      const db = await connectToDatabase();
      const userCollection = await db.collection("users");
      const { id } = req.query;
      if (!id) {
        return res.status(400).json({ error: "User ID is required" });
      }

      const result = await userCollection.deleteOne({
        _id: new ObjectId(id as string),
      });

      if (result.deletedCount === 1) {
        const routineCollection = await db.collection("routines");
        const exerciseCollection = await db.collection("exercises");
        const setCollection = await db.collection("sets");
        // Delete related documents in the 'routines' collection
        await routineCollection.deleteMany({ userId: id });

        // Delete related documents in the 'exercises' collection
        await exerciseCollection.deleteMany({ userId: id });

        // Delete related documents in the 'sets' collection
        await setCollection.deleteMany({ userId: id });

        return res.status(200).json({ message: "User deleted successfully" });
      } else {
        return res.status(404).json({ error: "User not found" });
      }
    } else if (req.method === "POST") {
      const db = await connectToDatabase();
      const userCollection = await db.collection("users");
      const { user } = req.body;
      if (!user) {
        return res.status(400).json({ error: "User is required" });
      }

      const existingUser = await userCollection.findOne({
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
        await userCollection.updateOne(
          { _id: existingUser._id },
          updateDocument
        );
      }

      return res.status(200).json({ message: "User saved successfully!" });
    } else {
      return res.status(405).json({ message: "Method Not Allowed" });
    }
  } catch (error) {
    console.error("Error updating user:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
