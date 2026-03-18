import { ObjectId } from "mongodb";
import { beforeEach, describe, expect, it, vi } from "vitest";
import handler from "../../pages/api/funnel";

const mocks = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  connectToDatabase: vi.fn(),
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

type Query = Record<string, unknown>;
type Update = {
  $set?: Record<string, unknown>;
};

const matchesQuery = (doc: Record<string, any>, query: Query = {}) =>
  Object.entries(query).every(([key, expected]) => {
    if (key === "_id" && expected instanceof ObjectId) {
      return String(doc[key]) === expected.toString();
    }

    return doc[key] === expected;
  });

class MockCollection<T extends Record<string, any>> {
  constructor(private readonly docs: T[]) {}

  async findOne(query: Query) {
    return this.docs.find((doc) => matchesQuery(doc, query)) ?? null;
  }

  find() {
    return {
      toArray: async () => this.docs,
    };
  }

  async updateOne(filter: Query, update: Update, options?: { upsert?: boolean }) {
    const index = this.docs.findIndex((doc) => matchesQuery(doc, filter));
    if (index === -1) {
      if (options?.upsert) {
        this.docs.push({
          ...(filter as T),
          ...(update.$set || {}),
        });
        return { modifiedCount: 0, upsertedCount: 1 };
      }

      return { modifiedCount: 0 };
    }

    this.docs[index] = {
      ...this.docs[index],
      ...(update.$set || {}),
    };

    return { modifiedCount: 1 };
  }
}

class MockDb {
  userDocs: Array<Record<string, any>> = [];
  anonymousFunnelDocs: Array<Record<string, any>> = [];

  collection(name: string) {
    if (name === "users") {
      return new MockCollection(this.userDocs);
    }
    if (name === "anonymousBetaFunnels") {
      return new MockCollection(this.anonymousFunnelDocs);
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
}: {
  method: string;
  body?: unknown;
  query?: Query;
}) =>
  ({
    method,
    body: body ?? {},
    query: query ?? {},
  } as any);

describe("funnel API", () => {
  let db: MockDb;
  let userId: ObjectId;

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
      },
      {
        _id: new ObjectId(),
        username: "paid",
        email: "paid@example.com",
        billingPlan: "pro_beta",
        subscriptionStatus: "active",
        betaFunnel: {
          pricingPageViewedAt: new Date("2026-03-10T00:00:00.000Z"),
          checkoutStartedAt: new Date("2026-03-10T00:05:00.000Z"),
          checkoutCompletedAt: new Date("2026-03-10T00:10:00.000Z"),
        },
      },
      {
        _id: new ObjectId(),
        username: "manual",
        email: "manual@example.com",
        billingPlan: "free",
        subscriptionStatus: "inactive",
        manualProBetaAccess: {
          grantedAt: new Date("2026-03-11T00:00:00.000Z"),
        },
        betaFunnel: {
          pricingPageViewedAt: new Date("2026-03-11T00:00:00.000Z"),
          upgradePromptViewedAt: new Date("2026-03-11T00:01:00.000Z"),
          manualProGrantAppliedAt: new Date("2026-03-11T00:02:00.000Z"),
        },
      },
    ];

