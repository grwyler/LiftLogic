// pages/api/signup.ts
import { connectToDatabase } from "../../utils/mongodb";
import { hashPassword } from "../../utils/passwords";
import { markBetaFunnelMilestone, mergeBetaFunnels } from "../../utils/betaFunnel";
import { FREE_ENTITLEMENTS } from "../../utils/entitlements";

export default async function handler(req, res) {
  if (req.method === "POST") {
    const username = String(req.body?.username ?? "").trim();
    const password = String(req.body?.password ?? "");
    const landingCta = req.body?.landingCtaAt;
    const anonymousFunnelId = String(req.body?.anonymousFunnelId ?? "").trim();

    try {
      const db = await connectToDatabase();
      const collection = db.collection("users");
      const anonymousFunnels = db.collection("anonymousBetaFunnels");

      if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
      }

      const existingUser = await collection.findOne({ username });
      if (existingUser) {
        return res.status(409).json({ message: "Username already exists" });
      }

      const passwordHash = await hashPassword(password);
      const createdAt = new Date();
      const anonymousFunnelDoc = anonymousFunnelId
        ? await anonymousFunnels.findOne({ anonymousFunnelId })
        : null;
      const landingCtaOccurredAt =
        landingCta && typeof landingCta === "object" ? landingCta.occurredAt : landingCta;
      const landingCtaSource =
        landingCta && typeof landingCta === "object" ? landingCta.source : undefined;
      const baseBetaFunnel = mergeBetaFunnels({
        base: anonymousFunnelDoc?.betaFunnel,
        incoming: markBetaFunnelMilestone({
          funnel: {},
          key: "landingCtaAt",
          occurredAt: landingCtaOccurredAt,
          source: landingCtaSource,
          anonymousFunnelId,
        }),
        mergedAt: createdAt,
      });

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
        productPlan: "free",
        entitlements: FREE_ENTITLEMENTS,
        subscriptionStatus: "inactive",
        subscriptionCancelAtPeriodEnd: false,
        betaFunnel: markBetaFunnelMilestone({
          funnel: baseBetaFunnel,
          key: "signupCompletedAt",
          occurredAt: createdAt,
        }),
        createdAt,
        updatedAt: createdAt,
      });

      if (result.insertedId) {
        if (anonymousFunnelDoc?._id) {
          await anonymousFunnels.updateOne(
            { _id: anonymousFunnelDoc._id },
            {
              $set: {
                mergedAt: createdAt,
                mergedUserId: result.insertedId,
                updatedAt: createdAt,
              },
            }
          );
        }
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
