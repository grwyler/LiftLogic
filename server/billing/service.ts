import { Db, ObjectId } from "mongodb";
import Stripe from "stripe";
import {
  BillingPlan,
  BillingSubscriptionStatus,
  BillingSummaryResponse,
  UserDoc,
} from "../../utils/types";
import {
  getEntitlementsForPlan,
  hasActiveManualProBetaAccess,
} from "../../utils/entitlements";
import { markBetaFunnelMilestone } from "../../utils/betaFunnel";
import { getBillingPriceOptions, StripeBillingConfig } from "./config";

let billingIndexesReady = false;

const subscriptionStatuses: BillingSubscriptionStatus[] = [
  "inactive",
  "trialing",
  "active",
  "past_due",
  "canceled",
  "unpaid",
  "incomplete",
  "incomplete_expired",
  "paused",
];

const sanitizeText = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

const normalizeBillingStatus = (value: unknown): BillingSubscriptionStatus => {
  const normalized = sanitizeText(value);
  return subscriptionStatuses.includes(normalized as BillingSubscriptionStatus)
    ? (normalized as BillingSubscriptionStatus)
    : "inactive";
};

const hasProBetaAccessForStatus = (status: BillingSubscriptionStatus) =>
  status === "trialing" ||
  status === "active" ||
  status === "past_due" ||
  status === "unpaid";

export const getBillingPlanFromStatus = (
  status: BillingSubscriptionStatus
): BillingPlan => (hasProBetaAccessForStatus(status) ? "pro_beta" : "free");

const toObjectId = (value?: string) =>
  value && ObjectId.isValid(value) ? new ObjectId(value) : null;

const getUserCollection = (db: Db) => db.collection<UserDoc>("users");

const markUserBetaFunnelMilestone = async ({
  db,
  userId,
  key,
  occurredAt,
}: {
  db: Db;
  userId?: string;
  key: keyof NonNullable<UserDoc["betaFunnel"]>;
  occurredAt?: Date | string | null;
}) => {
  const objectId = toObjectId(sanitizeText(userId));
  if (!objectId) {
    return;
  }

  const users = getUserCollection(db);
  const user = await users.findOne(
    { _id: objectId },
    { projection: { betaFunnel: 1 } }
  );

  if (!user) {
    return;
  }

  await users.updateOne(
    { _id: objectId },
    {
      $set: {
        betaFunnel: markBetaFunnelMilestone({
          funnel: user.betaFunnel,
          key,
          occurredAt,
        }),
        updatedAt: new Date(),
      },
    }
  );
};

const buildBillingUpdate = (update: Partial<UserDoc>) => {
  const setFields: Record<string, unknown> = {};
  const unsetFields: Record<string, "" | 1> = {};

  Object.entries(update).forEach(([key, value]) => {
    if (typeof value === "undefined") {
      unsetFields[key] = "";
      return;
    }

    setFields[key] = value;
  });

  return {
    ...(Object.keys(setFields).length > 0 ? { $set: setFields } : {}),
    ...(Object.keys(unsetFields).length > 0 ? { $unset: unsetFields } : {}),
  };
};

export const ensureBillingUserIndexes = async (db: Db) => {
  if (billingIndexesReady) {
    return;
  }

  const users = getUserCollection(db);
  await Promise.all([
    users.createIndex(
      { stripeCustomerId: 1 },
      { sparse: true, name: "billing_customer_id" }
    ),
    users.createIndex(
      { stripeSubscriptionId: 1 },
      { sparse: true, name: "billing_subscription_id" }
    ),
  ]);

  billingIndexesReady = true;
};

