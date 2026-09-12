import { ObjectId } from "mongodb";
import { getCollection } from "../db.js";

export type PackageStatus = "draft" | "active" | "sold-out" | "expired";

export interface Package {
  _id?: ObjectId;
  eventId?: ObjectId;
  name: string;
  slug: string;
  description?: string;
  price: number;
  currency: string;
  status: PackageStatus;
  features: string[];
  inclusions: string[];
  exclusions: string[];
  terms?: string;
  createdAt: Date;
  updatedAt: Date;
}

const COLLECTION = "packages";

export async function createPackage(data: Omit<Package, "_id" | "createdAt" | "updatedAt">): Promise<Package> {
  const now = new Date();
  const doc = { ...data, createdAt: now, updatedAt: now };
  const res = await getCollection<Package>(COLLECTION).insertOne(doc);
  return { ...doc, _id: res.insertedId };
}

export async function findPackageById(id: string | ObjectId): Promise<Package | null> {
  const _id = typeof id === "string" ? new ObjectId(id) : id;
  return getCollection<Package>(COLLECTION).findOne({ _id });
}

export async function findPackageBySlug(slug: string): Promise<Package | null> {
  return getCollection<Package>(COLLECTION).findOne({ slug });
}

export async function findPackages(filter: Record<string, unknown> = {}, options?: { eventId?: string }): Promise<Package[]> {
  const query: Record<string, unknown> = { ...filter };
  if (options?.eventId) query.eventId = new ObjectId(options.eventId);
  return getCollection<Package>(COLLECTION)
    .find(query)
    .sort({ price: 1 })
    .toArray();
}

export async function updatePackage(id: string | ObjectId, data: Partial<Package>): Promise<Package | null> {
  const _id = typeof id === "string" ? new ObjectId(id) : id;
  const dataWithTimestamp = { ...data, updatedAt: new Date() };
  await getCollection<Package>(COLLECTION).updateOne({ _id }, { $set: dataWithTimestamp });
  return findPackageById(_id);
}

export async function deletePackage(id: string | ObjectId): Promise<boolean> {
  const _id = typeof id === "string" ? new ObjectId(id) : id;
  const res = await getCollection<Package>(COLLECTION).deleteOne({ _id });
  return res.deletedCount > 0;
}
