import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { ObjectId } from "mongodb";
import { authOptions } from "../auth/[...nextauth]";
import { connectToDatabase } from "../../../utils/mongodb";
import {
  findBillingPriceByInterval,
  getAppUrl,
  getStripeBillingConfig,
} from "../../../server/billing/config";
import { getStripeClient } from "../../../server/billing/stripe";
import {
  ensureBillingUserIndexes,
  hasActiveBillingAccess,
} from "../../../server/billing/service";
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
  if (!config.checkoutEnabled) {
    return res.status(503).json({
      message: "Stripe billing is not fully configured for this environment.",
    });
  }

  const requestedInterval = sanitizeText(req.body?.interval).toLowerCase();
  const trialRequested = Boolean(req.body?.trialRequested);
  const trialDays = trialRequested ? 7 : 0;
  const price = findBillingPriceByInterval(config, requestedInterval);
  if (!price) {
    return res.status(400).json({ message: "Valid billing interval is required." });
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

    if (hasActiveBillingAccess(user)) {
      return res.status(409).json({
        message: "You already have an active Pro Beta subscription.",
      });
    }

    const stripe = getStripeClient();
    const appUrl = getAppUrl(req);
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [
        {
          price: price.priceId,
          quantity: 1,
        },
      ],
      success_url: `${appUrl}/pricing?checkout=success`,
      cancel_url: `${appUrl}/pricing?checkout=cancelled`,
      allow_promotion_codes: true,
      client_reference_id: userId,
      metadata: {
        userId,
        billingInterval: price.interval,
        trialRequested: trialRequested ? "true" : "false",
      },
      subscription_data: {
        ...(trialDays > 0 ? { trial_period_days: trialDays } : {}),
        metadata: {
          userId,
          billingInterval: price.interval,
          billingPlan: "pro_beta",
          trialRequested: trialRequested ? "true" : "false",
        },
      },
      ...(user.stripeCustomerId
        ? {
            customer: user.stripeCustomerId,
          }
        : {
            customer_email: sanitizeText(user.email) || undefined,
          }),
    });

    if (!checkoutSession.url) {
      return res.status(500).json({ message: "Stripe did not return a checkout URL." });
    }

    const nextBetaFunnel = markBetaFunnelMilestone({
      funnel: user.betaFunnel,
      key: "checkoutStartedAt",
    });

    await db.collection("users").updateOne(
      { _id: new ObjectId(userId) },
      {
        $set: {
          betaFunnel: nextBetaFunnel,
          updatedAt: new Date(),
        },
      }
    );

    return res.status(200).json({ url: checkoutSession.url });
  } catch (error) {
    console.error("Checkout session error:", error);
    return res.status(500).json({ message: "Unable to create checkout session." });
  }
}
