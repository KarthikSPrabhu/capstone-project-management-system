import { MongoClient, Db, MongoClientOptions, ServerApiVersion } from "mongodb";

/**
 * MongoDB connection helper for Capstone Project Management System (CPMS).
 *
 * Implements client promise caching across hot-reloads in development,
 * adheres to the official Next.js MongoDB singleton pattern,
 * and ensures database credentials are never logged or exposed.
 */

const uri = process.env.MONGODB_URI;
const defaultDbName = process.env.MONGODB_DATABASE || "cpms_nosql";

if (!uri) {
  throw new Error(
    "Configuration error: Missing MONGODB_URI environment variable. Please define it in your .env.local file."
  );
}

const options: MongoClientOptions = {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
};

declare global {
  // Global declaration for TypeScript to allow caching across HMR in development
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === "development") {
  // In development mode, use a global variable to preserve connection across HMR
  if (!global._mongoClientPromise) {
    const client = new MongoClient(uri, options);
    global._mongoClientPromise = client.connect().catch((error) => {
      // Clear cached promise on failure so subsequent requests can retry
      delete global._mongoClientPromise;
      throw error;
    });
  }
  clientPromise = global._mongoClientPromise;
} else {
  // In production mode, use a module-scoped variable
  const client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

/**
 * Obtain the cached MongoClient promise.
 */
export async function getMongoClient(): Promise<MongoClient> {
  return clientPromise;
}

/**
 * Obtain a MongoDB database instance.
 * Defaults to the database name specified in MONGODB_DATABASE env var,
 * or the fallback CPMS database name.
 *
 * @param dbName Optional database name override
 */
export async function getMongoDb(dbName?: string): Promise<Db> {
  const client = await clientPromise;
  const targetDb = dbName || process.env.MONGODB_DATABASE || defaultDbName;
  return client.db(targetDb);
}

export { clientPromise };
export default clientPromise;
