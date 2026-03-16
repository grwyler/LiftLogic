// pages/api/signup.ts
import { connectToDatabase } from "../../utils/mongodb";
import { hashPassword } from "../../utils/passwords";
import { markBetaFunnelMilestone } from "../../utils/betaFunnel";

export default async function handler(req, res) {
  if (req.method === "POST") {
    const username = String(req.body?.username ?? "").trim();
    const password = String(req.body?.password ?? "");
    const landingCtaAt = req.body?.landingCtaAt;

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

      const passwordHash = await hashPassword(password);
      const createdAt = new Date();

      const result = await collection.insertOne({
        username,
        password: passwordHash,
        sex: "",
        age: "",
        preferredUnits: "lb",
        trainingGoal: "",
        currentFitnessLevel: "",
        workoutDaysPerWeek: "",
        experienceLevel: "",
        workoutLength: "",
        equipmentAccess: [],
        maxDumbbellWeight: "",
        preferredTrainingDays: [],
        limitations: "",
        notes: "",
        setupPromptSeen: false,
        setupCompleted: false,
        darkMode: false,
        billingPlan: "free",
        subscriptionStatus: "inactive",
        subscriptionCancelAtPeriodEnd: false,
        betaFunnel: markBetaFunnelMilestone({
          funnel: markBetaFunnelMilestone({
            funnel: {},
            key: "landingCtaAt",
            occurredAt: landingCtaAt,
          }),
          key: "signupCompletedAt",
          occurredAt: createdAt,
        }),
        createdAt,
        updatedAt: createdAt,
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
