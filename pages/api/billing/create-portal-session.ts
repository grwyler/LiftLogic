import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { ObjectId } from "mongodb";
import { authOptions } from "../auth/[...nextauth]";
import { connectToDatabase } from "../../../utils/mongodb";
import { getAppUrl, getStripeBillingConfig } from "../../../server/billing/config";
import { getStripeClient } from "../../../server/billing/stripe";
import { ensureBillingUserIndexes } from "../../../server/billing/service";
import { markBetaFunnelMilestone } from "../../../utils/betaFunnel";

const sanitizeText = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const session = await getServerSession(req, res, authOptions);
  const userId = sanitizeText((session?.user as any)?._id || (session as any)?.token?.user?._id);

  if (!session || !ObjectId.isValid(userId)) {
    return res.status(401).json({ message: "Authentication required" });
  }

  const config = getStripeBillingConfig();
  if (!config.secretKey) {
    return res.status(503).json({
      message: "Stripe billing is not configured for this environment.",
    });
  }

  try {
    const db = await connectToDatabase();
    await ensureBillingUserIndexes(db);
    const user = await db.collection("users").findOne({
      _id: new ObjectId(userId),
    }) as any;

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const stripeCustomerId = sanitizeText(user.stripeCustomerId);
    if (!stripeCustomerId) {
      return res.status(400).json({
        message: "Billing portal is only available after a Stripe subscription exists.",
      });
    }

    const stripe = getStripeClient();
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: `${getAppUrl(req)}/pricing?portal=returned`,
    });

    await db.collection("users").updateOne(
      { _id: new ObjectId(userId) },
      {
        $set: {
          betaFunnel: markBetaFunnelMilestone({
            funnel: user.betaFunnel,
            key: "billingPortalOpenedAt",
          }),
          updatedAt: new Date(),
        },
      }
    );

    return res.status(200).json({ url: portalSession.url });
  } catch (error) {
    console.error("Billing portal session error:", error);
    return res.status(500).json({ message: "Unable to create billing portal session." });
  }
}
