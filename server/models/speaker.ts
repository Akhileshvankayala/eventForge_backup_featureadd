import { ObjectId } from "mongodb";
import { getCollection } from "../db.js";

export interface Speaker {
  _id?: ObjectId;
  eventId?: ObjectId;
  name: string;
  slug: string;
  email?: string;
  bio: string;
  shortBio?: string;
  title?: string;
  company?: string;
  website?: string;
  linkedin?: string;
  twitter?: string;
  github?: string;
  avatar?: string;
  coverImage?: string;
  topics: string[];
  sessionIds: ObjectId[];
  isVirtual: boolean;
  contactEmail?: string;
  contactPhone?: string;
  createdAt: Date;
  updatedAt: Date;
}

const COLLECTION = "speakers";

export async function createSpeaker(data: Omit<Speaker, "_id" | "createdAt" | "updatedAt">): Promise<Speaker> {
  const now = new Date();
  const doc = { ...data, createdAt: now, updatedAt: now };
  const res = await getCollection<Speaker>(COLLECTION).insertOne(doc);
  return { ...doc, _id: res.insertedId };
}

export async function findSpeakerById(id: string | ObjectId): Promise<Speaker | null> {
  const _id = typeof id === "string" ? new ObjectId(id) : id;
  return getCollection<Speaker>(COLLECTION).findOne({ _id });
}

export async function findSpeakerBySlug(slug: string): Promise<Speaker | null> {
  return getCollection<Speaker>(COLLECTION).findOne({ slug });
}

export async function findSpeakers(filter: Record<string, unknown> = {}, options?: { eventId?: string }): Promise<Speaker[]> {
  const query: Record<string, unknown> = { ...filter };
  if (options?.eventId) query.eventId = new ObjectId(options.eventId);
  return getCollection<Speaker>(COLLECTION)
    .find(query)
    .sort({ name: 1 })
    .toArray();
}

export async function updateSpeaker(id: string | ObjectId, data: Partial<Speaker>): Promise<Speaker | null> {
  const _id = typeof id === "string" ? new ObjectId(id) : id;
  const dataWithTimestamp = { ...data, updatedAt: new Date() };
  await getCollection<Speaker>(COLLECTION).updateOne({ _id }, { $set: dataWithTimestamp });
  return findSpeakerById(_id);
}

export async function deleteSpeaker(id: string | ObjectId): Promise<boolean> {
  const _id = typeof id === "string" ? new ObjectId(id) : id;
  const res = await getCollection<Speaker>(COLLECTION).deleteOne({ _id });
  return res.deletedCount > 0;
}
