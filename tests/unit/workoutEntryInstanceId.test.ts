import { ObjectId } from "mongodb";
import { beforeEach, describe, expect, it, vi } from "vitest";
import handler from "../../pages/api/workoutEntry";
import {
  buildDayWorkoutsFromEntriesAndRules,
  getRecurringWorkoutEntryInstanceId,
} from "../../utils/helpers";
import { WorkoutEntryDoc } from "../../utils/types";

const mocks = vi.hoisted(() => ({
  connectToDatabase: vi.fn(),
  applyWorkoutMilestones: vi.fn(({ funnel }) => funnel ?? {}),
  getServerSession: vi.fn(),
}));

vi.mock("../../utils/mongodb", () => ({
  connectToDatabase: mocks.connectToDatabase,
}));

vi.mock("next-auth/next", () => ({
  getServerSession: mocks.getServerSession,
}));

vi.mock("../../pages/api/auth/[...nextauth]", () => ({
  authOptions: {},
}));

vi.mock("../../utils/betaFunnel", () => ({
  applyWorkoutMilestones: mocks.applyWorkoutMilestones,
}));

type Query = Record<string, unknown>;
type Update = {
  $set?: Record<string, unknown>;
  $setOnInsert?: Record<string, unknown>;
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
    const actual = doc[key];

    if (
      expected &&
      typeof expected === "object" &&
      !Array.isArray(expected) &&
      !(expected instanceof ObjectId) &&
      !(expected instanceof Date)
    ) {
      const operators = expected as Record<string, unknown>;

      if (Object.prototype.hasOwnProperty.call(operators, "$gte")) {
        return normalizeValue(actual) >= normalizeValue(operators.$gte);
      }

      if (Object.prototype.hasOwnProperty.call(operators, "$lte")) {
        return normalizeValue(actual) <= normalizeValue(operators.$lte);
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
      sort: () => ({
        toArray: async () => [...filtered],
      }),
      toArray: async () => [...filtered],
    };
  }

  async updateOne(filter: Query, update: Update, options?: { upsert?: boolean }) {
    const index = this.docs.findIndex((doc) => matchesQuery(doc, filter));

    if (index === -1) {
      if (!options?.upsert) {
        return { upsertedCount: 0, upsertedId: null, modifiedCount: 0 };
      }

      const insertedId = new ObjectId();
      this.docs.push({
        ...(update.$setOnInsert ?? {}),
        ...(update.$set ?? {}),
        _id: insertedId,
      } as unknown as T);

      return { upsertedCount: 1, upsertedId: insertedId, modifiedCount: 0 };
    }

    const current = this.docs[index];
    const next = {
      ...current,
      ...(update.$set ?? {}),
    };

    if (update.$unset) {
      Object.keys(update.$unset).forEach((key) => {
        delete (next as Record<string, unknown>)[key];
      });
    }

    this.docs[index] = next;
    return { upsertedCount: 0, upsertedId: null, modifiedCount: 1 };
  }

  async deleteOne(query: Query) {
    const index = this.docs.findIndex((doc) => matchesQuery(doc, query));
    if (index === -1) {
      return { deletedCount: 0 };
    }

    this.docs.splice(index, 1);
    return { deletedCount: 1 };
  }

  async insertOne(doc: T) {
    const insertedId = new ObjectId();
    this.docs.push({
      ...doc,
      _id: insertedId,
    } as unknown as T);
    return { insertedId };
  }
}

class MockDb {
  workoutEntryDocs: Array<WorkoutEntryDoc & { _id: ObjectId }> = [];
  workoutEntryAuditDocs: Array<Record<string, any>> = [];

  collection(name: string) {
    if (name === "workoutEntries") {
      return new MockCollection(this.workoutEntryDocs);
    }

    if (name === "users") {
      return new MockCollection([]);
    }

    if (name === "workoutEntryAudits") {
      return new MockCollection(this.workoutEntryAuditDocs);
    }

    throw new Error(`Unexpected collection: ${name}`);
  }
}

