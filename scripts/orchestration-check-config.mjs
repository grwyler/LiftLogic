import fs from "fs/promises";
import process from "process";
import path from "path";

const readEnv = (...keys) => {
  for (const key of keys) {
    const value = process.env[key];
    if (value && value.trim()) {
      return value.trim();
    }
  }

  return undefined;
};

const rawBackend = (readEnv("ORCHESTRATION_STORE_BACKEND") || "mongo").toLowerCase();

if (rawBackend !== "mongo" && rawBackend !== "postgres") {
  console.error(
    `Invalid ORCHESTRATION_STORE_BACKEND "${rawBackend}". Expected "mongo" or "postgres".`
  );
  process.exit(1);
}

const postgresUrl = readEnv("ORCHESTRATION_POSTGRES_URL", "DATABASE_URL");
const mongoUri = readEnv("ORCHESTRATION_MONGODB_URI", "MONGODB_URI");
const mongoDb = readEnv("ORCHESTRATION_MONGODB_DB", "MONGODB_DB");
const schemaPath =
  readEnv("ORCHESTRATION_POSTGRES_SCHEMA_PATH") ||
  path.join(process.cwd(), "db", "orchestration-postgres.sql");

const validate = async () => {
  if (rawBackend === "postgres") {
    if (!postgresUrl) {
      throw new Error(
        "ORCHESTRATION_STORE_BACKEND=postgres requires ORCHESTRATION_POSTGRES_URL or DATABASE_URL."
      );
    }

    await fs.access(schemaPath);
    console.info(`[orchestration] Postgres config looks valid. Schema path: ${schemaPath}`);
    return;
  }

  if (!mongoUri || !mongoDb) {
    throw new Error(
      "ORCHESTRATION_STORE_BACKEND=mongo requires ORCHESTRATION_MONGODB_URI/MONGODB_DB or fallback MONGODB_URI/MONGODB_DB."
    );
  }

  console.info(`[orchestration] Mongo config looks valid. Database: ${mongoDb}`);
};

validate().catch((error) => {
  console.error(
    `Orchestration config validation failed: ${error instanceof Error ? error.message : "Unknown validation error."}`
  );
  process.exit(1);
});
