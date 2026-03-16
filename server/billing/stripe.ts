import Stripe from "stripe";
import { getStripeBillingConfig } from "./config";

let stripeClient: Stripe | null = null;

export const getStripeClient = () => {
  if (stripeClient) {
    return stripeClient;
  }

  const { secretKey } = getStripeBillingConfig();
  if (!secretKey) {
    throw new Error("Missing STRIPE_SECRET_KEY");
  }

  stripeClient = new Stripe(secretKey);
  return stripeClient;
};
