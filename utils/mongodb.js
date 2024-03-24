// import { MongoClient } from "mongodb";

// const uri = process.env.MONGODB_URI;
// const dbName = process.env.MONGODB_DB;

// let cachedClient = null;
// let cachedDb = null;

// const options = {
//   useNewUrlParser: true,
//   useUnifiedTopology: true,
// };

// export default async function connectToDatabase() {
//   if (cachedClient && cachedDb) {
//     return cachedDb;
//   }

//   if (!uri) {
//     throw new Error("MONGODB_URI not defined");
//   }

//   if (!dbName) {
//     throw new Error("MONGODB_DB not defined");
//   }

//   const client = new MongoClient(uri, options);

//   try {
//     await client.connect();
//     const db = client.db(dbName);

//     cachedClient = client;
//     cachedDb = db;

//     return db;
//   } catch (error) {
//     console.error("MongoDB connection error:", error);
//     throw new Error("Failed to connect to the database");
//   }
// }

// export async function disconnectFromDatabase() {
//   try {
//     if (cachedClient) {
//       await cachedClient.close();
//       cachedClient = null;
//       cachedDb = null;
//     }
//   } catch (error) {
//     console.error("Error closing MongoDB client:", error);
//     throw new Error("Failed to disconnect from the database");
//   }
// }

// utils/mongodb.ts
import { MongoClient, Db } from "mongodb";

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB;

let cachedClient;
let cachedDb;

export async function connectToDatabase() {
  if (!cachedClient) {
    cachedClient = new MongoClient(uri);
    await cachedClient.connect();
  }

  if (!cachedDb) {
    cachedDb = cachedClient.db(dbName);
  }

  return cachedDb;
}

export async function disconnectFromDatabase() {
  if (cachedClient) {
    await cachedClient.close();
    cachedClient = null;
    cachedDb = null;
  }
}
