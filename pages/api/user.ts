import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { ObjectId } from "mongodb";
import { connectToDatabase } from "../../utils/mongodb";
import { authOptions } from "./auth/[...nextauth]";
import { markBetaFunnelMilestone } from "../../utils/betaFunnel";
import { resolveUserAccess } from "../../utils/entitlements";

const ADMIN_USERNAME = "grwyler";
const ADMIN_EMAIL = "grwyler@gmail.com";

const sanitizeText = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

const sanitizeStringArray = (value: unknown) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(value.map((item) => sanitizeText(item)).filter(Boolean))
  ).slice(0, 32);
};

const sanitizeThemePreference = (value: unknown) => {
  const normalized = sanitizeText(value).toLowerCase();
  return ["light", "dawn", "night", "evergreen"].includes(normalized)
    ? normalized
    : "";
};

const isDarkThemePreference = (value: string) =>
  value === "night" || value === "evergreen";

const isAdminSession = (session: any) => {
  const username = sanitizeText(
    session?.user?.username || session?.token?.user?.username
  ).toLowerCase();
  const email = sanitizeText(
    session?.user?.email || session?.token?.user?.email
  ).toLowerCase();

  return username === ADMIN_USERNAME || email === ADMIN_EMAIL;
};

const getRequesterId = (session: any) =>
  sanitizeText(session?.user?._id || session?.token?.user?._id);

const canAccessUser = ({
  requesterId,
  targetUserId,
  admin,
}: {
  requesterId: string;
  targetUserId: string;
  admin: boolean;
}) => admin || requesterId === targetUserId;

const userProjection = {
  password: 0,
  sessionId: 0,
  providerAccountId: 0,
};

const buildUserUpdate = (user: Record<string, unknown>) => {
  const update: Record<string, unknown> = {};
  const textFields = [
    "name",
    "sex",
    "age",
    "height",
    "weight",
    "trainingGoal",
    "currentFitnessLevel",
    "workoutDaysPerWeek",
    "experienceLevel",
    "workoutLength",
    "maxDumbbellWeight",
    "limitations",
    "notes",
  ];

  textFields.forEach((field) => {
    if (field in user) {
      update[field] = sanitizeText(user[field]);
    }
  });

  if ("preferredUnits" in user) {
    update.preferredUnits = sanitizeText(user.preferredUnits) === "kg" ? "kg" : "lb";
  }

  if ("equipmentAccess" in user) {
    update.equipmentAccess = sanitizeStringArray(user.equipmentAccess);
  }

  if ("preferredTrainingDays" in user) {
    update.preferredTrainingDays = sanitizeStringArray(user.preferredTrainingDays);
  }

  if ("darkMode" in user) {
    update.darkMode = Boolean(user.darkMode);
  }

  if ("themePreference" in user) {
    const themePreference = sanitizeThemePreference(user.themePreference);
    if (themePreference) {
      update.themePreference = themePreference;
      update.darkMode = isDarkThemePreference(themePreference);
    }
  }

  if ("setupPromptSeen" in user) {
    update.setupPromptSeen = Boolean(user.setupPromptSeen);
  }

  if ("setupCompleted" in user) {
    update.setupCompleted = Boolean(user.setupCompleted);
  }

  return update;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const session = await getServerSession(req, res, authOptions);
    const requesterId = getRequesterId(session);
    const admin = isAdminSession(session);

    if (!session || !requesterId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const db = await connectToDatabase();
    const userCollection = db.collection("users");

    if (req.method === "GET") {
      const { id } = req.query;
      const normalizedId = Array.isArray(id) ? id[0] : id;

      if (normalizedId) {
        if (!ObjectId.isValid(normalizedId)) {
          return res.status(400).json({ message: "Invalid user ID" });
        }

        if (
          !canAccessUser({
            requesterId,
            targetUserId: normalizedId,
            admin,
          })
        ) {
          return res.status(403).json({ message: "Forbidden" });
        }

        const matchingUser = await userCollection.findOne(
          {
            _id: new ObjectId(normalizedId),
          },
          {
            projection: userProjection,
          }
        );

        if (!matchingUser) {
          return res.status(404).json({ message: "User not found" });
        }

        const { productPlan, entitlements } = resolveUserAccess(matchingUser as any);
        const needsAccessBackfill =
          matchingUser.productPlan !== productPlan ||
          JSON.stringify(matchingUser.entitlements ?? null) !==
            JSON.stringify(entitlements);

        if (needsAccessBackfill) {
          await userCollection.updateOne(
            { _id: new ObjectId(normalizedId) },
            {
              $set: {
                productPlan,
                entitlements,
                updatedAt: new Date(),
              },
            }
          );
        }

        return res.status(200).json({
          user: {
            ...matchingUser,
            productPlan,
            entitlements,
          },
        });
      }

      if (!admin) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const users = await userCollection
        .find(
          {},
          {
            projection: {
              username: 1,
              name: 1,
              email: 1,
              createdAt: 1,
            },
          }
        )
        .toArray();

      return res.status(200).json({ users });
    }

    if (req.method === "DELETE") {
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

      if (
        !canAccessUser({
          requesterId,
          targetUserId: normalizedId,
          admin,
        })
      ) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const result = await userCollection.deleteOne({
        _id: new ObjectId(normalizedId),
      });

      if (result.deletedCount !== 1) {
        return res.status(404).json({ error: "User not found" });
      }

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
    }

    if (req.method === "POST") {
      const { user } = req.body;
      if (!user || typeof user !== "object") {
        return res.status(400).json({ error: "User is required" });
      }

      const normalizedId = String((user as Record<string, unknown>)._id ?? "");
      if (!normalizedId || !ObjectId.isValid(normalizedId)) {
        return res.status(400).json({ error: "Valid user ID is required" });
      }

      if (
        !canAccessUser({
          requesterId,
          targetUserId: normalizedId,
          admin,
        })
      ) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const existingUser = await userCollection.findOne({
        _id: new ObjectId(normalizedId),
      });

      if (!existingUser) {
        return res.status(404).json({ error: "User not found" });
      }

      const updatedUser = buildUserUpdate(user as Record<string, unknown>);
      if (Object.keys(updatedUser).length === 0) {
        return res.status(400).json({ error: "No valid user fields were provided" });
      }

      const nextBetaFunnel =
        updatedUser.setupCompleted === true
          ? markBetaFunnelMilestone({
              funnel: existingUser.betaFunnel,
              key: "setupCompletedAt",
              occurredAt: new Date(),
            })
          : existingUser.betaFunnel;

      await userCollection.updateOne(
        { _id: existingUser._id },
        {
          $set: {
            ...updatedUser,
            betaFunnel: nextBetaFunnel,
            updatedAt: new Date(),
          },
        }
      );

      return res.status(200).json({ message: "User saved successfully!" });
    }

    return res.status(405).json({ message: "Method Not Allowed" });
  } catch (error) {
    console.error("Error updating user:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
