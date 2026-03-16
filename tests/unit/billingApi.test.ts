import { ObjectId } from "mongodb";
import { beforeEach, describe, expect, it, vi } from "vitest";
import summaryHandler from "../../pages/api/billing/summary";
import checkoutHandler from "../../pages/api/billing/create-checkout-session";
import portalHandler from "../../pages/api/billing/create-portal-session";
import webhookHandler from "../../pages/api/billing/webhook";

const mocks = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  connectToDatabase: vi.fn(),
  getStripeBillingConfig: vi.fn(),
  getStripeClient: vi.fn(),
  readRawRequestBody: vi.fn(),
}));

vi.mock("next-auth/next", () => ({
  getServerSession: mocks.getServerSession,
}));

vi.mock("../../utils/mongodb", () => ({
  connectToDatabase: mocks.connectToDatabase,
}));

vi.mock("../../pages/api/auth/[...nextauth]", () => ({
  authOptions: {},
}));

vi.mock("../../server/billing/config", async () => {
  const actual = await vi.importActual<typeof import("../../server/billing/config")>(
    "../../server/billing/config"
  );

  return {
    ...actual,
    getStripeBillingConfig: mocks.getStripeBillingConfig,
  };
});

vi.mock("../../server/billing/stripe", () => ({
  getStripeClient: mocks.getStripeClient,
}));

vi.mock("../../server/billing/rawBody", () => ({
  readRawRequestBody: mocks.readRawRequestBody,
}));

type Query = Record<string, unknown>;
type Update = {
  $set?: Record<string, unknown>;
  $unset?: Record<string, unknown>;
};

const normalizeValue = (value: unknown) => {
  if (value instanceof ObjectId) {
    return value.toString();
  }

  if (value instanceof Date) {
    return value.getTime();
  }

  return value;
};

const matchesQuery = (doc: Record<string, any>, query: Query = {}) =>
  Object.entries(query).every(([key, expected]) => {
    if (key === "_id" && expected instanceof ObjectId) {
      return String(doc[key]) === expected.toString();
    }

    return normalizeValue(doc[key]) === normalizeValue(expected);
  });

class MockCollection<T extends Record<string, any>> {
  constructor(private readonly docs: T[]) {}

  async createIndex() {
    return "mock-index";
  }

  async findOne(query: Query) {
    return this.docs.find((doc) => matchesQuery(doc, query)) ?? null;
  }

  async updateOne(filter: Query, update: Update) {
    const index = this.docs.findIndex((doc) => matchesQuery(doc, filter));
    if (index === -1) {
      return { modifiedCount: 0 };
    }

    const next = {
      ...this.docs[index],
      ...(update.$set ?? {}),
    };

    Object.keys(update.$unset ?? {}).forEach((key) => {
      delete (next as Record<string, unknown>)[key];
    });

    this.docs[index] = next;
    return { modifiedCount: 1 };
  }
}

class MockDb {
  userDocs: Array<Record<string, any>> = [];

  collection(name: string) {
    if (name === "users") {
      return new MockCollection(this.userDocs);
    }

    throw new Error(`Unexpected collection: ${name}`);
  }
}

const createMockResponse = () => {
  const response = {
    statusCode: 200,
    body: undefined as any,
    headers: {} as Record<string, string | string[] | undefined>,
    status(code: number) {
      response.statusCode = code;
      return response;
    },
    json(payload: any) {
      response.body = payload;
      return response;
    },
    setHeader(name: string, value: string | string[]) {
      response.headers[name] = value;
      return response;
    },
  };

  return response;
};

const createMockRequest = ({
  method,
  body,
  query,
  headers,
}: {
  method: string;
  body?: unknown;
  query?: Query;
  headers?: Record<string, string>;
}) =>
  ({
    method,
    body: body ?? {},
    query: query ?? {},
    headers: headers ?? {},
    [Symbol.asyncIterator]: async function* () {},
  } as any);

