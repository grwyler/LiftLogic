// // api/saveWorkout.js
// import { MongoClient } from "mongodb";

// export default async function handler(req, res) {
//   if (req.method === "POST") {
//     const { workout } = req.body;

//     console.log("Received workout data:", workout);
//     console.log("MongoDB URI:", process.env.MONGODB_URI);

//     const client = new MongoClient(process.env.MONGODB_URI);

//     try {
//       await client.connect();

//       const database = client.db("LiftLogic");
//       const collection = database.collection("workouts");

//       // Use insertOne for the latest MongoDB driver
//       await collection.insertOne(workout);

//       res.status(201).json({ message: "Workout saved successfully!" });
//     } catch (error) {
//       console.error("MongoDB connection or insertion error:", error);
//       res.status(500).json({ message: "Internal Server Error" });
//     } finally {
//       await client.close();
//     }
//   } else {
//     res.status(405).json({ message: "Method Not Allowed" });
//   }
// }
// api/saveWorkout.js
import connectToDatabase from "../../utils/mongodb";

export default async function handler(req, res) {
  if (req.method === "POST") {
    const { workout } = req.body;

    console.log("Received workout data:", workout);
    console.log("MongoDB URI:", process.env.MONGODB_URI);

    try {
      const db = await connectToDatabase();

      const collection = db.collection("workouts");

      // Use insertOne for the latest MongoDB driver
      await collection.insertOne(workout);

      res.status(201).json({ message: "Workout saved successfully!" });
    } catch (error) {
      console.error("MongoDB connection or insertion error:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  } else {
    res.status(405).json({ message: "Method Not Allowed" });
  }
}
