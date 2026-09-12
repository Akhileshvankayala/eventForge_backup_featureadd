import { ObjectId } from "mongodb";
import { getCollection } from "../db.js";

export type EventStatus = "draft" | "published" | "cancelled" | "completed";

export interface Event {
  _id?: ObjectId;
  title: string;
  slug: string;
  description: string;
  shortDescription?: string;
  status: EventStatus;
  type: string;
  startDate: Date;
  endDate: Date;
  startTime?: string;
  endTime?: string;
  timezone: string;
  organizerId: ObjectId;
  venueId?: ObjectId;
  coverImage?: string;
  bannerImage?: string;
  location?: string;
  address?: string;
  city?: string;
  country?: string;
  isOnline: boolean;
  onlineUrl?: string;
  capacity: number;
  price: number;
  currency: string;
  tagIds: string[];
  categoryIds: string[];
  visibility: "public" | "private" | "invite-only";
  features: string[];
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const COLLECTION = "events";

export async function createEvent(data: Omit<Event, "_id" | "createdAt" | "updatedAt">): Promise<Event> {
  const now = new Date();
  const doc = { ...data, createdAt: now, updatedAt: now };
  const res = await getCollection<Event>(COLLECTION).insertOne(doc);
  return { ...doc, _id: res.insertedId };
}

export async function findEventById(id: string | ObjectId): Promise<Event | null> {
  const _id = typeof id === "string" ? new ObjectId(id) : id;
  return getCollection<Event>(COLLECTION).findOne({ _id });
}

export async function findEventBySlug(slug: string): Promise<Event | null> {
  return getCollection<Event>(COLLECTION).findOne({ slug });
}

export async function findEvents(filter: Record<string, unknown> = {}, options?: { status?: EventStatus; organizerId?: string }): Promise<Event[]> {
  const query: Record<string, unknown> = { ...filter };
  if (options?.status) query.status = options.status;
  if (options?.organizerId) query.organizerId = new ObjectId(options.organizerId);
  return getCollection<Event>(COLLECTION)
    .find(query)
    .sort({ startDate: 1 })
    .toArray();
}

export async function updateEvent(id: string | ObjectId, data: Partial<Event>): Promise<Event | null> {
  const _id = typeof id === "string" ? new ObjectId(id) : id;
  const dataWithTimestamp = { ...data, updatedAt: new Date() };
  await getCollection<Event>(COLLECTION).updateOne({ _id }, { $set: dataWithTimestamp });
  return findEventById(_id);
}

export async function deleteEvent(id: string | ObjectId): Promise<boolean> {
  const _id = typeof id === "string" ? new ObjectId(id) : id;
  const res = await getCollection<Event>(COLLECTION).deleteOne({ _id });
  return res.deletedCount > 0;
}
