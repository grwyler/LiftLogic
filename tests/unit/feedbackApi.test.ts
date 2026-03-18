import { ObjectId } from "mongodb";
import { beforeEach, describe, expect, it, vi } from "vitest";
import handler from "../../pages/api/feedback";
import { FeedbackItemDoc, FeedbackWorkItemDoc } from "../../utils/types";

const mocks = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  connectToDatabase: vi.fn(),
  createTransport: vi.fn(),
  sendMail: vi.fn(),
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

vi.mock("nodemailer", () => ({
  default: {
    createTransport: mocks.createTransport,
  },
}));

type Query = Record<string, unknown>;
type Update = {
  $set?: Record<string, unknown>;
  $setOnInsert?: Record<string, unknown>;
  $unset?: Record<string, unknown>;
};

const userSession = {
  user: {
    _id: "user-123",
    username: "athlete",
    email: "athlete@example.com",
  },
};

const adminSession = {
  user: {
    _id: "admin-1",
    username: "workflow-admin",
    email: "admin@example.com",
    permissions: {
      bugWorkflowAdmin: true,
    },
  },
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

      if (Object.prototype.hasOwnProperty.call(operators, "$ne")) {
        return normalizeValue(actual) !== normalizeValue(operators.$ne);
      }
    }

    return normalizeValue(actual) === normalizeValue(expected);
  });

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

  async updateOne(filter: Query, update: Update, options?: { upsert?: boolean }) {
    const index = this.docs.findIndex((doc) => matchesQuery(doc, filter));

    if (index === -1) {
      if (!options?.upsert) {
        return { upsertedCount: 0, upsertedId: null, modifiedCount: 0 };
      }

      const insertedId = new ObjectId();
      const nextDoc = {
        ...(update.$setOnInsert ?? {}),
        ...(update.$set ?? {}),
        _id: insertedId,
      } as unknown as T;
      this.docs.push(nextDoc);

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

  async updateMany(filter: Query, update: Update) {
    let modifiedCount = 0;

    this.docs.forEach((doc, index) => {
      if (!matchesQuery(doc, filter)) {
        return;
      }

      const next = {
        ...doc,
        ...(update.$set ?? {}),
      };
      this.docs[index] = next;
      modifiedCount += 1;
    });

    return { modifiedCount };
  }

  async deleteOne(filter: Query) {
    const index = this.docs.findIndex((doc) => matchesQuery(doc, filter));
    if (index === -1) {
      return { deletedCount: 0 };
    }

    this.docs.splice(index, 1);
    return { deletedCount: 1 };
  }

  async deleteMany(filter: Query) {
    const beforeCount = this.docs.length;
    const remaining = this.docs.filter((doc) => !matchesQuery(doc, filter));
    this.docs.splice(0, this.docs.length, ...remaining);
    return { deletedCount: beforeCount - remaining.length };
  }
}

class MockDb {
  feedbackDocs: Array<FeedbackItemDoc & { _id: ObjectId }> = [];
  workItemDocs: Array<FeedbackWorkItemDoc & { _id: ObjectId }> = [];
  humanTaskDocs: Array<Record<string, any> & { _id: ObjectId }> = [];

  collection(name: string) {
    if (name === "feedback") {
      return new MockCollection(this.feedbackDocs);
    }

    if (name === "feedbackWorkItems") {
      return new MockCollection(this.workItemDocs);
    }

    if (name === "humanTasks") {
      return new MockCollection(this.humanTaskDocs);
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

const validBugPayload = {
  feedback: {
    type: "bug" as const,
    title: "Workout log failed",
    description: "Log set button failed to persist the workout entry.",
    severity: "high" as const,
    page: "/routines",
    deviceType: "desktop" as const,
    runtimeContext: {
      appVersion: "1.0.0",
      commitSha: "commit-sha-123456",
      environment: "preview",
      route: "/routines?day=wednesday",
      userAgent: "Mozilla/5.0 (Macintosh)",
      viewport: {
        width: 1440,
        height: 900,
      },
      online: true,
    },
  },
};

describe("feedback API route", () => {
  let db: MockDb;

  beforeEach(() => {
    db = new MockDb();
    mocks.getServerSession.mockReset();
    mocks.connectToDatabase.mockReset();
    mocks.createTransport.mockReset();
    mocks.sendMail.mockReset();

    mocks.getServerSession.mockResolvedValue(userSession);
    mocks.connectToDatabase.mockResolvedValue(db);
    mocks.sendMail.mockResolvedValue({ messageId: "sent-1" });
    mocks.createTransport.mockReturnValue({
      sendMail: mocks.sendMail,
    });

    delete process.env.SMTP_HOST;
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASS;
    delete process.env.SMTP_PORT;
    delete process.env.SMTP_SECURE;
    delete process.env.SMTP_FROM;
    delete process.env.BUG_ALERT_EMAIL_TO;
  });

  it("rejects unauthenticated POST requests", async () => {
    mocks.getServerSession.mockResolvedValueOnce(null);

    const req = createMockRequest({
      method: "POST",
      body: validBugPayload,
    });
    const res = createMockResponse();

    await handler(req, res as any);

    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({ message: "Unauthorized" });
  });

  it("rejects malformed POST requests", async () => {
    const req = createMockRequest({
      method: "POST",
      body: { feedback: { type: "bug", title: "Missing description" } },
    });
    const res = createMockResponse();

    await handler(req, res as any);

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toContain("signed-in user, type, title, and description");
  });

  it("accepts a valid bug report, creates a work item, and preserves frontend fields", async () => {
    process.env.SMTP_HOST = "smtp.example.com";
    process.env.SMTP_USER = "mailer";
    process.env.SMTP_PASS = "secret";
    process.env.NEXTAUTH_URL = "https://lift-logic.app";

    const req = createMockRequest({
      method: "POST",
      body: validBugPayload,
    });
    const res = createMockResponse();

    await handler(req, res as any);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.duplicate).toBe(false);
    expect(res.body.feedback.type).toBe("bug");
    expect(res.body.feedback.status).toBe("new");
    expect(res.body.feedback.triageStatus).toBe("new");
    expect(res.body.feedback.notificationStatus).toBe("sent");
    expect(res.body.feedback.workItemId).toBeDefined();
    expect(res.body.feedback.fingerprint).toMatch(/^wrk_/);
    expect(res.body.feedback.reporterRole).toBe("user");
    expect(res.body.feedback.runtimeContext).toMatchObject({
      appVersion: "1.0.0",
      commitSha: "commit-sha-123456",
      environment: "preview",
      route: "/routines?day=wednesday",
      userAgent: "Mozilla/5.0 (Macintosh)",
      viewport: {
        width: 1440,
        height: 900,
      },
      online: true,
    });
    expect(res.body.workItem.occurrenceCount).toBe(1);
    expect(res.body.workItem.type).toBe("bug");
    expect(res.body.workItem.latestReporterRole).toBe("user");
    expect(res.body.workItem.structuredRepro).toMatchObject({
      actualBehavior: "Workout log failed",
      affectedFlow: "/routines",
    });
    expect(res.body.workItem.implementationContext.confirmed[0].path).toBe(
      "pages/routines.tsx"
    );
    expect(res.body.workItem.verificationPack.items.length).toBeGreaterThan(0);
    expect(res.body.workItem.latestRuntimeContext).toMatchObject({
      appVersion: "1.0.0",
      commitSha: "commit-sha-123456",
      environment: "preview",
    });
    expect(res.body.workItem.latestReportId).toBe(String(res.body.feedback._id));
    expect(mocks.createTransport).toHaveBeenCalledTimes(1);
    expect(mocks.sendMail).toHaveBeenCalledTimes(1);
    expect(db.feedbackDocs).toHaveLength(1);
    expect(db.workItemDocs).toHaveLength(1);
  });

  it("accepts feature and coach-feedback payloads without requiring real infrastructure", async () => {
    const featureReq = createMockRequest({
      method: "POST",
      body: {
        feedback: {
          type: "feature",
          title: "Weekly summary request",
          description: "Please add a simple weekly recap screen.",
          page: "/feedback",
          deviceType: "desktop",
        },
      },
    });
    const featureRes = createMockResponse();

    await handler(featureReq, featureRes as any);

    expect(featureRes.statusCode).toBe(200);
    expect(featureRes.body.feedback.type).toBe("feature");
    expect(featureRes.body.workItem.type).toBe("feature");

    const coachReq = createMockRequest({
      method: "POST",
      body: {
        feedback: {
          type: "bug",
          title: "Workout assistant response disliked",
          description: "A user marked this workout assistant response as unhelpful.",
          page: "/routines",
          deviceType: "desktop",
          coachFeedback: {
            sentiment: "dislike",
            messageId: "coach-1",
            selectedResponse: "Try Saturday",
            explanation: "It ignored my schedule.",
            conversation: [
              { role: "coach", text: "Try Saturday" },
              { role: "user", text: "Saturday does not work." },
            ],
          },
        },
      },
    });
    const coachRes = createMockResponse();

    await handler(coachReq, coachRes as any);

    expect(coachRes.statusCode).toBe(200);
    expect(coachRes.body.feedback.coachFeedback.sentiment).toBe("dislike");
    expect(coachRes.body.feedback.coachFeedback.selectedResponse).toBe("Try Saturday");
    expect(coachRes.body.feedback.notificationStatus).toBe("skipped");
  });

  it("preserves expanded device classifications like tablet and foldable", async () => {
    const tabletReq = createMockRequest({
      method: "POST",
      body: {
        feedback: {
          type: "bug",
          title: "Tablet-specific layout issue",
          description: "The tablet layout needs its own review.",
          page: "/bugs",
          deviceType: "tablet",
        },
      },
    });
    const tabletRes = createMockResponse();
    await handler(tabletReq, tabletRes as any);

    expect(tabletRes.statusCode).toBe(200);
    expect(tabletRes.body.feedback.deviceType).toBe("tablet");
    expect(tabletRes.body.workItem.deviceType).toBe("tablet");

    const foldableReq = createMockRequest({
      method: "POST",
      body: {
        feedback: {
          type: "bug",
          title: "Foldable-specific layout issue",
          description: "The foldable layout needs its own review.",
          page: "/bugs",
          deviceType: "foldable",
        },
      },
    });
    const foldableRes = createMockResponse();
    await handler(foldableReq, foldableRes as any);

    expect(foldableRes.statusCode).toBe(200);
    expect(foldableRes.body.feedback.deviceType).toBe("foldable");
    expect(foldableRes.body.workItem.deviceType).toBe("foldable");
  });

  it("merges duplicate bug reports into one work item and suppresses duplicate notifications", async () => {
    process.env.NEXT_PUBLIC_APP_VERSION = "1.0.2";
    process.env.NEXT_PUBLIC_COMMIT_SHA = "server-fallback-sha";
    process.env.NEXT_PUBLIC_ENV = "test";

    const firstReq = createMockRequest({
      method: "POST",
      body: {
        feedback: {
          ...validBugPayload.feedback,
          runtimeContext: {
            ...validBugPayload.feedback.runtimeContext,
            appVersion: "1.0.0",
            commitSha: "abc123",
            environment: "preview",
          },
          bugReport: {
            mode: "recorded",
            errors: [
              {
                timestamp: "2026-03-14T12:00:00.000Z",
                source: "window-error",
                page: "/routines",
                message: "saveWorkoutEntry 500: Internal Server Error",
              },
            ],
          },
        },
      },
    });
    const firstRes = createMockResponse();
    await handler(firstReq, firstRes as any);

    const secondReq = createMockRequest({
      method: "POST",
      body: {
        feedback: {
          ...validBugPayload.feedback,
          runtimeContext: {
            ...validBugPayload.feedback.runtimeContext,
            appVersion: "1.0.1",
            commitSha: "def456",
            environment: "production",
          },
          bugReport: {
            mode: "recorded",
            errors: [
              {
                timestamp: "2026-03-14T18:00:00.000Z",
                source: "window-error",
                page: "/routines",
                message: "saveWorkoutEntry 500: Internal Server Error",
              },
            ],
          },
        },
      },
    });
    const secondRes = createMockResponse();
    await handler(secondReq, secondRes as any);

    expect(secondRes.statusCode).toBe(200);
    expect(secondRes.body.duplicate).toBe(true);
    expect(firstRes.body.feedback.fingerprint).toBe(secondRes.body.feedback.fingerprint);
    expect(secondRes.body.feedback.notificationStatus).toBe("skipped");
    expect(secondRes.body.feedback.lastNotificationError).toBe(
      "Duplicate work item; notification suppressed."
    );
    expect(secondRes.body.workItem.occurrenceCount).toBe(2);
    expect(secondRes.body.workItem.latestRuntimeContext).toMatchObject({
      appVersion: "1.0.1",
      commitSha: "def456",
      environment: "production",
    });
    expect(db.feedbackDocs).toHaveLength(2);
    expect(db.workItemDocs).toHaveLength(1);

    mocks.getServerSession.mockResolvedValueOnce(adminSession);
    const getReq = createMockRequest({ method: "GET" });
    const getRes = createMockResponse();
    await handler(getReq, getRes as any);

    expect(getRes.statusCode).toBe(200);
    expect(getRes.body.feedback).toHaveLength(2);
    expect(getRes.body.workItems).toHaveLength(1);
    expect(getRes.body.workItems[0].occurrenceCount).toBe(2);
  });

  it("fills missing build metadata from server environment without changing route-level behavior", async () => {
    process.env.NEXT_PUBLIC_APP_VERSION = "1.2.3";
    process.env.NEXT_PUBLIC_COMMIT_SHA = "server-commit-sha";
    process.env.NEXT_PUBLIC_ENV = "production";

    const req = createMockRequest({
      method: "POST",
      body: {
        feedback: {
          type: "bug",
          title: "Auto-captured client error",
          description: "Unhandled client error while opening workouts.",
          severity: "high",
          page: "/routines",
          deviceType: "mobile",
          runtimeContext: {
            route: "/routines",
            userAgent: "Mozilla/5.0 (iPhone)",
            viewport: { width: 390, height: 844 },
            online: false,
          },
        },
      },
    });
    const res = createMockResponse();

    await handler(req, res as any);

    expect(res.statusCode).toBe(200);
    expect(res.body.feedback.runtimeContext).toMatchObject({
      appVersion: "1.2.3",
      commitSha: "server-commit-sha",
      environment: "production",
      route: "/routines",
      userAgent: "Mozilla/5.0 (iPhone)",
      viewport: { width: 390, height: 844 },
      online: false,
    });
    expect(res.body.workItem.latestRuntimeContext).toMatchObject({
      appVersion: "1.2.3",
      commitSha: "server-commit-sha",
      environment: "production",
    });
  });

  it("creates and updates human tasks through the shared feedback API", async () => {
    mocks.getServerSession.mockResolvedValueOnce(adminSession);
    const postReq = createMockRequest({
      method: "POST",
      body: {
        humanTask: {
          title: "Rotate leaked credentials",
          description: "Rotate anything previously exposed outside the repository.",
          source: "codex",
          metadata: {
            provider: "openai",
            urgent: true,
          },
        },
      },
    });
    const postRes = createMockResponse();

    await handler(postReq, postRes as any);

    expect(postRes.statusCode).toBe(200);
    expect(postRes.body.success).toBe(true);
    expect(postRes.body.humanTask.title).toBe("Rotate leaked credentials");
    expect(postRes.body.humanTask.status).toBe("open");
    expect(postRes.body.humanTask.source).toBe("codex");
    expect(db.humanTaskDocs).toHaveLength(1);

    mocks.getServerSession.mockResolvedValueOnce(adminSession);
    const patchReq = createMockRequest({
      method: "PATCH",
      body: {
        humanTaskId: postRes.body.humanTask._id.toString(),
        status: "done",
      },
    });
    const patchRes = createMockResponse();

    await handler(patchReq, patchRes as any);

    expect(patchRes.statusCode).toBe(200);
    expect(patchRes.body.humanTask.status).toBe("done");
    expect(patchRes.body.humanTask.completedAt).toBeDefined();

    mocks.getServerSession.mockResolvedValueOnce(adminSession);
    const getReq = createMockRequest({ method: "GET" });
    const getRes = createMockResponse();
    await handler(getReq, getRes as any);

    expect(getRes.statusCode).toBe(200);
    expect(getRes.body.humanTasks).toHaveLength(1);
    expect(getRes.body.humanTasks[0].status).toBe("done");
  });

  it("updates triage metadata through PATCH and propagates it to linked feedback", async () => {
    const postReq = createMockRequest({
      method: "POST",
      body: validBugPayload,
    });
    const postRes = createMockResponse();
    await handler(postReq, postRes as any);

    mocks.getServerSession.mockResolvedValueOnce(adminSession);
    const patchReq = createMockRequest({
      method: "PATCH",
      body: {
        workItemId: postRes.body.workItem._id.toString(),
        triageStatus: "resolved",
        fixThreadId: "thread-42",
        fixCommitSha: "abc123def",
        resolution: {
          verificationOwner: "qa@liftlogic",
          resolvedAppVersion: "1.2.3",
          validatedCommands: [
            "npm run test:unit -- tests/unit/feedbackApi.test.ts",
          ],
          manualChecks: ["Reviewed /bugs and confirmed the resolved banner."],
          regressionChecklist: [
            { label: "Reported flow re-checked", outcome: "passed" },
            { label: "Copy details output reviewed", outcome: "passed" },
            { label: "Closure workflow verified", outcome: "not_applicable" },
          ],
        },
        title: "Updated login failure summary",
        latestDescription: "Admins clarified the repro steps during triage.",
        labels: ["auth", "regression", "mobile"],
        structuredRepro: {
          actualBehavior: "The current bug lacks a stable summary.",
          expectedBehavior: "The summary should be clear before fixing starts.",
          reproSteps: ["Open the work item", "Review the current summary"],
          affectedFlow: "/bugs",
        },
        implementationContext: {
          summary: "Start with the bugs inbox and the feedback helpers.",
          confirmed: [{ type: "route", path: "pages/bugs.tsx", label: "Bugs inbox" }],
          inferred: [{ type: "test", path: "tests/unit/feedbackApi.test.ts", label: "API test" }],
        },
        verificationPack: {
          summary: "Run workflow tests and review the bug detail modal.",
          items: [
            {
              id: "command-bugs-tests",
              kind: "command",
              label: "Run bug tests",
              command: "npm run test:unit -- tests/unit/feedbackApi.test.ts",
            },
            {
              id: "done-brief",
              kind: "done",
              label: "The copied brief matches the saved fields.",
            },
          ],
        },
        completedVerificationIds: ["done-brief"],
      },
    });
    const patchRes = createMockResponse();

    await handler(patchReq, patchRes as any);

    expect(patchRes.statusCode).toBe(200);
    expect(patchRes.body.success).toBe(true);
    expect(patchRes.body.workItem.triageStatus).toBe("resolved");
    expect(patchRes.body.workItem.status).toBe("resolved");
    expect(patchRes.body.workItem.fixThreadId).toBe("thread-42");
    expect(patchRes.body.workItem.fixCommitSha).toBe("abc123def");
    expect(patchRes.body.workItem.resolution).toMatchObject({
      verificationOwner: "qa@liftlogic",
      resolvedAppVersion: "1.2.3",
      validatedCommands: ["npm run test:unit -- tests/unit/feedbackApi.test.ts"],
      manualChecks: ["Reviewed /bugs and confirmed the resolved banner."],
    });
    expect(patchRes.body.workItem.title).toBe("Updated login failure summary");
    expect(patchRes.body.workItem.latestDescription).toBe(
      "Admins clarified the repro steps during triage."
    );
    expect(patchRes.body.workItem.labels).toEqual(["auth", "regression", "mobile"]);
    expect(patchRes.body.workItem.structuredRepro.actualBehavior).toBe(
      "The current bug lacks a stable summary."
    );
    expect(patchRes.body.workItem.completedVerificationIds).toEqual(["done-brief"]);

    const linkedFeedback = db.feedbackDocs[0];
    expect(linkedFeedback.triageStatus).toBe("resolved");
    expect(linkedFeedback.status).toBe("resolved");
    expect(linkedFeedback.fixThreadId).toBe("thread-42");
    expect(linkedFeedback.fixCommitSha).toBe("abc123def");
    expect(linkedFeedback.resolution).toMatchObject({
      verificationOwner: "qa@liftlogic",
      resolvedAppVersion: "1.2.3",
    });
  });

  it("rejects closing a work item when required verification fields are empty", async () => {
    const postReq = createMockRequest({
      method: "POST",
      body: validBugPayload,
    });
    const postRes = createMockResponse();
    await handler(postReq, postRes as any);

    mocks.getServerSession.mockResolvedValueOnce(adminSession);
    const patchReq = createMockRequest({
      method: "PATCH",
      body: {
        workItemId: postRes.body.workItem._id.toString(),
        triageStatus: "resolved",
        resolution: {
          verificationOwner: "",
          resolvedAppVersion: "",
          resolvedDeployId: "",
          validatedCommands: [],
          manualChecks: [],
          regressionChecklist: [
            { label: "Reported flow re-checked", outcome: "passed" },
            { label: "Copy details output reviewed", outcome: "pending" },
            { label: "Closure workflow verified", outcome: "pending" },
          ],
        },
      },
    });
    const patchRes = createMockResponse();

    await handler(patchReq, patchRes as any);

    expect(patchRes.statusCode).toBe(400);
    expect(patchRes.body.message).toBe("Resolution metadata is incomplete.");
    expect(patchRes.body.warnings).toEqual([
      "Add a verification owner.",
      "Record the resolved app version or deploy.",
      "List at least one validating command.",
      "List at least one completed manual check.",
      "Complete the regression checklist outcomes.",
    ]);
  });

  it("deletes an entire work item and its linked feedback through DELETE", async () => {
    const firstRes = createMockResponse();
    await handler(
      createMockRequest({ method: "POST", body: validBugPayload }),
      firstRes as any
    );

    const secondRes = createMockResponse();
    await handler(
      createMockRequest({ method: "POST", body: validBugPayload }),
      secondRes as any
    );

    mocks.getServerSession.mockResolvedValueOnce(adminSession);
    const deleteReq = createMockRequest({
      method: "DELETE",
      body: {
        workItemId: firstRes.body.workItem._id.toString(),
      },
    });
    const deleteRes = createMockResponse();

    await handler(deleteReq, deleteRes as any);

    expect(deleteRes.statusCode).toBe(200);
    expect(deleteRes.body).toEqual({ success: true });
    expect(db.feedbackDocs).toHaveLength(0);
    expect(db.workItemDocs).toHaveLength(0);
  });

  it("deletes feedback and refreshes the remaining work item state", async () => {
    const duplicatePayload = {
      feedback: {
        ...validBugPayload.feedback,
        bugReport: {
          mode: "recorded" as const,
          errors: [
            {
              timestamp: "2026-03-14T12:00:00.000Z",
              source: "window-error" as const,
              page: "/routines",
              message: "saveWorkoutEntry 500: Internal Server Error",
            },
          ],
        },
      },
    };

    const firstRes = createMockResponse();
    await handler(
      createMockRequest({ method: "POST", body: duplicatePayload }),
      firstRes as any
    );

    const secondRes = createMockResponse();
    await handler(
      createMockRequest({ method: "POST", body: duplicatePayload }),
      secondRes as any
    );

    mocks.getServerSession.mockResolvedValueOnce(adminSession);
    const deleteReq = createMockRequest({
      method: "DELETE",
      body: {
        feedbackId: secondRes.body.feedback._id.toString(),
      },
    });
    const deleteRes = createMockResponse();

    await handler(deleteReq, deleteRes as any);

    expect(deleteRes.statusCode).toBe(200);
    expect(deleteRes.body).toEqual({ success: true });
    expect(db.feedbackDocs).toHaveLength(1);
    expect(db.workItemDocs).toHaveLength(1);
    expect(db.workItemDocs[0].occurrenceCount).toBe(1);
    expect(String(db.workItemDocs[0].latestReportId)).toBe(
      firstRes.body.feedback._id.toString()
    );
  });
});
