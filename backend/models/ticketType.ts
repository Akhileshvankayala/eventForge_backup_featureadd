import { ObjectId } from "mongodb";
import { getCollection } from "../db.js";

export type TicketStatus = "active" | "sold-out" | "hidden" | "expired";

export interface TicketType {
  _id?: ObjectId;
  eventId: ObjectId;
  name: string;
  slug: string;
  description?: string;
  price: number;
  currency: string;
  status: TicketStatus;
  totalQuantity: number;
  remainingQuantity: number;
  soldQuantity: number;
  minQuantity?: number;
  maxQuantity?: number;
  salesStart: Date;
  salesEnd: Date;
  whatsIncluded: string[];
  refundPolicy?: string;
  earlyBird: boolean;
  groupDiscount: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const COLLECTION = "ticketTypes";

export async function createTicketType(data: Omit<TicketType, "_id" | "createdAt" | "updatedAt">): Promise<TicketType> {
  const now = new Date();
  const doc = { ...data, createdAt: now, updatedAt: now };
  const res = await getCollection<TicketType>(COLLECTION).insertOne(doc);
  return { ...doc, _id: res.insertedId };
}

export async function findTicketTypeById(id: string | ObjectId): Promise<TicketType | null> {
  const _id = typeof id === "string" ? new ObjectId(id) : id;
  return getCollection<TicketType>(COLLECTION).findOne({ _id });
}

export async function findTicketTypesByEvent(eventId: string | ObjectId): Promise<TicketType[]> {
  const _id = typeof eventId === "string" ? new ObjectId(eventId) : id;
  return getCollection<TicketType>(COLLECTION)
    .find({ eventId: _id })
    .sort({ price: 1 })
    .toArray();
}

export async function findTicketTypes(filter: Record<string, unknown> = {}): Promise<TicketType[]> {
  return getCollection<TicketType>(COLLECTION).find(filter).sort({ price: 1 }).toArray();
}

export async function updateTicketType(id: string | ObjectId, data: Partial<TicketType>): Promise<TicketType | null> {
  const _id = typeof id === "string" ? new ObjectId(id) : id;
  const dataWithTimestamp = { ...data, updatedAt: new Date() };
  await getCollection<TicketType>(COLLECTION).updateOne({ _id }, { $set: dataWithTimestamp });
  return findTicketTypeById(_id);
}

export async function decrementTicketQuantity(id: string | ObjectId, qty: number = 1): Promise<TicketType | null> {
  const _id = typeof id === "string" ? new ObjectId(id) : id;
  await getCollection<TicketType>(COLLECTION).updateOne(
    { _id, remainingQuantity: { $gte: qty } },
    { $inc: { remainingQuantity: -qty, soldQuantity: qty } }
  );
  return findTicketTypeById(_id);
}

export async function deleteTicketType(id: string | ObjectId): Promise<boolean> {
  const _id = typeof id === "string" ? new ObjectId(id) : id;
  const res = await getCollection<TicketType>(COLLECTION).deleteOne({ _id });
  return res.deletedCount > 0;
}
