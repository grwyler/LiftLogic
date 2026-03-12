import { MongoClient, Db } from "mongodb";

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB;

type MongoCache = {
  client: MongoClient | null;
  db: Db | null;
  promise: Promise<MongoClient> | null;
};

declare global {
  // eslint-disable-next-line no-var
  var __liftLogicMongoCache__: MongoCache | undefined;
}

const globalCache =
  global.__liftLogicMongoCache__ ??
  (global.__liftLogicMongoCache__ = {
    client: null,
    db: null,
    promise: null,
  });

export async function connectToDatabase(): Promise<Db> {
  if (!uri || !dbName) {
    throw new Error("Missing MONGODB_URI or MONGODB_DB");
  }

  if (globalCache.db) {
    return globalCache.db;
  }

  if (!globalCache.promise) {
    const client = new MongoClient(uri, {
      maxPoolSize: 5,
      minPoolSize: 0,
      maxIdleTimeMS: 10000,
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
    });

    globalCache.promise = client.connect();
  }

  globalCache.client = await globalCache.promise;
  globalCache.db = globalCache.client.db(dbName);
  return globalCache.db;
}

export async function disconnectFromDatabase(): Promise<void> {
  try {
    if (globalCache.client) {
      await globalCache.client.close();
      globalCache.client = null;
      globalCache.db = null;
      globalCache.promise = null;
    }
  } catch (error) {
    console.error("Error disconnecting from the database:", error);
    throw error;
  }
}
