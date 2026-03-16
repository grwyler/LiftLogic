import { ObjectId } from "mongodb";
import { beforeEach, describe, expect, it, vi } from "vitest";
import handler from "../../pages/api/admin/founding-beta";

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

const normalizeValue = (value: unknown) =>
  value instanceof ObjectId ? value.toString() : value;

const matchesQuery = (doc: Record<string, any>, query: Query = {}) =>
  Object.entries(query).every(([key, expected]) => {
    if (expected && typeof expected === "object" && "$or" in (expected as any)) {
      return true;
    }

    if (key === "$or") {
      return (expected as any[]).some((clause) =>
        Object.entries(clause).every(([field, matcher]) => {
          const regex = (matcher as any)?.$regex;
          if (!regex) {
            return false;
          }

          return String(doc[field] || "").toLowerCase().includes(String(regex).toLowerCase());
        })
      );
    }

    if (key === "_id" && expected instanceof ObjectId) {
      return String(doc[key]) === expected.toString();
    }

    return normalizeValue(doc[key]) === normalizeValue(expected);
  });

class MockCursor<T extends Record<string, any>> {
  constructor(private docs: T[]) {}

  sort(sortSpec: Record<string, 1 | -1>) {
    const [[field, direction]] = Object.entries(sortSpec);
    this.docs = [...this.docs].sort((left, right) => {
      const leftValue = new Date(left[field] || 0).getTime();
      const rightValue = new Date(right[field] || 0).getTime();
      return direction === -1 ? rightValue - leftValue : leftValue - rightValue;
    });
    return this;
  }

  limit(count: number) {
    this.docs = this.docs.slice(0, count);
    return this;
  }

  async toArray() {
    return this.docs;
  }
}

class MockCollection<T extends Record<string, any>> {
  constructor(private readonly docs: T[]) {}

  find(query: Query = {}) {
    if (!Object.keys(query).length) {
      return new MockCursor(this.docs);
    }

    const filtered = this.docs.filter((doc) => {
      if ("$or" in query) {
        return matchesQuery(doc, query);
      }

      return matchesQuery(doc, query);
    });
    return new MockCursor(filtered);
  }

  async findOne(query: Query) {
    return this.docs.find((doc) => matchesQuery(doc, query)) ?? null;
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
    status(code: number) {
      response.statusCode = code;
      return response;
    },
    json(payload: any) {
      response.body = payload;
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

describe("founding beta admin API", () => {
  let db: MockDb;
  let userId: ObjectId;

  beforeEach(() => {
    db = new MockDb();
    userId = new ObjectId();
    db.userDocs = [
      {
        _id: userId,
        username: "earlybird",
        name: "Early Bird",
        email: "early@example.com",
        billingPlan: "free",
        subscriptionStatus: "inactive",
        createdAt: new Date("2026-03-10T00:00:00.000Z"),
      },
    ];

    mocks.getServerSession.mockReset();
    mocks.connectToDatabase.mockReset();
    mocks.getServerSession.mockResolvedValue({
      user: {
        _id: new ObjectId().toString(),
        username: "grwyler",
        email: "grwyler@gmail.com",
      },
    });
    mocks.connectToDatabase.mockResolvedValue(db);
  });

  it("returns matching users for the admin founding-beta search", async () => {
    const req = createMockRequest({
      method: "GET",
      query: { search: "early" },
    });
    const res = createMockResponse();

    await handler(req, res as any);

    expect(res.statusCode).toBe(200);
    expect(res.body.users).toHaveLength(1);
    expect(res.body.users[0]).toMatchObject({
      username: "earlybird",
      billingPlan: "free",
      productPlan: "free",
      manualProBetaAccess: null,
    });
  });

  it("grants manual founding-beta access with expiration and payment note", async () => {
    const req = createMockRequest({
      method: "POST",
      body: {
        userId: userId.toString(),
        operation: "grant",
        expiresAt: "2026-04-01",
        paymentCollectionNote: "Cash collected in person",
      },
    });
    const res = createMockResponse();

    await handler(req, res as any);

    expect(res.statusCode).toBe(200);
    expect(res.body.user).toMatchObject({
      _id: userId.toString(),
      productPlan: "premium",
      manualProBetaAccess: {
        active: true,
        paymentCollectionNote: "Cash collected in person",
      },
    });
    expect(db.userDocs[0].entitlements.assistantPlanGeneration).toBe(true);
    expect(db.userDocs[0].betaFunnel.manualProGrantAppliedAt).toBeInstanceOf(Date);
  });

  it("revokes manual founding-beta access and falls back to free when no billing access exists", async () => {
    db.userDocs[0].manualProBetaAccess = {
      grantedAt: new Date("2026-03-12T00:00:00.000Z"),
      paymentCollectionNote: "Manual invoice",
    };
    db.userDocs[0].productPlan = "premium";

    const req = createMockRequest({
      method: "POST",
      body: {
        userId: userId.toString(),
        operation: "revoke",
        paymentCollectionNote: "Refunded manually",
      },
    });
    const res = createMockResponse();

    await handler(req, res as any);

    expect(res.statusCode).toBe(200);
    expect(res.body.user).toMatchObject({
      _id: userId.toString(),
      productPlan: "free",
      manualProBetaAccess: {
        active: false,
        paymentCollectionNote: "Refunded manually",
      },
    });
    expect(db.userDocs[0].entitlements.assistantPlanGeneration).toBe(false);
    expect(db.userDocs[0].manualProBetaAccess.revokedAt).toBeInstanceOf(Date);
  });
});