describe("billing API routes", () => {
  let db: MockDb;
  let userId: ObjectId;
  let stripeMock: any;

  beforeEach(() => {
    db = new MockDb();
    userId = new ObjectId();
    db.userDocs = [
      {
        _id: userId,
        username: "athlete",
        email: "athlete@example.com",
        billingPlan: "free",
        subscriptionStatus: "inactive",
        subscriptionCancelAtPeriodEnd: false,
      },
    ];

    stripeMock = {
      checkout: {
        sessions: {
          create: vi.fn(),
        },
      },
      billingPortal: {
        sessions: {
          create: vi.fn(),
        },
      },
      webhooks: {
        constructEvent: vi.fn(),
      },
      subscriptions: {
        retrieve: vi.fn(),
      },
    };

    mocks.getServerSession.mockReset();
    mocks.connectToDatabase.mockReset();
    mocks.getStripeBillingConfig.mockReset();
    mocks.getStripeClient.mockReset();
    mocks.readRawRequestBody.mockReset();

    mocks.getServerSession.mockResolvedValue({
      user: {
        _id: userId.toString(),
        username: "athlete",
        email: "athlete@example.com",
      },
    });
    mocks.connectToDatabase.mockResolvedValue(db);
    mocks.getStripeBillingConfig.mockReturnValue({
      secretKey: "sk_test_123",
      webhookSecret: "whsec_123",
      prices: [
        {
          interval: "month",
          priceId: "price_month",
          label: "$12 / month",
        },
        {
          interval: "year",
          priceId: "price_year",
          label: "$79 / year",
        },
      ],
      checkoutEnabled: true,
    });
    mocks.getStripeClient.mockReturnValue(stripeMock);
    mocks.readRawRequestBody.mockResolvedValue(Buffer.from("payload"));
    process.env.NEXTAUTH_URL = "https://liftlogic.test";
  });

  it("returns a billing summary for the authenticated user", async () => {
    const req = createMockRequest({ method: "GET" });
    const res = createMockResponse();

    await summaryHandler(req, res as any);

    expect(res.statusCode).toBe(200);
    expect(res.body.billingPlan).toBe("free");
    expect(res.body.subscriptionStatus).toBe("inactive");
    expect(res.body.portalEnabled).toBe(false);
    expect(res.body.prices).toHaveLength(2);
    expect(res.body.prices[0]).toMatchObject({
      interval: "month",
      label: "$12 / month",
      checkoutEnabled: true,
    });
  });

  it("reports pro beta in billing summary when manual founding-beta access is active", async () => {
    db.userDocs[0].manualProBetaAccess = {
      grantedAt: new Date("2026-03-16T00:00:00.000Z"),
      paymentCollectionNote: "Manual Venmo payment",
      expiresAt: new Date("2026-04-16T00:00:00.000Z"),
    };

    const req = createMockRequest({ method: "GET" });
    const res = createMockResponse();

    await summaryHandler(req, res as any);

    expect(res.statusCode).toBe(200);
    expect(res.body.billingPlan).toBe("pro_beta");
    expect(res.body.manualProBetaAccessActive).toBe(true);
    expect(res.body.manualProBetaAccessExpiresAt).toBe(
      new Date("2026-04-16T00:00:00.000Z").toISOString()
    );
    expect(res.body.portalEnabled).toBe(false);
  });

  it("creates a Stripe checkout session for a valid self-serve upgrade", async () => {
    stripeMock.checkout.sessions.create.mockResolvedValue({
      url: "https://checkout.stripe.com/session_123",
    });

    const req = createMockRequest({
      method: "POST",
      body: {
        interval: "month",
      },
      headers: {
        host: "liftlogic.test",
      },
    });
    const res = createMockResponse();

    await checkoutHandler(req, res as any);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      url: "https://checkout.stripe.com/session_123",
    });
    expect(stripeMock.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: "subscription",
        success_url: "https://liftlogic.test/pricing?checkout=success",
        cancel_url: "https://liftlogic.test/pricing?checkout=cancelled",
        client_reference_id: userId.toString(),
        customer_email: "athlete@example.com",
        metadata: expect.objectContaining({
          userId: userId.toString(),
          billingInterval: "month",
        }),
      })
    );
    expect(db.userDocs[0].betaFunnel.checkoutStartedAt).toBeInstanceOf(Date);
  });

  it("creates a billing portal session for an existing Stripe customer", async () => {
    db.userDocs[0].stripeCustomerId = "cus_123";
    db.userDocs[0].billingPlan = "pro_beta";
    db.userDocs[0].subscriptionStatus = "active";
    stripeMock.billingPortal.sessions.create.mockResolvedValue({
      url: "https://billing.stripe.com/session_123",
    });

    const req = createMockRequest({ method: "POST" });
    const res = createMockResponse();

    await portalHandler(req, res as any);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      url: "https://billing.stripe.com/session_123",
    });
    expect(stripeMock.billingPortal.sessions.create).toHaveBeenCalledWith({
      customer: "cus_123",
      return_url: "https://liftlogic.test/pricing?portal=returned",
    });
    expect(db.userDocs[0].betaFunnel.billingPortalOpenedAt).toBeInstanceOf(Date);
  });

  it("syncs Stripe checkout completion through the webhook route", async () => {
    const activeSubscription = {
      id: "sub_123",
      customer: "cus_123",
      status: "active",
      metadata: {
        userId: userId.toString(),
      },
      current_period_end: 1_781_776_800,
      cancel_at_period_end: false,
      canceled_at: null,
      items: {
        data: [
          {
            price: {
              id: "price_month",
              product: "prod_123",
              recurring: {
                interval: "month",
              },
            },
          },
        ],
      },
    };

    stripeMock.webhooks.constructEvent.mockReturnValue({
      type: "checkout.session.completed",
      data: {
        object: {
          customer: "cus_123",
          customer_details: {
            email: "athlete@example.com",
          },
          metadata: {
            userId: userId.toString(),
          },
          client_reference_id: userId.toString(),
          subscription: "sub_123",
        },
      },
    });
    stripeMock.subscriptions.retrieve.mockResolvedValue(activeSubscription);

    const req = createMockRequest({
      method: "POST",
      headers: {
        "stripe-signature": "sig_test_123",
      },
    });
    const res = createMockResponse();

    await webhookHandler(req, res as any);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ received: true });
    expect(db.userDocs[0]).toMatchObject({
      billingPlan: "pro_beta",
      productPlan: "premium",
      entitlements: {
        assistantPlanGeneration: true,
        assistantPlanRegeneration: true,
        recurringWorkoutScheduling: true,
        progressionRecommendations: true,
      },
      stripeCustomerId: "cus_123",
      stripeSubscriptionId: "sub_123",
      stripePriceId: "price_month",
      stripeProductId: "prod_123",
      subscriptionStatus: "active",
      subscriptionInterval: "month",
      subscriptionCancelAtPeriodEnd: false,
      billingEmail: "athlete@example.com",
    });
    expect(db.userDocs[0].subscriptionCurrentPeriodEnd).toBeInstanceOf(Date);
    expect(db.userDocs[0].betaFunnel.checkoutCompletedAt).toBeInstanceOf(Date);
  });

  it("tracks cancel requested and subscription canceled milestones from Stripe webhooks", async () => {
    stripeMock.webhooks.constructEvent
      .mockReturnValueOnce({
        type: "customer.subscription.updated",
        data: {
          object: {
            id: "sub_123",
            customer: "cus_123",
            status: "active",
            metadata: {
              userId: userId.toString(),
            },
            current_period_end: 1_781_776_800,
            cancel_at_period_end: true,
            canceled_at: null,
            items: {
              data: [
                {
                  price: {
                    id: "price_month",
                    product: "prod_123",
                    recurring: {
                      interval: "month",
                    },
                  },
                },
              ],
            },
          },
        },
      })
      .mockReturnValueOnce({
        type: "customer.subscription.deleted",
        data: {
          object: {
            id: "sub_123",
            customer: "cus_123",
            status: "canceled",
            metadata: {
              userId: userId.toString(),
            },
            current_period_end: 1_781_776_800,
            cancel_at_period_end: true,
            canceled_at: 1_781_700_000,
            items: {
              data: [
                {
                  price: {
                    id: "price_month",
                    product: "prod_123",
                    recurring: {
                      interval: "month",
                    },
                  },
                },
              ],
            },
          },
        },
      });

    const req = createMockRequest({
      method: "POST",
      headers: {
        "stripe-signature": "sig_test_123",
      },
    });

    const firstRes = createMockResponse();
    await webhookHandler(req, firstRes as any);

    const secondRes = createMockResponse();
    await webhookHandler(req, secondRes as any);

    expect(firstRes.statusCode).toBe(200);
    expect(secondRes.statusCode).toBe(200);
    expect(db.userDocs[0].betaFunnel.cancelRequestedAt).toBeInstanceOf(Date);
    expect(db.userDocs[0].betaFunnel.subscriptionCanceledAt).toBeInstanceOf(Date);
  });
});
