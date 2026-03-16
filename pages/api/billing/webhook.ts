import { NextApiRequest, NextApiResponse } from "next";
import Stripe from "stripe";
import { connectToDatabase } from "../../../utils/mongodb";
import { getStripeBillingConfig } from "../../../server/billing/config";
import { readRawRequestBody } from "../../../server/billing/rawBody";
import { getStripeClient } from "../../../server/billing/stripe";
import {
  ensureBillingUserIndexes,
  syncStripeCheckoutSession,
  syncStripeCustomer,
  syncStripeSubscription,
} from "../../../server/billing/service";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const { webhookSecret } = getStripeBillingConfig();
  if (!webhookSecret) {
    return res.status(503).json({
      message: "Stripe webhook secret is not configured.",
    });
  }

  const signature = req.headers["stripe-signature"];
  if (!signature || Array.isArray(signature)) {
    return res.status(400).json({ message: "Missing Stripe signature." });
  }

  let event: Stripe.Event;
  try {
    const stripe = getStripeClient();
    const rawBody = await readRawRequestBody(req);
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to verify webhook signature.";
    return res.status(400).json({ message });
  }

  try {
    const stripe = getStripeClient();
    const db = await connectToDatabase();
    await ensureBillingUserIndexes(db);

    switch (event.type) {
      case "checkout.session.completed":
        await syncStripeCheckoutSession({
          db,
          stripe,
          session: event.data.object as Stripe.Checkout.Session,
        });
        break;
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await syncStripeSubscription({
          db,
          subscription: event.data.object as Stripe.Subscription,
        });
        break;
      case "customer.updated":
        await syncStripeCustomer({
          db,
          customer: event.data.object as Stripe.Customer,
        });
        break;
      default:
        break;
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error("Stripe webhook processing error:", error);
    return res.status(500).json({ message: "Unable to process Stripe webhook." });
  }
}
