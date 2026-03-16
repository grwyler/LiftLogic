import path from "path";

export type OrchestrationStoreBackend = "mongo" | "postgres";

type RuntimeValidationOptions = {
  requireSchemaPath?: boolean;
};

const readEnv = (...keys: string[]) => {
  for (const key of keys) {
    const value = process.env[key];
    if (value && value.trim()) {
      return value.trim();
    }
  }

  return undefined;
};

export const getOrchestrationStoreBackend =
  (): OrchestrationStoreBackend => {
    const backend = readEnv("ORCHESTRATION_STORE_BACKEND") || "mongo";
    return backend.toLowerCase() === "postgres" ? "postgres" : "mongo";
  };

export const getRawOrchestrationStoreBackend = () =>
  readEnv("ORCHESTRATION_STORE_BACKEND") || "mongo";

export const getOrchestrationMongoUri = () =>
  readEnv("ORCHESTRATION_MONGODB_URI", "MONGODB_URI");

export const getOrchestrationMongoDatabaseName = () =>
  readEnv("ORCHESTRATION_MONGODB_DB", "MONGODB_DB");

export const getOrchestrationPostgresUrl = () =>
  readEnv("ORCHESTRATION_POSTGRES_URL", "DATABASE_URL");

export const getOrchestrationPostgresSchemaPath = () =>
  readEnv("ORCHESTRATION_POSTGRES_SCHEMA_PATH") ||
  path.join(process.cwd(), "db", "orchestration-postgres.sql");

export const validateOrchestrationRuntimeConfig = ({
  requireSchemaPath = false,
}: RuntimeValidationOptions = {}) => {
  const rawBackend = getRawOrchestrationStoreBackend().toLowerCase();
  if (rawBackend !== "mongo" && rawBackend !== "postgres") {
    throw new Error(
      `Invalid ORCHESTRATION_STORE_BACKEND "${rawBackend}". Expected "mongo" or "postgres".`
    );
  }

  if (rawBackend === "postgres") {
    if (!getOrchestrationPostgresUrl()) {
      throw new Error(
        "ORCHESTRATION_STORE_BACKEND=postgres requires ORCHESTRATION_POSTGRES_URL or DATABASE_URL."
      );
    }

    if (requireSchemaPath && !getOrchestrationPostgresSchemaPath()) {
      throw new Error(
        "Postgres schema initialization requires ORCHESTRATION_POSTGRES_SCHEMA_PATH or ./db/orchestration-postgres.sql."
      );
    }
  }

  if (rawBackend === "mongo") {
    if (!getOrchestrationMongoUri()) {
      throw new Error(
        "ORCHESTRATION_STORE_BACKEND=mongo requires ORCHESTRATION_MONGODB_URI or MONGODB_URI."
      );
    }

    if (!getOrchestrationMongoDatabaseName()) {
      throw new Error(
        "ORCHESTRATION_STORE_BACKEND=mongo requires ORCHESTRATION_MONGODB_DB or MONGODB_DB."
      );
    }
  }

  return {
    backend: rawBackend as OrchestrationStoreBackend,
    postgresUrl: getOrchestrationPostgresUrl(),
    postgresSchemaPath: getOrchestrationPostgresSchemaPath(),
    mongoUri: getOrchestrationMongoUri(),
    mongoDatabaseName: getOrchestrationMongoDatabaseName(),
    seedEnabled: isOrchestrationSeedEnabled(),
  };
};

export const isOrchestrationSeedEnabled = () => {
  const raw = readEnv("ORCHESTRATION_ENABLE_SEED_DATA");
  if (!raw) {
    return true;
  }

  return raw.toLowerCase() !== "false";
};
