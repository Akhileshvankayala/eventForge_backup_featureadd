import { ObjectId } from "mongodb";
import { getCollection } from "../db.js";

export interface Venue {
  _id?: ObjectId;
  name: string;
  slug: string;
  description?: string;
  address: string;
  city: string;
  state?: string;
  country: string;
  postalCode?: string;
  latitude?: number;
  longitude?: number;
  capacity: number;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  amenities: string[];
  amenitiesDetailed: Record<string, string>;
  images: string[];
  isVirtual: boolean;
  virtualUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const COLLECTION = "venues";

export async function createVenue(data: Omit<Venue, "_id" | "createdAt" | "updatedAt">): Promise<Venue> {
  const now = new Date();
  const doc = { ...data, createdAt: now, updatedAt: now };
  const res = await getCollection<Venue>(COLLECTION).insertOne(doc);
  return { ...doc, _id: res.insertedId };
}

export async function findVenueById(id: string | ObjectId): Promise<Venue | null> {
  const _id = typeof id === "string" ? new ObjectId(id) : id;
  return getCollection<Venue>(COLLECTION).findOne({ _id });
}

export async function findVenueBySlug(slug: string): Promise<Venue | null> {
  return getCollection<Venue>(COLLECTION).findOne({ slug });
}

export async function findVenues(filter: Record<string, unknown> = {}): Promise<Venue[]> {
  return getCollection<Venue>(COLLECTION).find(filter).sort({ name: 1 }).toArray();
}

export async function updateVenue(id: string | ObjectId, data: Partial<Venue>): Promise<Venue | null> {
  const _id = typeof id === "string" ? new ObjectId(id) : id;
  const dataWithTimestamp = { ...data, updatedAt: new Date() };
  await getCollection<Venue>(COLLECTION).updateOne({ _id }, { $set: dataWithTimestamp });
  return findVenueById(_id);
}

export async function deleteVenue(id: string | ObjectId): Promise<boolean> {
  const _id = typeof id === "string" ? new ObjectId(id) : id;
  const res = await getCollection<Venue>(COLLECTION).deleteOne({ _id });
  return res.deletedCount > 0;
}
