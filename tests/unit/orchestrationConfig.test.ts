import { afterEach, describe, expect, it } from "vitest";
import { validateOrchestrationRuntimeConfig } from "../../server/orchestration/config";

const originalEnv = { ...process.env };

describe("orchestration runtime config", () => {
  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("rejects invalid backend values clearly", () => {
    process.env.ORCHESTRATION_STORE_BACKEND = "redis";

    expect(() => validateOrchestrationRuntimeConfig()).toThrow(
      /Invalid ORCHESTRATION_STORE_BACKEND/
    );
  });

  it("requires a Postgres URL when postgres backend is selected", () => {
    process.env.ORCHESTRATION_STORE_BACKEND = "postgres";
    delete process.env.ORCHESTRATION_POSTGRES_URL;
    delete process.env.DATABASE_URL;

    expect(() => validateOrchestrationRuntimeConfig()).toThrow(
      /requires ORCHESTRATION_POSTGRES_URL/
    );
  });

  it("requires Mongo uri and database when mongo backend is selected", () => {
    process.env.ORCHESTRATION_STORE_BACKEND = "mongo";
    delete process.env.ORCHESTRATION_MONGODB_URI;
    delete process.env.MONGODB_URI;
    delete process.env.ORCHESTRATION_MONGODB_DB;
    delete process.env.MONGODB_DB;

    expect(() => validateOrchestrationRuntimeConfig()).toThrow(
      /requires ORCHESTRATION_MONGODB_URI/
    );
  });
});
