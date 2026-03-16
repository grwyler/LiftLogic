import dns from "dns";
import { Db, MongoClient } from "mongodb";
import {
  getOrchestrationMongoDatabaseName,
  getOrchestrationMongoUri,
} from "./config";

type MongoCache = {
  client: MongoClient | null;
  db: Db | null;
  promise: Promise<MongoClient> | null;
};

declare global {
  // eslint-disable-next-line no-var
  var __orchestrationMongoCache__: MongoCache | undefined;
}

const globalCache =
  global.__orchestrationMongoCache__ ??
  (global.__orchestrationMongoCache__ = {
    client: null,
    db: null,
    promise: null,
  });

let dnsConfigured = false;

const ensureMongoDnsResolvers = () => {
  if (dnsConfigured) {
    return;
  }

  try {
    const currentServers = dns.getServers();
    const preferredServers = ["1.1.1.1", "8.8.8.8"];
    const nextServers = [
      ...preferredServers,
      ...currentServers.filter((server) => !preferredServers.includes(server)),
    ];

    dns.setServers(nextServers);
    dnsConfigured = true;
  } catch (error) {
    console.warn("Unable to set preferred DNS servers for orchestration MongoDB:", error);
  }
};

export const connectToOrchestrationMongo = async (): Promise<Db> => {
  const uri = getOrchestrationMongoUri();
  const dbName = getOrchestrationMongoDatabaseName();

  if (!uri || !dbName) {
    throw new Error(
      "Mongo orchestration persistence is not configured. Set ORCHESTRATION_MONGODB_URI/ORCHESTRATION_MONGODB_DB or fallback MONGODB_URI/MONGODB_DB."
    );
  }

  if (globalCache.db) {
    return globalCache.db;
  }

  if (!globalCache.promise) {
    ensureMongoDnsResolvers();
    const client = new MongoClient(uri, {
      maxPoolSize: 5,
      minPoolSize: 0,
      maxIdleTimeMS: 10000,
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
    });
    globalCache.promise = client.connect();
  }

  try {
    globalCache.client = await globalCache.promise;
  } catch (error) {
    globalCache.promise = null;
    throw new Error(
      `Unable to connect to orchestration MongoDB (${dbName}). ${error instanceof Error ? error.message : "Unknown connection error."}`
    );
  }

  globalCache.db = globalCache.client.db(dbName);
  return globalCache.db;
};

export const disconnectOrchestrationMongo = async (): Promise<void> => {
  if (!globalCache.client) {
    return;
  }

  await globalCache.client.close();
  globalCache.client = null;
  globalCache.db = null;
  globalCache.promise = null;
};
