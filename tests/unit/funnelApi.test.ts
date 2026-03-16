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

  async updateOne(filter: Query, update: Update) {
    const index = this.docs.findIndex((doc) => matchesQuery(doc, filter));
    if (index === -1) {
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
      },
    });
    const res = createMockResponse();

    await handler(req, res as any);

    expect(res.statusCode).toBe(200);
    expect(db.userDocs[0].betaFunnel.pricingPageViewedAt).toBeInstanceOf(Date);
  });

  it("returns the monetization summary for admins", async () => {
    mocks.getServerSession.mockResolvedValue({
      user: {
        _id: new ObjectId().toString(),
        username: "grwyler",
        email: "grwyler@gmail.com",
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
      checkoutStarts: 1,
      checkoutCompletions: 1,
      manualProGrants: 1,
      activePaidUsers: 2,
      pricingToCheckoutStartRate: 0.5,
      pricingToPaidRate: 1,
      checkoutCompletionRate: 1,
      cancellationRate: 0,
    });
  });
});
