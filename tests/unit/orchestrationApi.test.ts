import { ObjectId } from "mongodb";
import { beforeEach, describe, expect, it, vi } from "vitest";
import signalsHandler from "../../pages/api/signals";
import workItemsHandler from "../../pages/api/work-items";
import workItemHandler from "../../pages/api/work-items/[id]";
import duplicateHandler from "../../pages/api/work-items/[id]/duplicate";

const mocks = vi.hoisted(() => ({
  connectToOrchestrationMongo: vi.fn(),
  ensureSeededOrchestrationData: vi.fn(),
}));

vi.mock("../../server/orchestration/mongoClient", () => ({
  connectToOrchestrationMongo: mocks.connectToOrchestrationMongo,
}));

vi.mock("../../server/orchestration/seed", () => ({
  ensureSeededOrchestrationData: mocks.ensureSeededOrchestrationData,
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
  Object.entries(query).every(([key, expected]) => normalizeValue(doc[key]) === normalizeValue(expected));

const sortDocs = <T extends Record<string, any>>(docs: T[], sort: Query = {}) => {
  const entries = Object.entries(sort);

  return [...docs].sort((left, right) => {
    for (const [key, directionValue] of entries) {
      const direction = Number(directionValue) || 1;
      const leftValue = normalizeValue(left[key]);
      const rightValue = normalizeValue(right[key]);

      if (leftValue === rightValue) {
        continue;
      }

      return leftValue > rightValue ? direction : -direction;
    }

    return 0;
  });
};

class MockCollection<T extends Record<string, any>> {
  constructor(private readonly docs: T[]) {}

  async createIndex() {
    return "mock-index";
  }

  async findOne(query: Query) {
    return this.docs.find((doc) => matchesQuery(doc, query)) ?? null;
  }

  find(query: Query = {}) {
    const filtered = this.docs.filter((doc) => matchesQuery(doc, query));

    return {
      sort: (sort: Query) => ({
        toArray: async () => sortDocs(filtered, sort),
      }),
      toArray: async () => [...filtered],
    };
  }

  async insertOne(doc: T) {
    const insertedId = new ObjectId();
    this.docs.push({
      ...doc,
      _id: insertedId,
    });

    return { insertedId };
  }

  async insertMany(docs: T[]) {
    docs.forEach((doc) => {
      this.docs.push({
        ...doc,
        _id: new ObjectId(),
      });
    });

    return { insertedCount: docs.length };
  }

  async updateOne(filter: Query, update: Update) {
    const index = this.docs.findIndex((doc) => matchesQuery(doc, filter));
    if (index === -1) {
      return { modifiedCount: 0 };
    }

    const current = this.docs[index];
    const next = {
      ...current,
      ...(update.$set ?? {}),
    };

    Object.keys(update.$unset ?? {}).forEach((key) => {
      delete (next as Record<string, unknown>)[key];
    });

    this.docs[index] = next;
    return { modifiedCount: 1 };
  }

  async countDocuments() {
    return this.docs.length;
  }
}

class MockDb {
  projectDocs: Array<Record<string, any>> = [];
  signalDocs: Array<Record<string, any>> = [];
  workItemDocs: Array<Record<string, any>> = [];
  reviewActionDocs: Array<Record<string, any>> = [];

  collection(name: string) {
    if (name === "projects") {
      return new MockCollection(this.projectDocs);
    }

    if (name === "signals") {
      return new MockCollection(this.signalDocs);
    }

    if (name === "workItems") {
      return new MockCollection(this.workItemDocs);
    }

    if (name === "reviewActions") {
      return new MockCollection(this.reviewActionDocs);
    }

    throw new Error(`Unexpected collection ${name}`);
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

const baseSignal = {
  project: {
    slug: "acme-dashboard",
    name: "Acme Dashboard",
  },
  signal: {
    source: "sentry",
    type: "runtime-error",
    title: "Checkout totals fail to render",
    description: "Users see a blank totals card after applying a coupon.",
    severity: "high",
    location: "checkout/totals-card",
    evidence: {
      message: "Cannot read properties of undefined (reading 'amount')",
    },
  },
};

describe("orchestration API", () => {
  let db: MockDb;
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      ORCHESTRATION_STORE_BACKEND: "mongo",
      ORCHESTRATION_MONGODB_URI: "mongodb://example.test/orchestration",
      ORCHESTRATION_MONGODB_DB: "orchestration-test",
    };
    db = new MockDb();
    mocks.connectToOrchestrationMongo.mockReset();
    mocks.ensureSeededOrchestrationData.mockReset();
    mocks.connectToOrchestrationMongo.mockResolvedValue(db);
    mocks.ensureSeededOrchestrationData.mockResolvedValue(undefined);
  });

  it("POST /api/signals creates a work item for a new signal", async () => {
    const req = createMockRequest({
      method: "POST",
      body: baseSignal,
    });
    const res = createMockResponse();

    await signalsHandler(req, res as any);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.duplicate).toBe(false);
    expect(db.signalDocs).toHaveLength(1);
    expect(db.workItemDocs).toHaveLength(1);
    expect(db.projectDocs).toHaveLength(1);
  });

  it("POST /api/signals attaches a similar signal to an existing work item", async () => {
    await signalsHandler(
      createMockRequest({
        method: "POST",
        body: baseSignal,
      }),
      createMockResponse() as any
    );

    const res = createMockResponse();
    await signalsHandler(
      createMockRequest({
        method: "POST",
        body: {
          ...baseSignal,
          signal: {
            ...baseSignal.signal,
            source: "zendesk",
            description: "Support heard the totals vanish when coupons are used.",
            severity: "medium",
            evidence: {
              ticketId: "ZD-4821",
            },
          },
        },
      }),
      res as any
    );

    expect(res.statusCode).toBe(200);
    expect(res.body.duplicate).toBe(true);
    expect(db.signalDocs).toHaveLength(2);
    expect(db.workItemDocs).toHaveLength(1);
    expect(db.workItemDocs[0].occurrenceCount).toBe(2);
  });

  it("GET /api/work-items applies filters and hides duplicates by default", async () => {
    const firstRes = createMockResponse();
    await signalsHandler(createMockRequest({ method: "POST", body: baseSignal }), firstRes as any);

    const secondRes = createMockResponse();
    await signalsHandler(
      createMockRequest({
        method: "POST",
        body: {
          project: {
            slug: "field-ops-mobile",
            name: "Field Ops Mobile",
          },
          signal: {
            source: "manual-triage",
            type: "ux-friction",
            title: "Photo upload progress is unclear",
            description: "Technicians retry uploads because progress feels stalled.",
            severity: "low",
            location: "inspection/photo-upload",
            evidence: {
              note: "Observed during a ride-along.",
            },
          },
        },
      }),
      secondRes as any
    );

    await duplicateHandler(
      createMockRequest({
        method: "POST",
        query: { id: secondRes.body.workItem._id.toString() },
        body: {
          targetWorkItemId: firstRes.body.workItem._id.toString(),
          actor: {
            type: "human",
            name: "Reviewer",
          },
        },
      }),
      createMockResponse() as any
    );

    const filteredRes = createMockResponse();
    await workItemsHandler(
      createMockRequest({
        method: "GET",
        query: {
          project: "acme-dashboard",
          search: "checkout",
        },
      }),
      filteredRes as any
    );

    expect(filteredRes.statusCode).toBe(200);
    expect(filteredRes.body.workItems).toHaveLength(1);
    expect(filteredRes.body.workItems[0].projectSlug).toBe("acme-dashboard");

    const includeDupesRes = createMockResponse();
    await workItemsHandler(
      createMockRequest({
        method: "GET",
        query: {
          includeDuplicates: "true",
        },
      }),
      includeDupesRes as any
    );

    expect(includeDupesRes.body.workItems).toHaveLength(2);
  });

  it("PATCH /api/work-items/[id] updates mutable fields and records review actions", async () => {
    const createdRes = createMockResponse();
    await signalsHandler(
      createMockRequest({
        method: "POST",
        body: baseSignal,
      }),
      createdRes as any
    );

    const workItemId = createdRes.body.workItem._id.toString();
    const patchRes = createMockResponse();
    await workItemHandler(
      createMockRequest({
        method: "PATCH",
        query: { id: workItemId },
        body: {
          actor: {
            type: "human",
            name: "Alex Reviewer",
          },
          updates: {
            triageStatus: "reviewing",
            severity: "medium",
            title: "Checkout totals fail after coupon apply",
          },
        },
      }),
      patchRes as any
    );

    expect(patchRes.statusCode).toBe(200);
    expect(patchRes.body.workItem.triageStatus).toBe("reviewing");
    expect(patchRes.body.workItem.severity).toBe("medium");
    expect(patchRes.body.workItem.title).toBe("Checkout totals fail after coupon apply");
    expect(db.reviewActionDocs.map((action) => action.actionType)).toEqual(
      expect.arrayContaining(["status_changed", "severity_changed", "title_changed"])
    );
  });

  it("marking a work item duplicate preserves both work items and records the relationship", async () => {
    const firstRes = createMockResponse();
    const secondRes = createMockResponse();

    await signalsHandler(createMockRequest({ method: "POST", body: baseSignal }), firstRes as any);
    await signalsHandler(
      createMockRequest({
        method: "POST",
        body: {
          project: {
            slug: "acme-dashboard",
            name: "Acme Dashboard",
          },
          signal: {
            source: "manual-triage",
            type: "ux-friction",
            title: "Coupon totals copy is confusing",
            description: "Users struggle to understand whether coupons applied.",
            severity: "low",
            location: "checkout/summary-copy",
            evidence: {
              note: "Observed in testing.",
            },
          },
        },
      }),
      secondRes as any
    );

    const duplicateRes = createMockResponse();
    await duplicateHandler(
      createMockRequest({
        method: "POST",
        query: { id: secondRes.body.workItem._id.toString() },
        body: {
          targetWorkItemId: firstRes.body.workItem._id.toString(),
          actor: {
            type: "human",
            name: "Reviewer",
          },
        },
      }),
      duplicateRes as any
    );

    expect(duplicateRes.statusCode).toBe(200);
    expect(db.workItemDocs).toHaveLength(2);
    expect(db.workItemDocs[1].duplicateOfWorkItemId).toBe(firstRes.body.workItem._id.toString());
    expect(db.reviewActionDocs.map((action) => action.actionType)).toContain("marked_duplicate");
  });

  it("signals remain immutable after review actions", async () => {
    const createdRes = createMockResponse();
    await signalsHandler(
      createMockRequest({
        method: "POST",
        body: baseSignal,
      }),
      createdRes as any
    );

    const signalSnapshot = JSON.parse(JSON.stringify(db.signalDocs[0]));
    const workItemId = createdRes.body.workItem._id.toString();

    await workItemHandler(
      createMockRequest({
        method: "PATCH",
        query: { id: workItemId },
        body: {
          actor: {
            type: "human",
            name: "Reviewer",
          },
          updates: {
            triageStatus: "reviewing",
            severity: "medium",
          },
          note: "Investigating the issue.",
        },
      }),
      createMockResponse() as any
    );

    expect(JSON.parse(JSON.stringify(db.signalDocs[0]))).toEqual(signalSnapshot);
  });
});
