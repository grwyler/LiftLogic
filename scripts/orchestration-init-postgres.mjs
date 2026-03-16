import fs from "fs/promises";
import path from "path";
import process from "process";
import pg from "pg";

const { Client } = pg;

const readEnv = (...keys) => {
  for (const key of keys) {
    const value = process.env[key];
    if (value && value.trim()) {
      return value.trim();
    }
  }

  return undefined;
};

const connectionString = readEnv(
  "ORCHESTRATION_POSTGRES_URL",
  "DATABASE_URL"
);

if (!connectionString) {
  console.error(
    "Missing ORCHESTRATION_POSTGRES_URL or DATABASE_URL for orchestration schema init."
  );
  process.exit(1);
}

const schemaPath =
  process.argv[2] ||
  readEnv("ORCHESTRATION_POSTGRES_SCHEMA_PATH") ||
  path.join(process.cwd(), "db", "orchestration-postgres.sql");

const main = async () => {
  try {
    await fs.access(schemaPath);
  } catch {
    throw new Error(
      `Schema file not found at ${schemaPath}. Set ORCHESTRATION_POSTGRES_SCHEMA_PATH or pass an explicit path.`
    );
  }

  const sql = await fs.readFile(schemaPath, "utf8");
  const client = new Client({
    connectionString,
  });

  console.info(`[orchestration] Connecting to Postgres for schema init using ${schemaPath}`);
  await client.connect();

  try {
    await client.query(sql);
    console.log(`Orchestration Postgres schema initialized from ${schemaPath}`);
  } finally {
    await client.end();
  }
};

main().catch((error) => {
  console.error("Failed to initialize orchestration Postgres schema:", error);
  process.exit(1);
});
