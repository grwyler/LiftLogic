import { NextApiRequest } from "next";
import { BillingInterval, BillingPriceOption } from "../../utils/types";

const sanitizeText = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

export interface StripeBillingPriceConfig {
  interval: BillingInterval;
  priceId: string;
  label: string;
}

export interface StripeBillingConfig {
  secretKey: string;
  webhookSecret: string;
  prices: StripeBillingPriceConfig[];
  checkoutEnabled: boolean;
}

const billingLabelDefaults: Record<BillingInterval, string> = {
  month: "$12 / month",
  year: "$79 / year",
};

const buildPriceConfig = (
  interval: BillingInterval,
  priceIdValue: unknown,
  labelValue: unknown
) => {
  const priceId = sanitizeText(priceIdValue);
  if (!priceId) {
    return null;
  }

  return {
    interval,
    priceId,
    label: sanitizeText(labelValue) || billingLabelDefaults[interval],
  } satisfies StripeBillingPriceConfig;
};

export const getStripeBillingConfig = (): StripeBillingConfig => {
  const secretKey = sanitizeText(process.env.STRIPE_SECRET_KEY);
  const webhookSecret = sanitizeText(process.env.STRIPE_WEBHOOK_SECRET);
  const prices = [
    buildPriceConfig(
      "month",
      process.env.STRIPE_PRO_BETA_MONTHLY_PRICE_ID,
      process.env.NEXT_PUBLIC_STRIPE_PRO_BETA_MONTHLY_LABEL
    ),
    buildPriceConfig(
      "year",
      process.env.STRIPE_PRO_BETA_YEARLY_PRICE_ID,
      process.env.NEXT_PUBLIC_STRIPE_PRO_BETA_YEARLY_LABEL
    ),
  ].filter(Boolean) as StripeBillingPriceConfig[];

  return {
    secretKey,
    webhookSecret,
    prices,
    checkoutEnabled: Boolean(secretKey && webhookSecret && prices.length > 0),
  };
};

export const getBillingPriceOptions = (
  config: StripeBillingConfig
): BillingPriceOption[] =>
  config.prices.map((price) => ({
    interval: price.interval,
    label: price.label,
    checkoutEnabled: config.checkoutEnabled,
  }));

const normalizeHostValue = (value: string) => value.replace(/\/+$/, "");

export const getAppUrl = (req?: NextApiRequest) => {
  const envUrl = sanitizeText(process.env.NEXTAUTH_URL);
  if (envUrl) {
    return normalizeHostValue(envUrl);
  }

  const forwardedProtoHeader = req?.headers["x-forwarded-proto"];
  const forwardedHostHeader = req?.headers["x-forwarded-host"];
  const hostHeader = req?.headers.host;

  const forwardedProto = Array.isArray(forwardedProtoHeader)
    ? forwardedProtoHeader[0]
    : forwardedProtoHeader;
  const forwardedHost = Array.isArray(forwardedHostHeader)
    ? forwardedHostHeader[0]
    : forwardedHostHeader;
  const host = Array.isArray(hostHeader) ? hostHeader[0] : hostHeader;

  if (forwardedHost || host) {
    const protocol = sanitizeText(forwardedProto) || "http";
    return `${protocol}://${sanitizeText(forwardedHost) || sanitizeText(host)}`;
  }

  return "http://localhost:3000";
};

export const findBillingPriceByInterval = (
  config: StripeBillingConfig,
  interval: string
) => config.prices.find((price) => price.interval === interval);
