import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { ObjectId } from "mongodb";
import { authOptions } from "./auth/[...nextauth]";
import { connectToDatabase } from "../../utils/mongodb";
import {
  markBetaFunnelMilestone,
  resolveBetaFunnelMilestoneKey,
  summarizeMonetizationFunnel,
} from "../../utils/betaFunnel";
import {
  hasActiveBillingAccess,
} from "../../server/billing/service";
import { hasActiveManualProBetaAccess } from "../../utils/entitlements";
import { UserDoc } from "../../utils/types";

const parseSessionUserId = (session: any) =>
  String(session?.user?._id || session?.token?.user?._id || "").trim();

const sanitizeText = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

const isAdminSession = (session: any) => {
  const username = sanitizeText(
    session?.user?.username || session?.token?.user?.username
  ).toLowerCase();
  const email = sanitizeText(
    session?.user?.email || session?.token?.user?.email
  ).toLowerCase();

  return username === "grwyler" || email === "grwyler@gmail.com";
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);
  const db = await connectToDatabase();

  if (req.method === "GET") {
    if (!session || !isAdminSession(session)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const summaryKind = sanitizeText(req.query.summary);
    if (summaryKind !== "monetization") {
      return res.status(400).json({ message: "Unsupported summary" });
    }

    const users = await db
      .collection<UserDoc>("users")
      .find(
        {},
        {
          projection: {
            betaFunnel: 1,
            billingPlan: 1,
            subscriptionStatus: 1,
            manualProBetaAccess: 1,
          },
        }
      )
      .toArray();

    return res.status(200).json(
      summarizeMonetizationFunnel({
        users,
        hasPaidAccess: (user) =>
          hasActiveBillingAccess(user as UserDoc) ||
          hasActiveManualProBetaAccess(user as UserDoc),
      })
    );
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", ["GET", "POST"]);
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const userId = parseSessionUserId(session);
  if (!session || !userId || !ObjectId.isValid(userId)) {
    return res.status(401).json({ message: "Authentication required" });
  }

  const milestone = sanitizeText(req.body?.milestone);
  const occurredAt = req.body?.occurredAt;
  const milestoneKey = resolveBetaFunnelMilestoneKey(milestone);
  if (!milestoneKey) {
    return res.status(400).json({ message: "Unsupported milestone" });
  }

  const users = db.collection("users");
  const existingUser = await users.findOne(
    { _id: new ObjectId(userId) },
    { projection: { betaFunnel: 1 } }
  );

  if (!existingUser) {
    return res.status(404).json({ message: "User not found" });
  }

  const betaFunnel = markBetaFunnelMilestone({
    funnel: existingUser.betaFunnel,
    key: milestoneKey,
    occurredAt,
  });

  await users.updateOne(
    { _id: new ObjectId(userId) },
    {
      $set: {
        betaFunnel,
        updatedAt: new Date(),
      },
    }
  );

  return res.status(200).json({ success: true });
}
