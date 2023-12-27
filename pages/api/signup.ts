// pages/api/signup.ts
import connectToDatabase from "../../utils/mongodb";

export default async function handler(req, res) {
  if (req.method === "POST") {
    const { username, password } = req.body;

    try {
      console.log("Connecting to MongoDB...");
      const db = await connectToDatabase();
      console.log("Connected to MongoDB.");

      const collection = db.collection("users");

      // Insert a new user into the collection
      const result = await collection.insertOne({
        username: username,
        password: password, // TODO: hash passwords before storing them in production
      });
      console.log("result.insertedCount: ", result.insertedCount);
      // Check the result and send a response
      if (result.insertedId) {
        console.log("User registered successfully!");
        res.status(201).json({ message: "User registered successfully!" });
      } else {
        console.error("Failed to register user.");
        res.status(500).json({ message: "Failed to register user." });
      }
    } catch (error) {
      console.error("MongoDB connection or registration error:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  } else {
    res.status(405).json({ message: "Method Not Allowed" });
  }
}
