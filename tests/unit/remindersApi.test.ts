import { beforeEach, describe, expect, it, vi } from "vitest";
import handler from "../../pages/api/reminders";

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
  query?: Record<string, unknown>;
}) =>
  ({
    method,
    body: body ?? {},
    query: query ?? {},
  } as any);

describe("reminders API", () => {
  beforeEach(() => {
    mocks.getServerSession.mockReset();
    mocks.connectToDatabase.mockReset();
  });

  it("returns an empty degraded reminder inbox when the database is unavailable", async () => {
    mocks.getServerSession.mockResolvedValue({
      user: {
        _id: "507f1f77bcf86cd799439011",
        username: "athlete",
        email: "athlete@example.com",
      },
    });
    mocks.connectToDatabase.mockRejectedValue(new Error("db unavailable"));

    const req = createMockRequest({
      method: "GET",
    });
    const res = createMockResponse();

    await handler(req, res as any);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      reminders: [],
      degraded: true,
    });
  });

  it("returns a degraded empty retention summary when the database is unavailable", async () => {
    mocks.getServerSession.mockResolvedValue({
      user: {
        _id: "507f1f77bcf86cd799439012",
        username: "admin",
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
        summary: "retention",
      },
    });
    const res = createMockResponse();

    await handler(req, res as any);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      delivered: 0,
      opened: 0,
      read: 0,
      postReminderWorkoutStarts: 0,
      degraded: true,
    });
  });
});
