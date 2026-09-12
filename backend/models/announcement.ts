import { ObjectId } from "mongodb";
import { getCollection } from "../db.js";

export type AnnouncementType = "info" | "warning" | "alert" | "promo" | "urgent";
export type AnnouncementTarget = "all" | "attendees" | "speakers" | "sponsors" | "staff";

export interface Announcement {
  _id?: ObjectId;
  eventId?: ObjectId;
  title: string;
  body: string;
  type: AnnouncementType;
  target: AnnouncementTarget;
  isActive: boolean;
  priority: number;
  authorId?: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const COLLECTION = "announcements";

export async function createAnnouncement(data: Omit<Announcement, "_id" | "createdAt" | "updatedAt">): Promise<Announcement> {
  const now = new Date();
  const doc = { ...data, createdAt: now, updatedAt: now };
  const res = await getCollection<Announcement>(COLLECTION).insertOne(doc);
  return { ...doc, _id: res.insertedId };
}

export async function findAnnouncementById(id: string | ObjectId): Promise<Announcement | null> {
  const _id = typeof id === "string" ? new ObjectId(id) : id;
  return getCollection<Announcement>(COLLECTION).findOne({ _id });
}

export async function findAnnouncements(filter: Record<string, unknown> = {}, options?: { eventId?: string }): Promise<Announcement[]> {
  const query: Record<string, unknown> = { ...filter, isActive: true };
  if (options?.eventId) query.eventId = new ObjectId(options.eventId);
  return getCollection<Announcement>(COLLECTION)
    .find(query)
    .sort({ priority: -1, createdAt: -1 })
    .toArray();
}

export async function updateAnnouncement(id: string | ObjectId, data: Partial<Announcement>): Promise<Announcement | null> {
  const _id = typeof id === "string" ? new ObjectId(id) : id;
  const dataWithTimestamp = { ...data, updatedAt: new Date() };
  await getCollection<Announcement>(COLLECTION).updateOne({ _id }, { $set: dataWithTimestamp });
  return findAnnouncementById(_id);
}

export async function deleteAnnouncement(id: string | ObjectId): Promise<boolean> {
  const _id = typeof id === "string" ? new ObjectId(id) : id;
  const res = await getCollection<Announcement>(COLLECTION).deleteOne({ _id });
  return res.deletedCount > 0;
}
