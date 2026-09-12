import { Router } from "express";
import { getCollection } from "../db.js";

// Public (unauthenticated) read endpoints for the marketing/landing experience.
// Only published + public-visibility events are exposed, with limited fields.
const router = Router();

router.get("/events", async (_req, res) => {
  const events = await getCollection("events")
    .find({ status: "published", visibility: "public" })
    .sort({ startDate: 1 })
    .toArray();
  const venueIds = Array.from(new Set(events.map((e: any) => e.venueId?.toString()).filter(Boolean)));
  const { ObjectId } = await import("mongodb");
  const venues = await getCollection("venues")
    .find({ _id: { $in: venueIds.map((id) => new ObjectId(id)) } })
    .toArray();
  const venueById = new Map(venues.map((v: any) => [v._id.toString(), v]));
  res.json(
    events.map((e: any) => ({
      id: e._id.toString(),
      title: e.title,
      slug: e.slug,
      description: e.description,
      type: e.type,
      startDate: e.startDate,
      endDate: e.endDate,
      coverImage: e.coverImage ?? null,
      tags: e.tags ?? [],
      venue: e.venueId ? venueById.get(e.venueId.toString()) ?? null : null,
    }))
  );
});

export default router;