    mocks.getServerSession.mockReset();
    mocks.connectToDatabase.mockReset();
    mocks.connectToDatabase.mockResolvedValue(db);
  });

  it("stores supported monetization milestones for the authenticated user", async () => {
    mocks.getServerSession.mockResolvedValue({
      user: {
        _id: userId.toString(),
        username: "athlete",
        email: "athlete@example.com",
      },
    });

    const req = createMockRequest({
      method: "POST",
      body: {
        milestone: "pricing_page_viewed",
        source: "pricing_page_authenticated",
      },
    });
    const res = createMockResponse();

    await handler(req, res as any);

    expect(res.statusCode).toBe(200);
    expect(db.userDocs[0].betaFunnel.pricingPageViewedAt).toBeInstanceOf(Date);
    expect(db.userDocs[0].betaFunnel.pricingPageViewSources).toEqual({
      pricing_page_authenticated: 1,
    });
  });

  it("stores anonymous funnel milestones without an authenticated session", async () => {
    mocks.getServerSession.mockResolvedValue(null);

    const req = createMockRequest({
      method: "POST",
      body: {
        milestone: "landing_page_viewed",
        anonymousFunnelId: "anon_123",
        source: "landing_page",
      },
    });
    const res = createMockResponse();

    await handler(req, res as any);

    expect(res.statusCode).toBe(200);
    expect(db.anonymousFunnelDocs[0]).toMatchObject({
      anonymousFunnelId: "anon_123",
    });
    expect(db.anonymousFunnelDocs[0].betaFunnel.landingPageViewSources).toEqual({
      landing_page: 1,
    });
  });

  it("merges anonymous funnel data into the authenticated user funnel", async () => {
    db.anonymousFunnelDocs = [
      {
        anonymousFunnelId: "anon_123",
        betaFunnel: {
          anonymousFunnelId: "anon_123",
          landingPageViewedAt: new Date("2026-03-08T00:00:00.000Z"),
          pricingPageViewedAt: new Date("2026-03-08T00:05:00.000Z"),
          pricingPageViewSources: {
            pricing_page_anonymous: 1,
          },
        },
      },
    ];
    mocks.getServerSession.mockResolvedValue({
      user: {
        _id: userId.toString(),
        username: "athlete",
        email: "athlete@example.com",
      },
    });

    const req = createMockRequest({
      method: "POST",
      body: {
        action: "mergeAnonymousFunnel",
        anonymousFunnelId: "anon_123",
      },
    });
    const res = createMockResponse();

    await handler(req, res as any);

    expect(res.statusCode).toBe(200);
    expect(db.userDocs[0].betaFunnel.anonymousFunnelId).toBe("anon_123");
    expect(db.userDocs[0].betaFunnel.pricingPageViewSources).toEqual({
      pricing_page_anonymous: 1,
    });
    expect(db.anonymousFunnelDocs[0].mergedUserId).toEqual(new ObjectId(userId.toString()));
  });

  it("returns the monetization summary for admins", async () => {
    mocks.getServerSession.mockResolvedValue({
      user: {
        _id: new ObjectId().toString(),
        username: "workflow-admin",
        email: "admin@example.com",
        permissions: {
          bugWorkflowAdmin: true,
        },
      },
    });

    const req = createMockRequest({
      method: "GET",
      query: {
        summary: "monetization",
      },
    });
    const res = createMockResponse();

    await handler(req, res as any);

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      pricingPageViews: 2,
      upgradePromptViews: 1,
      upgradePromptClicks: 0,
      checkoutStarts: 1,
      checkoutCompletions: 1,
      manualProGrants: 1,
      activePaidUsers: 2,
      pricingToCheckoutStartRate: 0.5,
      pricingToPaidRate: 1,
      checkoutCompletionRate: 1,
      cancellationRate: 0,
      anonymousStage: {
        landingPageViews: 0,
        pricingPageViews: 0,
        upgradePromptViews: 0,
        upgradePromptClicks: 0,
        checkoutStarts: 0,
      },
    });
  });

  it("returns a degraded empty monetization summary when the database is unavailable", async () => {
    mocks.getServerSession.mockResolvedValue({
      user: {
        _id: new ObjectId().toString(),
        username: "workflow-admin",
        email: "admin@example.com",
        permissions: {
          bugWorkflowAdmin: true,
        },
      },
    });
    mocks.connectToDatabase.mockRejectedValue(new Error("db unavailable"));

    const req = createMockRequest({
      method: "GET",
      query: {
        summary: "monetization",
      },
    });
    const res = createMockResponse();

    await handler(req, res as any);

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      degraded: true,
      pricingPageViews: 0,
      checkoutStarts: 0,
      checkoutCompletions: 0,
      activePaidUsers: 0,
      cancellationRate: 0,
      anonymousStage: {
        landingPageViews: 0,
      },
    });
  });
});
