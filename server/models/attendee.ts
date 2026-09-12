import { ObjectId } from "mongodb";
import { getCollection } from "../db.js";

export type RegistrationStatus = "pending" | "approved" | "rejected" | "waitlisted" | "cancelled" | "completed" | "refunded";

export interface Attendee {
  _id?: ObjectId;
  eventId: ObjectId;
  userId?: ObjectId;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  organization?: string;
  jobTitle?: string;
  dietaryRequirements?: string[];
  accessibilityRequirements?: string[];
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  registrationStatus: RegistrationStatus;
  ticketTypeId?: ObjectId;
  ticketTypePrice?: number;
  couponCode?: string;
  discountAmount?: number;
  finalPrice?: number;
  checkedIn: boolean;
  checkedInAt?: Date;
  qrCode?: string;
  notes?: string;
  waitlistPosition?: number;
  createdAt: Date;
  updatedAt: Date;
}

const COLLECTION = "attendees";

export async function createAttendee(data: Omit<Attendee, "_id" | "createdAt" | "updatedAt">): Promise<Attendee> {
  const now = new Date();
  const doc = { ...data, createdAt: now, updatedAt: now };
  const res = await getCollection<Attendee>(COLLECTION).insertOne(doc);
  return { ...doc, _id: res.insertedId };
}

export async function findAttendeeById(id: string | ObjectId): Promise<Attendee | null> {
  const _id = typeof id === "string" ? new ObjectId(id) : id;
  return getCollection<Attendee>(COLLECTION).findOne({ _id });
}

export async function findAttendeeByEmailAndEvent(eventId: string | ObjectId, email: string): Promise<Attendee | null> {
  const _id = typeof eventId === "string" ? new ObjectId(eventId) : eventId;
  return getCollection<Attendee>(COLLECTION).findOne({ eventId: _id, email: email.toLowerCase() });
}

export async function findAttendeeByQrCode(qrCode: string): Promise<Attendee | null> {
  return getCollection<Attendee>(COLLECTION).findOne({ qrCode });
}

export async function findAttendeesByEvent(eventId: string | ObjectId, options?: { status?: RegistrationStatus }): Promise<Attendee[]> {
  const _id = typeof eventId === "string" ? new ObjectId(eventId) : eventId;
  const query: Record<string, unknown> = { eventId: _id };
  if (options?.status) query.registrationStatus = options.status;
  return getCollection<Attendee>(COLLECTION)
    .find(query)
    .sort({ createdAt: -1 })
    .toArray();
}

export async function findAttendeesByUser(userId: string | ObjectId): Promise<Attendee[]> {
  const _id = typeof userId === "string" ? new ObjectId(userId) : userId;
  return getCollection<Attendee>(COLLECTION)
    .find({ userId: _id })
    .sort({ createdAt: -1 })
    .toArray();
}

export async function updateAttendee(id: string | ObjectId, data: Partial<Attendee>): Promise<Attendee | null> {
  const _id = typeof id === "string" ? new ObjectId(id) : id;
  const dataWithTimestamp = { ...data, updatedAt: new Date() };
  await getCollection<Attendee>(COLLECTION).updateOne({ _id }, { $set: dataWithTimestamp });
  return findAttendeeById(_id);
}

export async function updateAttendeeCheckin(id: string | ObjectId): Promise<Attendee | null> {
  const _id = typeof id === "string" ? new ObjectId(id) : id;
  const now = new Date();
  await getCollection<Attendee>(COLLECTION).updateOne(
    { _id },
    { $set: { checkedIn: true, checkedInAt: now, updatedAt: now } }
  );
  return findAttendeeById(_id);
}

export async function deleteAttendee(id: string | ObjectId): Promise<boolean> {
  const _id = typeof id === "string" ? new ObjectId(id) : id;
  const res = await getCollection<Attendee>(COLLECTION).deleteOne({ _id });
  return res.deletedCount > 0;
}