const createMockResponse = () => {
  const response = {
    statusCode: 200,
    body: undefined as any,
    headers: {} as Record<string, string | string[]>,
    setHeader(name: string, value: string | string[]) {
      response.headers[name] = value;
      return response;
    },
    status(code: number) {
      response.statusCode = code;
      return response;
    },
    json(payload: any) {
      response.body = payload;
      return response;
    },
    end() {
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
    url: "/api/workoutEntry",
  } as any);

const createEntry = (overrides: Partial<WorkoutEntryDoc> = {}): WorkoutEntryDoc => ({
  userId: "user-123",
  entryInstanceId: "entry-1",
  exerciseId: "bench-press",
  name: "Bench Press",
  type: "weight",
  routineName: "Monday Workout",
  date: new Date(2026, 2, 16),
  rest: 120,
  complete: false,
  sets: [
    {
      name: "Working Set 1",
      reps: 8,
      weight: 135,
      actualReps: "",
      actualWeight: "",
      complete: false,
    },
  ],
  ...overrides,
});

describe("workout entry occurrence identity", () => {
  let db: MockDb;

  beforeEach(() => {
    db = new MockDb();
    mocks.connectToDatabase.mockReset();
    mocks.connectToDatabase.mockResolvedValue(db);
    mocks.getServerSession.mockReset();
    mocks.getServerSession.mockResolvedValue({
      user: {
        _id: "user-123",
        username: "athlete",
        email: "athlete@example.com",
      },
    });
  });

  it("stores same-day duplicate exercises as separate entries and updates only the matching occurrence", async () => {
    const firstEntry = createEntry({
      entryInstanceId: "entry-bench-a",
      sets: [{ name: "Working Set 1", reps: 5, weight: 185, complete: false }],
    });
    const secondEntry = createEntry({
      entryInstanceId: "entry-bench-b",
      sets: [{ name: "Working Set 1", reps: 10, weight: 115, complete: false }],
    });

    const firstRes = createMockResponse();
    await handler(
      createMockRequest({ method: "POST", body: { entry: firstEntry } }),
      firstRes as any
    );

    const secondRes = createMockResponse();
    await handler(
      createMockRequest({ method: "POST", body: { entry: secondEntry } }),
      secondRes as any
    );

    expect(firstRes.statusCode).toBe(201);
    expect(secondRes.statusCode).toBe(201);
    expect(db.workoutEntryDocs).toHaveLength(2);

    const updatedSecond = createEntry({
      _id: secondRes.body.entryId,
      entryInstanceId: "entry-bench-b",
      sets: [{ name: "Working Set 1", reps: 12, weight: 120, complete: false }],
    });

    const updateRes = createMockResponse();
    await handler(
      createMockRequest({ method: "POST", body: { entry: updatedSecond } }),
      updateRes as any
    );

    expect(updateRes.statusCode).toBe(200);
    expect(db.workoutEntryDocs).toHaveLength(2);
    expect(db.workoutEntryDocs[0].sets?.[0].reps).toBe(5);
    expect(db.workoutEntryDocs[1].sets?.[0].reps).toBe(12);

    const getRes = createMockResponse();
    await handler(
      createMockRequest({
        method: "GET",
        query: {
          userId: "user-123",
          date: "2026-03-16",
          routineName: "Monday Workout",
        },
      }),
      getRes as any
    );

    expect(getRes.statusCode).toBe(200);
    expect(getRes.body.entries).toHaveLength(2);
    expect(getRes.body.entries.map((entry: WorkoutEntryDoc) => entry.entryInstanceId)).toEqual(
      expect.arrayContaining(["entry-bench-a", "entry-bench-b"])
    );
  });

  it("keeps duplicate same-day entries separate when rebuilding the visible day workout", () => {
    const day = buildDayWorkoutsFromEntriesAndRules(
      [
        createEntry({
          _id: new ObjectId(),
          entryInstanceId: "entry-bench-a",
          sets: [{ name: "Working Set 1", reps: 5, weight: 185, complete: false }],
        }),
        createEntry({
          _id: new ObjectId(),
          entryInstanceId: "entry-bench-b",
          sets: [{ name: "Backoff Set 1", reps: 10, weight: 115, complete: false }],
        }),
      ],
      [],
      "2026-03-16",
      "Monday Workout"
    );

    expect(day).toHaveLength(1);
    expect(day[0].exercises).toHaveLength(2);
    expect(day[0].exercises.map((exercise: any) => exercise.entryInstanceId)).toEqual([
      "entry-bench-a",
      "entry-bench-b",
    ]);
  });

  it("assigns a stable recurring occurrence id for a rule on a specific date", () => {
    expect(
      getRecurringWorkoutEntryInstanceId("rule-123", "2026-03-16", "Monday Workout")
    ).toBe("recurring-entry::rule-123::2026-03-16::Monday Workout");
  });
});
