import { ObjectId } from "mongodb";
import { beforeEach, describe, expect, it, vi } from "vitest";
import handler from "../../pages/api/workoutEntry";
import { WorkoutEntryDoc } from "../../utils/types";

const mocks = vi.hoisted(() => ({
  connectToDatabase: vi.fn(),
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

const applyProjection = <T extends Record<string, any>>(
  doc: T | null,
  projection?: Record<string, unknown>
) => {
  if (!doc || !projection) {
    return doc;
  }

  const keys = Object.entries(projection)
    .filter(([, include]) => Boolean(include))
    .map(([key]) => key);

  if (keys.length === 0) {
    return doc;
  }

  return keys.reduce(
    (next, key) => ({
      ...next,
      [key]: doc[key],
    }),
    {} as Record<string, unknown>
  ) as T;
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

      if (Object.prototype.hasOwnProperty.call(operators, "$ne")) {
        return normalizeValue(actual) !== normalizeValue(operators.$ne);
      }
    }

    return normalizeValue(actual) === normalizeValue(expected);
  });

class MockCollection<T extends Record<string, any>> {
  constructor(private readonly docs: T[]) {}

  async findOne(query: Query, options?: { projection?: Record<string, unknown> }) {
    const doc = this.docs.find((item) => matchesQuery(item, query)) ?? null;
    return applyProjection(doc, options?.projection);
  }

  find(query: Query = {}, options?: { projection?: Record<string, unknown> }) {
    const filtered = this.docs
      .filter((doc) => matchesQuery(doc, query))
      .map((doc) => applyProjection(doc, options?.projection) as T);

    return {
      sort: (sort: Query) => ({
        toArray: async () =>
          [...filtered].sort((left, right) => {
            const [sortKey, directionValue] = Object.entries(sort)[0] ?? [];
            if (!sortKey) {
              return 0;
            }

            const direction = Number(directionValue) || 1;
            const leftValue = normalizeValue((left as any)[sortKey]);
            const rightValue = normalizeValue((right as any)[sortKey]);

            if (leftValue === rightValue) {
              return 0;
            }

            return leftValue > rightValue ? direction : -direction;
          }),
      }),
      toArray: async () => [...filtered],
    };
  }

  async insertOne(doc: T) {
    const insertedId = new ObjectId();
    this.docs.push({
      ...doc,
      _id: insertedId,
    } as unknown as T);
    return { insertedId };
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

  async deleteOne(filter: Query) {
    const index = this.docs.findIndex((doc) => matchesQuery(doc, filter));
    if (index === -1) {
      return { deletedCount: 0 };
    }

    this.docs.splice(index, 1);
    return { deletedCount: 1 };
  }
}

class MockDb {
  workoutEntryDocs: Array<WorkoutEntryDoc & { _id: ObjectId }> = [];
  userDocs: Array<Record<string, any>> = [];
  workoutEntryAuditDocs: Array<Record<string, any>> = [];

  collection(name: string) {
    if (name === "workoutEntries") {
      return new MockCollection(this.workoutEntryDocs);
    }

    if (name === "users") {
      return new MockCollection(this.userDocs);
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

const createCompletedEntry = ({
  id,
  date,
  entryInstanceId,
}: {
  id: string;
  date: Date;
  entryInstanceId: string;
}): WorkoutEntryDoc & { _id: ObjectId } => ({
  _id: new ObjectId(id),
  userId: "507f1f77bcf86cd799439011",
  entryInstanceId,
  exerciseId: "bench-press",
  name: "Bench Press",
  type: "weight",
  routineName: "Monday Workout",
  date,
  rest: 120,
  complete: true,
  sets: [
    {
      name: "Working Set 1",
      reps: 5,
      weight: 185,
      actualReps: 5,
      actualWeight: 185,
      complete: true,
    },
  ],
  createdAt: date,
  updatedAt: date,
});

describe("workout entry derived-state recomputation", () => {
  let db: MockDb;

  beforeEach(() => {
    db = new MockDb();
    mocks.connectToDatabase.mockReset();
    mocks.connectToDatabase.mockResolvedValue(db);
    mocks.getServerSession.mockReset();
    mocks.getServerSession.mockResolvedValue({
      user: {
        _id: "coach-1",
        username: "grwyl",
        email: "grwyl@example.com",
      },
    });

    db.userDocs.push({
      _id: new ObjectId("507f1f77bcf86cd799439011"),
      createdAt: new Date("2026-03-01T09:00:00.000Z"),
      betaFunnel: {
        signupCompletedAt: new Date("2026-03-01T09:00:00.000Z"),
        firstWorkoutLoggedAt: new Date("2026-03-05T12:00:00.000Z"),
        secondWorkoutLoggedAt: new Date("2026-03-10T12:00:00.000Z"),
        secondWorkoutWithin7DaysAt: new Date("2026-03-10T12:00:00.000Z"),
      },
    });
  });

  it("rebuilds milestone analytics and writes an audit record when a historical completed workout is skipped", async () => {
    const firstEntry = createCompletedEntry({
      id: "507f191e810c19729de860ea",
      date: new Date("2026-03-05T12:00:00.000Z"),
      entryInstanceId: "entry-1",
    });
    const secondEntry = createCompletedEntry({
      id: "507f191e810c19729de860eb",
      date: new Date("2026-03-10T12:00:00.000Z"),
      entryInstanceId: "entry-2",
    });

    db.workoutEntryDocs.push(firstEntry, secondEntry);

    const res = createMockResponse();
    await handler(
      createMockRequest({
        method: "POST",
        body: {
          entry: {
            ...secondEntry,
            _id: secondEntry._id.toString(),
            date: "2026-03-10",
            complete: false,
            skipped: true,
            sets: [],
          },
        },
      }),
      res as any
    );

    expect(res.statusCode).toBe(200);
    expect(db.userDocs[0].betaFunnel.signupCompletedAt.toISOString()).toBe(
      "2026-03-01T09:00:00.000Z"
    );
    expect(db.userDocs[0].betaFunnel.firstWorkoutLoggedAt.toISOString()).toBe(
      "2026-03-05T12:00:00.000Z"
    );
    expect(db.userDocs[0].betaFunnel.secondWorkoutLoggedAt).toBeUndefined();
    expect(db.userDocs[0].betaFunnel.secondWorkoutWithin7DaysAt).toBeUndefined();

    expect(db.workoutEntryAuditDocs).toHaveLength(1);
    expect(db.workoutEntryAuditDocs[0]).toMatchObject({
      action: "update",
      actorUserId: "coach-1",
      actorUsername: "grwyl",
      userId: "507f1f77bcf86cd799439011",
      entryInstanceId: "entry-2",
      isHistoricalMutation: true,
    });
    expect(db.workoutEntryAuditDocs[0].previousEntry.complete).toBe(true);
    expect(db.workoutEntryAuditDocs[0].nextEntry.skipped).toBe(true);
  });

  it("rebuilds milestone analytics and writes an audit record when a historical completed workout is deleted", async () => {
    const firstEntry = createCompletedEntry({
      id: "507f191e810c19729de860ec",
      date: new Date("2026-03-05T12:00:00.000Z"),
      entryInstanceId: "entry-3",
    });
    const secondEntry = createCompletedEntry({
      id: "507f191e810c19729de860ed",
      date: new Date("2026-03-10T12:00:00.000Z"),
      entryInstanceId: "entry-4",
    });

    db.workoutEntryDocs.push(firstEntry, secondEntry);

    const res = createMockResponse();
    await handler(
      createMockRequest({
        method: "DELETE",
        body: {
          entryId: secondEntry._id.toString(),
        },
      }),
      res as any
    );

    expect(res.statusCode).toBe(200);
    expect(db.workoutEntryDocs).toHaveLength(1);
    expect(db.userDocs[0].betaFunnel.firstWorkoutLoggedAt.toISOString()).toBe(
      "2026-03-05T12:00:00.000Z"
    );
    expect(db.userDocs[0].betaFunnel.secondWorkoutLoggedAt).toBeUndefined();

    expect(db.workoutEntryAuditDocs).toHaveLength(1);
    expect(db.workoutEntryAuditDocs[0]).toMatchObject({
      action: "delete",
      actorUserId: "coach-1",
      entryInstanceId: "entry-4",
      isHistoricalMutation: true,
    });
    expect(db.workoutEntryAuditDocs[0].previousEntry.complete).toBe(true);
    expect(db.workoutEntryAuditDocs[0].nextEntry).toBeNull();
  });
});