export const buildBillingSummary = ({
  user,
  config,
}: {
  user?: UserDoc | null;
  config: StripeBillingConfig;
}): BillingSummaryResponse => {
  const subscriptionStatus = normalizeBillingStatus(user?.subscriptionStatus);
  const manualProBetaAccessActive = hasActiveManualProBetaAccess(user);
  const billingPlan =
    manualProBetaAccessActive
      ? "pro_beta"
      : user?.billingPlan || getBillingPlanFromStatus(subscriptionStatus);
  const manualProBetaAccessExpiresAt = user?.manualProBetaAccess?.expiresAt
    ? new Date(user.manualProBetaAccess.expiresAt).toISOString()
    : undefined;

  return {
    configured: config.checkoutEnabled,
    portalEnabled: Boolean(config.secretKey && user?.stripeCustomerId),
    billingPlan,
    subscriptionStatus,
    manualProBetaAccessActive,
    manualProBetaAccessExpiresAt,
    subscriptionInterval: user?.subscriptionInterval,
    stripeCustomerId: user?.stripeCustomerId,
    stripeSubscriptionId: user?.stripeSubscriptionId,
    billingEmail: user?.billingEmail || user?.email,
    cancelAtPeriodEnd: Boolean(user?.subscriptionCancelAtPeriodEnd),
    currentPeriodEnd: user?.subscriptionCurrentPeriodEnd
      ? new Date(user.subscriptionCurrentPeriodEnd).toISOString()
      : undefined,
    prices: getBillingPriceOptions(config),
  };
};

export const hasActiveBillingAccess = (user?: UserDoc | null) =>
  hasProBetaAccessForStatus(normalizeBillingStatus(user?.subscriptionStatus));

const resolveSubscriptionInterval = (
  intervalValue?: string | null
): UserDoc["subscriptionInterval"] => {
  if (intervalValue === "year") {
    return "year";
  }

  if (intervalValue === "month") {
    return "month";
  }

  return undefined;
};

const getSubscriptionItem = (subscription: Stripe.Subscription) =>
  subscription.items.data[0];

const getSubscriptionCurrentPeriodEnd = (subscription: Stripe.Subscription) => {
  const currentPeriodEnd = (subscription as any).current_period_end;
  return typeof currentPeriodEnd === "number" ? currentPeriodEnd : undefined;
};

const findUserByIdentity = async ({
  db,
  userId,
  customerId,
  subscriptionId,
  email,
}: {
  db: Db;
  userId?: string;
  customerId?: string;
  subscriptionId?: string;
  email?: string;
}) => {
  const users = getUserCollection(db);
  const objectId = toObjectId(sanitizeText(userId));
  if (objectId) {
    const user = await users.findOne({ _id: objectId });
    if (user) {
      return user;
    }
  }

  const normalizedSubscriptionId = sanitizeText(subscriptionId);
  if (normalizedSubscriptionId) {
    const user = await users.findOne({
      stripeSubscriptionId: normalizedSubscriptionId,
    });
    if (user) {
      return user;
    }
  }

  const normalizedCustomerId = sanitizeText(customerId);
  if (normalizedCustomerId) {
    const user = await users.findOne({
      stripeCustomerId: normalizedCustomerId,
    });
    if (user) {
      return user;
    }
  }

  const normalizedEmail = sanitizeText(email).toLowerCase();
  if (normalizedEmail) {
    return users.findOne({ email: normalizedEmail });
  }

  return null;
};

export const syncStripeCustomer = async ({
  db,
  customer,
}: {
  db: Db;
  customer: Stripe.Customer;
}) => {
  await ensureBillingUserIndexes(db);

  const customerId = sanitizeText(customer.id);
  const email = sanitizeText(customer.email).toLowerCase();
  if (!customerId) {
    return null;
  }

  const user = await findUserByIdentity({
    db,
    customerId,
    email,
  });

  if (!user?._id) {
    return null;
  }

  await getUserCollection(db).updateOne(
    { _id: user._id },
    buildBillingUpdate({
      stripeCustomerId: customerId,
      billingEmail: email || undefined,
      updatedAt: new Date(),
    })
  );

  return String(user._id);
};

