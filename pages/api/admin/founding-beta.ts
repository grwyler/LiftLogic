import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { ObjectId } from "mongodb";
import { authOptions } from "../auth/[...nextauth]";
import { connectToDatabase } from "../../../utils/mongodb";
import { getEntitlementsForPlan, hasActiveManualProBetaAccess } from "../../../utils/entitlements";
import {
  getSessionUserProfile,
  isFoundingBetaAdminSession,
} from "../../../utils/adminAuthorization";
import { UserDoc } from "../../../utils/types";
import { markBetaFunnelMilestone } from "../../../utils/betaFunnel";
const ACTIVE_SUBSCRIPTION_STATUSES = new Set([
  "trialing",
  "active",
  "past_due",
  "unpaid",
]);

const sanitizeText = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

const parseOptionalDate = (value: unknown) => {
  const normalized = sanitizeText(value);
  if (!normalized) {
    return undefined;
  }

  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const buildResolvedAccessFields = (user: Partial<UserDoc>) => {
  const billingAccess =
    user.billingPlan === "pro_beta" ||
    ACTIVE_SUBSCRIPTION_STATUSES.has(sanitizeText(user.subscriptionStatus));
  const manualAccess = hasActiveManualProBetaAccess(user);
  const productPlan: UserDoc["productPlan"] =
    manualAccess || billingAccess ? "premium" : "free";

  return {
    productPlan,
    entitlements: getEntitlementsForPlan(productPlan),
  };
};

const serializeUser = (user: UserDoc) => {
  const { productPlan, entitlements } = buildResolvedAccessFields(user);

  return {
    _id: String(user._id || ""),
    username: user.username || "",
    name: user.name || "",
    email: user.email || "",
    createdAt: user.createdAt,
    billingPlan: user.billingPlan || "free",
    subscriptionStatus: user.subscriptionStatus || "inactive",
    productPlan,
    entitlements,
    manualProBetaAccess: user.manualProBetaAccess
      ? {
          grantedAt: user.manualProBetaAccess.grantedAt,
          grantedByEmail: user.manualProBetaAccess.grantedByEmail,
          expiresAt: user.manualProBetaAccess.expiresAt,
          revokedAt: user.manualProBetaAccess.revokedAt,
          revokedByEmail: user.manualProBetaAccess.revokedByEmail,
          paymentCollectionNote: user.manualProBetaAccess.paymentCollectionNote,
          active: hasActiveManualProBetaAccess(user),
        }
      : null,
  };
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);
  if (!session || !isFoundingBetaAdminSession(session)) {
    return res.status(403).json({ message: "Forbidden" });
  }

  const db = await connectToDatabase();
  const users = db.collection<UserDoc>("users");

  if (req.method === "GET") {
    const search = sanitizeText(req.query.search);
    const normalizedSearch = search.toLowerCase();

    const query = normalizedSearch
      ? {
          $or: [
            { username: { $regex: normalizedSearch, $options: "i" } },
            { name: { $regex: normalizedSearch, $options: "i" } },
            { email: { $regex: normalizedSearch, $options: "i" } },
          ],
        }
      : {};

    const matchedUsers = await users
      .find(query, {
        projection: {
          username: 1,
          name: 1,
          email: 1,
          createdAt: 1,
          billingPlan: 1,
          subscriptionStatus: 1,
          productPlan: 1,
          entitlements: 1,
          manualProBetaAccess: 1,
        },
      })
      .sort({ createdAt: -1 })
      .limit(normalizedSearch ? 25 : 12)
      .toArray();

    return res.status(200).json({
      users: matchedUsers.map(serializeUser),
    });
  }

  if (req.method === "POST") {
    const {
      userId,
      operation,
      expiresAt,
      paymentCollectionNote,
    } = req.body as {
      userId?: string;
      operation?: "grant" | "revoke" | "update";
      expiresAt?: string | null;
      paymentCollectionNote?: string;
    };

    const normalizedUserId = sanitizeText(userId);
    if (!ObjectId.isValid(normalizedUserId)) {
      return res.status(400).json({ message: "Valid userId is required" });
    }

    if (!["grant", "revoke", "update"].includes(String(operation))) {
      return res.status(400).json({ message: "Valid operation is required" });
    }

    const parsedExpiresAt = parseOptionalDate(expiresAt);
    if (parsedExpiresAt === null) {
      return res.status(400).json({ message: "expiresAt must be a valid date" });
    }

    const existingUser = await users.findOne({
      _id: new ObjectId(normalizedUserId),
    });

    if (!existingUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const now = new Date();
    const requester = getSessionUserProfile(session);
    const currentManualAccess = existingUser.manualProBetaAccess || {};
    const nextManualAccess =
      operation === "revoke"
        ? {
            ...currentManualAccess,
            revokedAt: now,
            revokedByUserId: requester._id || undefined,
            revokedByEmail: requester.email || undefined,
            paymentCollectionNote:
              sanitizeText(paymentCollectionNote) ||
              currentManualAccess.paymentCollectionNote ||
              undefined,
          }
        : {
            ...currentManualAccess,
            grantedAt:
              operation === "grant" ? now : currentManualAccess.grantedAt || now,
            grantedByUserId:
              operation === "grant"
                ? requester._id || undefined
                : currentManualAccess.grantedByUserId,
            grantedByEmail:
              operation === "grant"
                ? requester.email || undefined
                : currentManualAccess.grantedByEmail,
            expiresAt: parsedExpiresAt,
            revokedAt: undefined,
            revokedByUserId: undefined,
            revokedByEmail: undefined,
            paymentCollectionNote:
              sanitizeText(paymentCollectionNote) ||
              currentManualAccess.paymentCollectionNote ||
              undefined,
          };

    const accessFields = buildResolvedAccessFields({
      ...existingUser,
      manualProBetaAccess: nextManualAccess,
    });
    const nextBetaFunnel =
      operation === "grant"
        ? markBetaFunnelMilestone({
            funnel: existingUser.betaFunnel,
            key: "manualProGrantAppliedAt",
          })
        : existingUser.betaFunnel;

    await users.updateOne(
      { _id: existingUser._id },
      {
        $set: {
          manualProBetaAccess: nextManualAccess,
          betaFunnel: nextBetaFunnel,
          productPlan: accessFields.productPlan,
          entitlements: accessFields.entitlements,
          updatedAt: now,
        },
      }
    );

    const updatedUser = await users.findOne({ _id: existingUser._id });
    return res.status(200).json({
      user: updatedUser ? serializeUser(updatedUser) : null,
    });
  }

  return res.status(405).json({ message: "Method Not Allowed" });
}
