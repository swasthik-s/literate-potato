import { MongoClient, type Db } from "mongodb";

const uri = process.env.MONGODB_URI;
if (!uri) {
  // Do not throw during build; throw when a database operation is requested.
}

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

let clientPromise: Promise<MongoClient> | undefined;

export async function getDb(): Promise<Db> {
  if (!uri) throw new Error("MONGODB_URI is not configured");
  if (!clientPromise) {
    const client = new MongoClient(uri, { serverSelectionTimeoutMS: 10000 });
    clientPromise = client.connect();
    if (process.env.NODE_ENV !== "production") global._mongoClientPromise = clientPromise;
  }
  if (process.env.NODE_ENV !== "production" && global._mongoClientPromise) {
    clientPromise = global._mongoClientPromise;
  }
  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DATABASE || "movie_tracker");
  await Promise.all([
    db.collection("movies").createIndex({ "externalIds.tmdb": 1 }, { unique: true, sparse: true }),
    db.collection("movies").createIndex({ titleNormalized: 1 }),
    db.collection("movies").createIndex({ releaseDate: 1, releaseCountry: 1 }),
    db.collection("changeEvents").createIndex({ movieKey: 1, observedAt: -1 }),
    db.collection("sourceRuns").createIndex({ sourceId: 1 }, { unique: true })
  ]);
  return db;
}
