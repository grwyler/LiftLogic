import { ObjectId } from "mongodb";
import { beforeEach, describe, expect, it, vi } from "vitest";
import handler from "../../pages/api/recurringRule";

const mocks = vi.hoisted(() => ({
  connectToDatabase: vi.fn(),
  connectToMongoClient: vi.fn(),
  hasEntitlement: vi.fn(() => true),
  getEntitlementMessage: vi.fn(() => "upgrade required"),
}));

vi.mock("../../utils/mongodb", () => ({
  connectToDatabase: mocks.connectToDatabase,
  connectToMongoClient: mocks.connectToMongoClient,
}));

vi.mock("@/utils/entitlements", () => ({
  hasEntitlement: mocks.hasEntitlement,
  getEntitlementMessage: mocks.getEntitlementMessage,
}));

type Query = Record<string, unknown>;

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
    const actual = doc[key];

    if (
      expected &&
      typeof expected === "object" &&
      !Array.isArray(expected) &&
      !(expected instanceof ObjectId) &&
      !(expected instanceof Date)
    ) {
      const operators = expected as Record<string, unknown>;

      if (Object.prototype.hasOwnProperty.call(operators, "$in")) {
        return Array.isArray(operators.$in)
          ? operators.$in.some((item) => normalizeValue(item) === normalizeValue(actual))
          : false;
      }
    }

    return normalizeValue(actual) === normalizeValue(expected);
  });

class MockCollection<T extends Record<string, any>> {
  constructor(private readonly docs: T[]) {}

  async findOne(query: Query) {
    return this.docs.find((doc) => matchesQuery(doc, query)) ?? null;
  }

  find(query: Query = {}) {
    const filtered = this.docs.filter((doc) => matchesQuery(doc, query));
    return {
      toArray: async () => [...filtered],
      sort: () => ({
        toArray: async () => [...filtered],
      }),
    };
  }

  async updateOne(
    filter: Query,
    update: {
      $set?: Record<string, unknown>;
      $unset?: Record<string, unknown>;
      $setOnInsert?: Record<string, unknown>;
    },
    options?: { upsert?: boolean }
  ) {
    const index = this.docs.findIndex((doc) => matchesQuery(doc, filter));

    if (index === -1) {
      if (!options?.upsert) {
        return { modifiedCount: 0, upsertedCount: 0, upsertedId: null };
      }

      const inserted = {
        ...filter,
        ...(update.$setOnInsert ?? {}),
        ...(update.$set ?? {}),
      } as T;
      this.docs.push(inserted);
      return {
        modifiedCount: 0,
        upsertedCount: 1,
        upsertedId: inserted._id ?? null,
      };
    }

    const next = {
      ...this.docs[index],
      ...(update.$set ?? {}),
    } as T;

    if (update.$unset) {
      Object.keys(update.$unset).forEach((key) => {
        delete (next as Record<string, unknown>)[key];
      });
    }

    this.docs[index] = next;
    return { modifiedCount: 1, upsertedCount: 0, upsertedId: null };
  }

  async updateMany(
    filter: Query,
    update: {
      $set?: Record<string, unknown>;
    }
  ) {
    let modifiedCount = 0;

    this.docs.forEach((doc, index) => {
      if (!matchesQuery(doc, filter)) {
        return;
      }

      this.docs[index] = {
        ...doc,
        ...(update.$set ?? {}),
      };
      modifiedCount += 1;
    });

    return { modifiedCount };
  }

  async insertOne(doc: T) {
    this.docs.push(doc);
    return { insertedId: doc._id ?? new ObjectId() };
  }
}

const createMockResponse = () => {
  const response: Record<string, any> = {
    statusCode: 200,
    jsonBody: undefined,
    headers: {},
  };

  response.status = (code: number) => {
    response.statusCode = code;
    return response;
  };
  response.json = (body: unknown) => {
    response.jsonBody = body;
    return response;
  };
  response.setHeader = (key: string, value: unknown) => {
    response.headers[key] = value;
  };
  response.end = () => response;

  return response;
};

describe("recurring rule batch api", () => {
  const userId = "507f1f77bcf86cd799439011";
  const existingRuleId = new ObjectId();
  const workoutEntryId = new ObjectId();
  const rulesDocs: Record<string, any>[] = [];
  const workoutEntryDocs: Record<string, any>[] = [];
  const userDocs: Record<string, any>[] = [];
  const db = {
    collection: (name: string) => {
      if (name === "recurringRules") {
        return new MockCollection(rulesDocs);
      }

      if (name === "workoutEntries") {
        return new MockCollection(workoutEntryDocs);
      }

      if (name === "users") {
        return new MockCollection(userDocs);
      }

      throw new Error(`Unknown collection ${name}`);
    },
  };

  beforeEach(() => {
    rulesDocs.length = 0;
    workoutEntryDocs.length = 0;
    userDocs.length = 0;

    rulesDocs.push({
      _id: existingRuleId,
      userId,
      exerciseId: "exercise-1",
      routineName: "Push Day",
      active: true,
    });

    workoutEntryDocs.push({
      _id: workoutEntryId,
      userId,
      exerciseId: "exercise-1",
      routineName: "Push Day",
      entryInstanceId: "entry-1",
      ruleId: existingRuleId.toString(),
      sets: [{ id: "set-1", name: "Working Set 1", reps: 5, weight: 135 }],
      date: new Date("2026-03-17T00:00:00.000Z"),
      complete: false,
    });

    userDocs.push({
      _id: new ObjectId(userId),
      preferredUnits: "lb",
    });

    mocks.connectToDatabase.mockResolvedValue(db);
    mocks.connectToMongoClient.mockResolvedValue({
      startSession: () => ({
        withTransaction: async (callback: () => Promise<void>) => callback(),
        endSession: async () => undefined,
      }),
    });
    mocks.hasEntitlement.mockReturnValue(true);
  });

  it("updates the whole workout schedule in one batch and returns the updated exercises", async () => {
    const req = {
      method: "PUT",
      body: {
        action: "save_workout_schedule",
        userId,
        routineName: "Push Day",
        date: "2026-03-17",
        exercises: [
          {
            _id: workoutEntryId.toString(),
            entryInstanceId: "entry-1",
            exerciseId: "exercise-1",
            name: "Bench Press",
            type: "weight",
            max: 225,
            rest: 120,
            weightUnit: "lb",
            sortOrder: 0,
            sets: [{ id: "set-1", name: "Working Set 1", reps: 5, weight: 135 }],
            ruleId: existingRuleId.toString(),
          },
        ],
        schedule: {
          recurrenceType: "weekly",
          interval: 1,
          dayOfWeek: 2,
          daysOfWeek: [2],
          dayOfMonth: 17,
          endDate: "2026-04-14",
        },
      },
    };
    const res = createMockResponse();

    await handler(req as any, res as any);

    expect(res.statusCode).toBe(200);
    expect(rulesDocs).toHaveLength(2);
    expect(rulesDocs[0].active).toBe(false);
    expect(rulesDocs[1].active).toBe(true);
    expect(rulesDocs[1].routineName).toBe("Push Day");
    expect(workoutEntryDocs[0].ruleId).toBe(String(rulesDocs[1]._id));
    expect(res.jsonBody.exercises).toHaveLength(1);
    expect(res.jsonBody.exercises[0].ruleId).toBe(String(rulesDocs[1]._id));
    expect(res.jsonBody.exercises[0].recurrenceType).toBe("weekly");
  });
});
