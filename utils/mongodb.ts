// // utils/mongodb.ts
import { MongoClient, Db } from "mongodb";

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB;

let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

export async function connectToDatabase(): Promise<Db> {
  try {
    if (!cachedClient) {
      cachedClient = new MongoClient(uri);
      await cachedClient.connect();
    }

    if (!cachedDb) {
      cachedDb = cachedClient.db(dbName);
    }

    return cachedDb;
  } catch (error) {
    console.error("Error connecting to the database:", error);
    throw error;
  }
}

export async function disconnectFromDatabase(): Promise<void> {
  try {
    if (cachedClient) {
      await cachedClient.close();
      cachedClient = null;
      cachedDb = null;
    }
  } catch (error) {
    console.error("Error disconnecting from the database:", error);
    throw error;
  }
}
