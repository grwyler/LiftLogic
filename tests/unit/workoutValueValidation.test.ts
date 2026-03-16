import fs from "fs";
import path from "path";
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

const matchesQuery = (doc: Record<string, any>, query: Query = {}) =>
  Object.entries(query).every(([key, expected]) => doc[key] === expected);

class MockCollection<T extends Record<string, any>> {
  constructor(private readonly docs: T[]) {}

  async findOne(query: Query) {
    return this.docs.find((doc) => matchesQuery(doc, query)) ?? null;
  }

  find() {
    return {
      sort: () => ({
        toArray: async () => [],
      }),
      toArray: async () => [],
    };
  }

  async updateOne(_filter: Query, _update: Update, _options?: { upsert?: boolean }) {
    return { upsertedCount: 0, upsertedId: null, modifiedCount: 0 };
  }

  async deleteOne() {
    return { deletedCount: 0 };
  }

  async insertOne(doc: T) {
    this.docs.push(doc);
    return { insertedId: "mock-id" };
  }
}

class MockDb {
  workoutEntryDocs: Array<Record<string, any>> = [];
  auditDocs: Array<Record<string, any>> = [];

  collection(name: string) {
    if (name === "workoutEntries") {
      return new MockCollection(this.workoutEntryDocs);
    }

    if (name === "workoutEntryAudits") {
      return new MockCollection(this.auditDocs);
    }

    if (name === "users") {
      return new MockCollection([]);
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
}: {
  method: string;
  body?: unknown;
}) =>
  ({
    method,
    body: body ?? {},
    query: {},
    url: "/api/workoutEntry",
  } as any);

const buildEntry = (overrides: Partial<WorkoutEntryDoc> = {}): WorkoutEntryDoc => ({
  userId: "user-123",
  entryInstanceId: "entry-1",
  exerciseId: "bench-press",
  name: "Bench Press",
  type: "weight",
  routineName: "Monday Workout",
  date: "2026-03-16" as any,
  rest: 120,
  complete: true,
  sets: [
    {
      name: "Working Set 1",
      reps: 8,
      weight: 135,
      actualReps: 8,
      actualWeight: 135,
      complete: true,
    },
  ],
  ...overrides,
});

describe("workout value validation", () => {
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

  it("rejects impossible weight-set values server-side with a 400", async () => {
    const req = createMockRequest({
      method: "POST",
      body: {
        entry: buildEntry({
          sets: [
            {
              name: "Working Set 1",
              reps: "NaN" as any,
              weight: "135.5" as any,
              actualReps: -2 as any,
              actualWeight: 0 as any,
              complete: true,
            },
          ],
        }),
      },
    });
    const res = createMockResponse();

    await handler(req, res as any);

    expect(res.statusCode).toBe(400);
    expect(res.body.errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining("whole number"),
        expect.stringContaining("between"),
      ])
    );
    expect(db.workoutEntryDocs).toHaveLength(0);
  });

  it("rejects malformed timed durations server-side with a 400", async () => {
    const req = createMockRequest({
      method: "POST",
      body: {
        entry: buildEntry({
          exerciseId: "bike",
          type: "timed",
          name: "Bike",
          sets: [
            {
              name: "Timed Set 1",
              hours: 0,
              minutes: 75,
              seconds: "oops" as any,
              actualHours: 0,
              actualMinutes: 0,
              actualSeconds: 0,
              complete: true,
            },
          ],
        }),
      },
    });
    const res = createMockResponse();

    await handler(req, res as any);

    expect(res.statusCode).toBe(400);
    expect(res.body.errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining("minutes"),
        expect.stringContaining("seconds"),
      ])
    );
    expect(db.workoutEntryDocs).toHaveLength(0);
  });

  it("keeps inline range guidance in the logging and editing UI", () => {
    const selectedSetSource = fs.readFileSync(
      path.join(process.cwd(), "components", "SelectedSetItem.tsx"),
      "utf8"
    );
    const editWeightSource = fs.readFileSync(
      path.join(process.cwd(), "components", "SetEditWeightItem.tsx"),
      "utf8"
    );
    const editTimerSource = fs.readFileSync(
      path.join(process.cwd(), "components", "SetEditTimerItem.tsx"),
      "utf8"
    );

    expect(selectedSetSource).toContain("Use ${formatWeightValue(weightInputConfig.step)} ${weightUnit} increments");
    expect(selectedSetSource).toContain("Whole reps only");
    expect(selectedSetSource).toContain("Total duration must be at least");
    expect(editWeightSource).toContain("Target weight (${weightUnit})");
    expect(editWeightSource).toContain("Use ${formatWeightValue(weightInputConfig.step)} ${weightUnit} increments");
    expect(editWeightSource).toContain("Whole reps only");
    expect(editTimerSource).toContain("Use {WORKOUT_VALUE_LIMITS.hours.min}-{WORKOUT_VALUE_LIMITS.hours.max}h");
  });
});
