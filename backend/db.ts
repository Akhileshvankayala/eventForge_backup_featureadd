import { MongoClient, Db, Collection } from "mongodb";

const MONGO_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017";
const DB_NAME = process.env.DB_NAME || "eventForge";

let client: MongoClient | null = null;
let db: Db | null = null;

export async function connectDB(): Promise<Db> {
  if (db) return db;
  client = new MongoClient(MONGO_URI);
  await client.connect();
  db = client.db(DB_NAME);
  console.log(`Connected to MongoDB — DB: ${DB_NAME} on ${MONGO_URI}`);
  return db;
}

export function getDb(): Db {
  if (!db) throw new Error("Database not initialized. Call connectDB() first.");
  return db;
}

export function getCollection<T>(name: string): Collection<T> {
  return getDb().collection<T>(name);
}

export async function closeDB(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    db = null;
    console.log("MongoDB connection closed.");
  }
}
