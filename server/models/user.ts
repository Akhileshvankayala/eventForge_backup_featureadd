import { ObjectId } from "mongodb";
import { getCollection } from "../db.js";

export type UserRole = "admin" | "organizer" | "staff" | "speaker" | "attendee" | "sponsor";

export interface User {
  _id?: ObjectId;
  email: string;
  passwordHash: string;
  name: string;
  role: UserRole;
  avatar?: string;
  phone?: string;
  organization?: string;
  bio?: string;
  createdAt: Date;
  updatedAt: Date;
}

const COLLECTION = "users";

export async function createUser(data: Omit<User, "_id" | "createdAt" | "updatedAt">): Promise<User> {
  const now = new Date();
  const doc = { ...data, createdAt: now, updatedAt: now };
  const res = await getCollection<User>(COLLECTION).insertOne(doc);
  return { ...doc, _id: res.insertedId };
}

export async function findUserById(id: string | ObjectId): Promise<User | null> {
  const _id = typeof id === "string" ? new ObjectId(id) : id;
  return getCollection<User>(COLLECTION).findOne({ _id });
}

export async function findUserByEmail(email: string): Promise<User | null> {
  return getCollection<User>(COLLECTION).findOne({ email: email.toLowerCase() });
}

export async function findUsers(filter: Record<string, unknown> = {}, options?: { role?: UserRole }): Promise<User[]> {
  const query: Record<string, unknown> = { ...filter };
  if (options?.role) query.role = options.role;
  return getCollection<User>(COLLECTION).find(query).sort({ createdAt: -1 }).toArray();
}

export async function updateUser(id: string | ObjectId, data: Partial<User>): Promise<User | null> {
  const _id = typeof id === "string" ? new ObjectId(id) : id;
  const dataWithTimestamp = { ...data, updatedAt: new Date() };
  await getCollection<User>(COLLECTION).updateOne({ _id }, { $set: dataWithTimestamp });
  return findUserById(_id);
}

export async function deleteUser(id: string | ObjectId): Promise<boolean> {
  const _id = typeof id === "string" ? new ObjectId(id) : id;
  const res = await getCollection<User>(COLLECTION).deleteOne({ _id });
  return res.deletedCount > 0;
}
