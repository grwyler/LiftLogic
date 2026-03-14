// pages/api/user.ts
import { NextApiRequest, NextApiResponse } from "next";
import { ObjectId } from "mongodb";
import { connectToDatabase } from "../../utils/mongodb";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const db = await connectToDatabase();
    const userCollection = db.collection("users");

    if (req.method === "GET") {
      const { id } = req.query;
      const normalizedId = Array.isArray(id) ? id[0] : id;

      if (normalizedId) {
        if (!ObjectId.isValid(normalizedId)) {
          return res.status(400).json({ message: "Invalid user ID" });
        }

        const matchingUser = await userCollection.findOne({
          _id: new ObjectId(normalizedId),
        }, {
          projection: {
            password: 0,
            sessionId: 0,
            providerAccountId: 0,
          },
        });

        if (!matchingUser) {
          return res.status(404).json({ message: "User not found" });
        }

        return res.status(200).json({ user: matchingUser });
      }

      if (process.env.NEXT_PUBLIC_ENV !== "local") {
        return res.status(403).json({ message: "Listing users is only allowed locally" });
      }

      const users = await userCollection
        .find(
          {},
          {
            projection: {
              username: 1,
              password: 1,
            },
          }
        )
        .toArray();

      return res.status(200).json({ users });
    } else if (req.method === "DELETE") {
      const routineCollection = db.collection("routines");
      const exerciseCollection = db.collection("exercises");
      const setCollection = db.collection("sets");
      const workoutEntryCollection = db.collection("workoutEntries");
      const recurringRuleCollection = db.collection("recurringRules");
      const { id } = req.query;
      const normalizedId = Array.isArray(id) ? id[0] : id;

      if (!normalizedId) {
        return res.status(400).json({ error: "User ID is required" });
      }

      if (!ObjectId.isValid(normalizedId)) {
        return res.status(400).json({ error: "Invalid user ID" });
      }

      const result = await userCollection.deleteOne({
        _id: new ObjectId(normalizedId),
      });

      if (result.deletedCount === 1) {
        await Promise.all([
          routineCollection.deleteMany({ userId: normalizedId }),
          exerciseCollection.deleteMany({
            $or: [{ userId: normalizedId }, { createdBy: normalizedId }],
          }),
          setCollection.deleteMany({ userId: normalizedId }),
          workoutEntryCollection.deleteMany({ userId: normalizedId }),
          recurringRuleCollection.deleteMany({ userId: normalizedId }),
        ]);

        return res.status(200).json({ message: "User deleted successfully" });
      } else {
        return res.status(404).json({ error: "User not found" });
      }
    } else if (req.method === "POST") {
      const { user } = req.body;
      if (!user) {
        return res.status(400).json({ error: "User is required" });
      }

      const normalizedId = String(user._id ?? "");
      if (!normalizedId || !ObjectId.isValid(normalizedId)) {
        return res.status(400).json({ error: "Valid user ID is required" });
      }

      const existingUser = await userCollection.findOne({
        _id: new ObjectId(normalizedId),
      });

      if (!existingUser) {
        return res.status(404).json({ error: "User not found" });
      }

      const { _id, ...updatedUser } = user;
      await userCollection.updateOne(
        { _id: existingUser._id },
        {
          $set: {
            ...updatedUser,
            updatedAt: new Date(),
          },
        }
      );

      return res.status(200).json({ message: "User saved successfully!" });
    } else {
      return res.status(405).json({ message: "Method Not Allowed" });
    }
  } catch (error) {
    console.error("Error updating user:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