export const syncStripeSubscription = async ({
  db,
  subscription,
  fallbackUserId,
  customerEmail,
}: {
  db: Db;
  subscription: Stripe.Subscription;
  fallbackUserId?: string;
  customerEmail?: string;
}) => {
  await ensureBillingUserIndexes(db);

  const item = getSubscriptionItem(subscription);
  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer?.id;
  const productId =
    typeof item?.price?.product === "string"
      ? item.price.product
      : item?.price?.product?.id;
  const status = normalizeBillingStatus(subscription.status);
  const billingPlan = getBillingPlanFromStatus(status);
  const productPlan = billingPlan === "pro_beta" ? "premium" : "free";
  const billingEmail = sanitizeText(customerEmail).toLowerCase();

  const user = await findUserByIdentity({
    db,
    userId: sanitizeText(subscription.metadata?.userId) || fallbackUserId,
    customerId,
    subscriptionId: subscription.id,
    email: billingEmail,
  });

  if (!user?._id) {
    return null;
  }

  await getUserCollection(db).updateOne(
    { _id: user._id },
    buildBillingUpdate({
      billingPlan,
      productPlan,
      entitlements: getEntitlementsForPlan(productPlan),
      stripeCustomerId: sanitizeText(customerId) || undefined,
      stripeSubscriptionId: sanitizeText(subscription.id) || undefined,
      stripePriceId: sanitizeText(item?.price?.id) || undefined,
      stripeProductId: sanitizeText(productId) || undefined,
      subscriptionStatus: status,
      subscriptionInterval: resolveSubscriptionInterval(item?.price?.recurring?.interval),
      subscriptionCurrentPeriodEnd: getSubscriptionCurrentPeriodEnd(subscription)
        ? new Date(getSubscriptionCurrentPeriodEnd(subscription)! * 1000)
        : undefined,
      subscriptionCancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end),
      subscriptionCanceledAt: subscription.canceled_at
        ? new Date(subscription.canceled_at * 1000)
        : undefined,
      billingEmail: billingEmail || user.email || undefined,
      updatedAt: new Date(),
    })
  );

  if (Boolean(subscription.cancel_at_period_end)) {
    await markUserBetaFunnelMilestone({
      db,
      userId: String(user._id),
      key: "cancelRequestedAt",
      occurredAt: new Date(),
    });
  }

  if (status === "canceled") {
    await markUserBetaFunnelMilestone({
      db,
      userId: String(user._id),
      key: "subscriptionCanceledAt",
      occurredAt: subscription.canceled_at
        ? new Date(subscription.canceled_at * 1000)
        : new Date(),
    });
  }

  return String(user._id);
};

export const syncStripeCheckoutSession = async ({
  db,
  stripe,
  session,
}: {
  db: Db;
  stripe: Stripe;
  session: Stripe.Checkout.Session;
}) => {
  await ensureBillingUserIndexes(db);

  const customerId =
    typeof session.customer === "string" ? session.customer : session.customer?.id;
  const customerEmail = sanitizeText(
    session.customer_details?.email || session.customer_email
  ).toLowerCase();
  const fallbackUserId =
    sanitizeText(session.metadata?.userId) || sanitizeText(session.client_reference_id);
  const subscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription?.id;

  if (subscriptionId) {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const syncedUserId = await syncStripeSubscription({
      db,
      subscription,
      fallbackUserId,
      customerEmail,
    });

    await markUserBetaFunnelMilestone({
      db,
      userId: syncedUserId || fallbackUserId,
      key: "checkoutCompletedAt",
      occurredAt: new Date(),
    });

    return syncedUserId;
  }

  const user = await findUserByIdentity({
    db,
    userId: fallbackUserId,
    customerId,
    email: customerEmail,
  });

  if (!user?._id) {
    return null;
  }

  await getUserCollection(db).updateOne(
    { _id: user._id },
    buildBillingUpdate({
      stripeCustomerId: sanitizeText(customerId) || undefined,
      billingEmail: customerEmail || user.email || undefined,
      updatedAt: new Date(),
    })
  );

  await markUserBetaFunnelMilestone({
    db,
    userId: String(user._id),
    key: "checkoutCompletedAt",
    occurredAt: new Date(),
  });

  return String(user._id);
};
