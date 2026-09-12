import { ObjectId } from "mongodb";
import { getCollection } from "../db.js";

export type SessionStatus = "draft" | "scheduled" | "in-progress" | "completed" | "cancelled";

export interface Session {
  _id?: ObjectId;
  eventId: ObjectId;
  title: string;
  slug: string;
  description: string;
  shortDescription?: string;
  type: string;
  status: SessionStatus;
  startTime: Date;
  endTime: Date;
  duration: number; // minutes
  timezone: string;
  speakerIds: ObjectId[];
  venueId?: ObjectId;
  roomName?: string;
  capacity: number;
  currentAttendees: number;
  isFree: boolean;
  price: number;
  currency: string;
  coverImage?: string;
  tags: string[];
  resources: string[];
  livestreamUrl?: string;
  recordingUrl?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const COLLECTION = "sessions";

export async function createSession(data: Omit<Session, "_id" | "createdAt" | "updatedAt">): Promise<Session> {
  const now = new Date();
  const doc = { ...data, createdAt: now, updatedAt: now };
  const res = await getCollection<Session>(COLLECTION).insertOne(doc);
  return { ...doc, _id: res.insertedId };
}

export async function findSessionById(id: string | ObjectId): Promise<Session | null> {
  const _id = typeof id === "string" ? new ObjectId(id) : id;
  return getCollection<Session>(COLLECTION).findOne({ _id });
}

export async function findSessionBySlug(slug: string): Promise<Session | null> {
  return getCollection<Session>(COLLECTION).findOne({ slug });
}

export async function findSessionsByEvent(eventId: string | ObjectId): Promise<Session[]> {
  const _id = typeof eventId === "string" ? new ObjectId(eventId) : eventId;
  return getCollection<Session>(COLLECTION)
    .find({ eventId: _id })
    .sort({ startTime: 1 })
    .toArray();
}

export async function findSessions(filter: Record<string, unknown> = {}, options?: { eventId?: string; speakerId?: string }): Promise<Session[]> {
  const query: Record<string, unknown> = { ...filter };
  if (options?.eventId) query.eventId = new ObjectId(options.eventId);
  if (options?.speakerId) query.speakerIds = new ObjectId(options.speakerId);
  return getCollection<Session>(COLLECTION)
    .find(query)
    .sort({ startTime: 1 })
    .toArray();
}

export async function updateSession(id: string | ObjectId, data: Partial<Session>): Promise<Session | null> {
  const _id = typeof id === "string" ? new ObjectId(id) : id;
  const dataWithTimestamp = { ...data, updatedAt: new Date() };
  await getCollection<Session>(COLLECTION).updateOne({ _id }, { $set: dataWithTimestamp });
  return findSessionById(_id);
}

export async function deleteSession(id: string | ObjectId): Promise<boolean> {
  const _id = typeof id === "string" ? new ObjectId(id) : id;
  const res = await getCollection<Session>(COLLECTION).deleteOne({ _id });
  return res.deletedCount > 0;
}

/** Check for time overlap with existing sessions in the same event */
export async function checkSessionConflict(
  eventId: string | ObjectId,
  startTime: Date,
  endTime: Date,
  excludeSessionId?: string | ObjectId
): Promise<Session[]> {
  const _eventId = typeof eventId === "string" ? new ObjectId(eventId) : eventId;
  const query: Record<string, unknown> = {
    eventId: _eventId,
    status: { $ne: "cancelled" },
    $or: [
      { startTime: { $lt: endTime }, endTime: { $gt: startTime } },
    ],
  };
  const sessions = await getCollection<Session>(COLLECTION).find(query).toArray();
  if (excludeSessionId) {
    const _exclude = typeof excludeSessionId === "string" ? new ObjectId(excludeSessionId) : excludeSessionId;
    return sessions.filter((s) => s._id?.toString() !== _exclude.toString());
  }
  return sessions;
}
