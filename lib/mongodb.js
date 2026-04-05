import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
const dbName = process.env.DB_NAME || process.env.MONGODB_DB_NAME || "fussgoal";

let client;
let clientPromise;

if (uri && process.env.NODE_ENV === "development") {
  if (!globalThis.__fussgoalMongoClientPromise) {
    client = new MongoClient(uri);
    globalThis.__fussgoalMongoClientPromise = client.connect();
  }

  clientPromise = globalThis.__fussgoalMongoClientPromise;
} else if (uri) {
  client = new MongoClient(uri);
  clientPromise = client.connect();
}

export async function getDb() {
  if (!clientPromise) {
    throw new Error("Missing MONGODB_URI environment variable.");
  }

  const connectedClient = await clientPromise;
  return connectedClient.db(dbName);
}
