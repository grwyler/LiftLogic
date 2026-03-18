import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { ObjectId } from "mongodb";
import { authOptions } from "./auth/[...nextauth]";
import { connectToDatabase } from "../../utils/mongodb";
import {
  mergeBetaFunnels,
  markBetaFunnelMilestone,
  resolveBetaFunnelMilestoneKey,
  summarizeMonetizationFunnel,
} from "../../utils/betaFunnel";
import {
  getSessionUserId,
  isBugWorkflowAdminSession,
} from "../../utils/adminAuthorization";
import {
  hasActiveBillingAccess,
} from "../../server/billing/service";
import { hasActiveManualProBetaAccess } from "../../utils/entitlements";
import { UserDoc } from "../../utils/types";

type AnonymousFunnelDoc = {
  anonymousFunnelId?: string;
  betaFunnel?: unknown;
  mergedAt?: Date;
  mergedUserId?: ObjectId;
  updatedAt?: Date;
};

const sanitizeText = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

const ANONYMOUS_FUNNEL_COOKIE_KEY = "liftlogic_funnel_id";
const buildEmptyMonetizationSummary = () =>
  summarizeMonetizationFunnel({
    users: [],
    anonymousFunnels: [],
    hasPaidAccess: () => false,
  });

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);

  if (req.method === "GET") {
    if (!session || !isBugWorkflowAdminSession(session)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const summaryKind = sanitizeText(req.query.summary);
    if (summaryKind !== "monetization") {
      return res.status(400).json({ message: "Unsupported summary" });
    }

    let db: Awaited<ReturnType<typeof connectToDatabase>>;
    try {
      db = await connectToDatabase();
    } catch (error) {
      console.warn("Funnel summary degraded because the database is unavailable.", error);
      return res.status(200).json({
        ...buildEmptyMonetizationSummary(),
        degraded: true,
      });
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
    const anonymousFunnels = await db
      .collection<AnonymousFunnelDoc>("anonymousBetaFunnels")
      .find(
        {},
        {
          projection: {
            betaFunnel: 1,
          },
        }
      )
      .toArray();

    return res.status(200).json(
      summarizeMonetizationFunnel({
        users,
        anonymousFunnels,
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

  const userId = getSessionUserId(session);
  const isAuthenticated = Boolean(session && userId && ObjectId.isValid(userId));
  const action = sanitizeText(req.body?.action);
  const requestAnonymousFunnelId = sanitizeText(req.body?.anonymousFunnelId);
  const cookieAnonymousFunnelId = sanitizeText(req.cookies?.[ANONYMOUS_FUNNEL_COOKIE_KEY]);
  const anonymousFunnelId = requestAnonymousFunnelId || cookieAnonymousFunnelId;
  const milestone = sanitizeText(req.body?.milestone);
  const occurredAt = req.body?.occurredAt;
  const source = sanitizeText(req.body?.source);
  const milestoneKey = resolveBetaFunnelMilestoneKey(milestone);
  if (action !== "mergeAnonymousFunnel" && !milestoneKey) {
    return res.status(400).json({ message: "Unsupported milestone" });
  }

  if (action === "mergeAnonymousFunnel" && !isAuthenticated) {
    return res.status(401).json({ message: "Authentication required" });
  }

  if (!anonymousFunnelId && (action === "mergeAnonymousFunnel" || !isAuthenticated)) {
    return res.status(400).json({ message: "Anonymous funnel id is required" });
  }

  let db: Awaited<ReturnType<typeof connectToDatabase>>;
  try {
    db = await connectToDatabase();
  } catch (error) {
    console.warn("Funnel event tracking degraded because the database is unavailable.", error);
    return res.status(200).json({
      success: true,
      degraded: true,
      merged: action === "mergeAnonymousFunnel" ? false : undefined,
    });
  }

  const anonymousFunnels = db.collection<AnonymousFunnelDoc>("anonymousBetaFunnels");

  if (action === "mergeAnonymousFunnel") {
    const users = db.collection("users");
    const [existingUser, anonymousFunnelDoc] = await Promise.all([
      users.findOne(
        { _id: new ObjectId(userId) },
        { projection: { betaFunnel: 1 } }
      ),
      anonymousFunnels.findOne({ anonymousFunnelId }),
    ]);

    if (!existingUser) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!anonymousFunnelDoc?.betaFunnel) {
      return res.status(200).json({ success: true, merged: false });
    }

    const mergedAt = new Date();
    const betaFunnel = mergeBetaFunnels({
      base: existingUser.betaFunnel,
      incoming: anonymousFunnelDoc.betaFunnel,
      mergedAt,
    });

    await Promise.all([
      users.updateOne(
        { _id: new ObjectId(userId) },
        {
          $set: {
            betaFunnel,
            updatedAt: mergedAt,
          },
        }
      ),
      anonymousFunnels.updateOne(
        { anonymousFunnelId },
        {
          $set: {
            mergedAt,
            mergedUserId: new ObjectId(userId),
            updatedAt: mergedAt,
          },
        }
      ),
    ]);

    return res.status(200).json({ success: true, merged: true });
  }

  if (isAuthenticated) {
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
      source,
      anonymousFunnelId,
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
  } else {
    const existingAnonymousFunnel = await anonymousFunnels.findOne(
      { anonymousFunnelId },
      { projection: { betaFunnel: 1 } }
    );
    const betaFunnel = markBetaFunnelMilestone({
      funnel: existingAnonymousFunnel?.betaFunnel,
      key: milestoneKey,
      occurredAt,
      source,
      anonymousFunnelId,
    });

    await anonymousFunnels.updateOne(
      { anonymousFunnelId },
      {
        $set: {
          anonymousFunnelId,
          betaFunnel,
          updatedAt: new Date(),
        },
      },
      { upsert: true }
    );
  }

  return res.status(200).json({ success: true });
}
