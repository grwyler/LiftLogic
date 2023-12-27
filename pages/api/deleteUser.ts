// api/deleteUser.js
import { ObjectId } from "mongodb";
import connectToDatabase, { disconnectFromDatabase } from "../../utils/mongodb";

export default async function handler(req, res) {
  if (req.method === "DELETE") {
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({ error: "User ID is required" });
    }

    try {
      const db = await connectToDatabase();
      const collection = db.collection("users");

      const result = await collection.deleteOne({ _id: new ObjectId(id) });
      await disconnectFromDatabase();
      if (result.deletedCount === 1) {
        return res.status(200).json({ message: "User deleted successfully" });
      } else {
        return res.status(404).json({ error: "User not found" });
      }
    } catch (error) {
      console.error("Error deleting user:", error);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  } else {
    return res.status(405).json({ error: "Method Not Allowed" });
  }
}
