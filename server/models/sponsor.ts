import { ObjectId } from "mongodb";
import { getCollection } from "../db.js";

export type SponsorTier = "platinum" | "gold" | "silver" | "bronze" | "community";

export interface Sponsor {
  _id?: ObjectId;
  eventId?: ObjectId;
  name: string;
  slug: string;
  company: string;
  tier: SponsorTier;
  description: string;
  logo?: string;
  website?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  boothNumber?: string;
  boothSize?: string;
  socialLinks: Record<string, string>;
  createdAt: Date;
  updatedAt: Date;
}

const COLLECTION = "sponsors";

export async function createSponsor(data: Omit<Sponsor, "_id" | "createdAt" | "updatedAt">): Promise<Sponsor> {
  const now = new Date();
  const doc = { ...data, createdAt: now, updatedAt: now };
  const res = await getCollection<Sponsor>(COLLECTION).insertOne(doc);
  return { ...doc, _id: res.insertedId };
}

export async function findSponsorById(id: string | ObjectId): Promise<Sponsor | null> {
  const _id = typeof id === "string" ? new ObjectId(id) : id;
  return getCollection<Sponsor>(COLLECTION).findOne({ _id });
}

export async function findSponsorBySlug(slug: string): Promise<Sponsor | null> {
  return getCollection<Sponsor>(COLLECTION).findOne({ slug });
}

export async function findSponsors(filter: Record<string, unknown> = {}, options?: { eventId?: string; tier?: SponsorTier }): Promise<Sponsor[]> {
  const query: Record<string, unknown> = { ...filter };
  if (options?.eventId) query.eventId = new ObjectId(options.eventId);
  if (options?.tier) query.tier = options.tier;
  return getCollection<Sponsor>(COLLECTION)
    .find(query)
    .sort({ tier: -1, name: 1 })
    .toArray();
}

export async function updateSponsor(id: string | ObjectId, data: Partial<Sponsor>): Promise<Sponsor | null> {
  const _id = typeof id === "string" ? new ObjectId(id) : id;
  const dataWithTimestamp = { ...data, updatedAt: new Date() };
  await getCollection<Sponsor>(COLLECTION).updateOne({ _id }, { $set: dataWithTimestamp });
  return findSponsorById(_id);
}

export async function deleteSponsor(id: string | ObjectId): Promise<boolean> {
  const _id = typeof id === "string" ? new ObjectId(id) : id;
  const res = await getCollection<Sponsor>(COLLECTION).deleteOne({ _id });
  return res.deletedCount > 0;
}
