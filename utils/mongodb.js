import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB;

let cachedClient = null;
let cachedDb = null;

export default async function connectToDatabase() {
  if (cachedClient && cachedDb) {
    return cachedDb;
  }

  if (!uri) {
    throw new Error("MONGODB_URI not defined");
  }

  if (!dbName) {
    throw new Error("MONGODB_DB not defined");
  }

  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db(dbName);

    cachedClient = client;
    cachedDb = db;

    return db;
  } catch (error) {
    console.error("MongoDB connection error:", error);
    throw error;
  }
}
