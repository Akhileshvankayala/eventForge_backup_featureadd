import { Response, NextFunction } from "express";
import { ObjectId } from "mongodb";
import { AuthRequest } from "./auth.js";
import { getCollection } from "../db.js";

// ─── Event-scoped authorization ──────────────────────────────────────────────
// Rule: admins see everything. Organizers/staff see only data under events they
// organize. Attendees (and other roles) see published + public events only.

export async function ownedEventIds(userId: string): Promise<ObjectId[]> {
  const events = await getCollection("events")
    .find({ organizerId: new ObjectId(userId) })
    .project({ _id: 1 })
    .toArray();
  return events.map((e: any) => e._id as ObjectId);
}

export function isAdmin(req: AuthRequest): boolean {
  return req.user?.role === "admin";
}

export function isStaffSide(req: AuthRequest): boolean {
  return req.user?.role === "admin" || req.user?.role === "organizer" || req.user?.role === "staff";
}

// Resolve an event id from params/query/body for ownership checks.
function eventIdFrom(req: AuthRequest): string | null {
  const p = req.params as Record<string, unknown>;
  const q = req.query as Record<string, unknown>;
  const b = (req.body ?? {}) as Record<string, unknown>;
  const v = p.eventId ?? q.eventId ?? b.eventId;
  return typeof v === "string" && v.length > 0 ? v : null;
}

// Returns true when admin or the event belongs to the caller (sends 403/404
// itself and returns false otherwise). Use inside handlers that load their
// own parent event (e.g. /:id routes).
export async function assertOwnEvent(req: AuthRequest, res: Response, eventId: string | ObjectId): Promise<boolean> {
  if (isAdmin(req)) return true;
  let event: any = null;
  try {
    const _id = typeof eventId === "string" ? new ObjectId(eventId) : eventId;
    event = await getCollection("events").findOne({ _id });
  } catch {
    res.status(400).json({ error: "Invalid event id" });
    return false;
  }
  if (!event) {
    res.status(404).json({ error: "Event not found" });
    return false;
  }
  if (!isStaffSide(req) || event.organizerId?.toString() !== req.user!.id) {
    // Attendees may see published + public events, nothing else.
    const visible =
      !isStaffSide(req) && event.status === "published" && event.visibility === "public";
    if (!visible) {
      res.status(403).json({ error: "Not authorized for this event" });
      return false;
    }
  }
  return true;
}

// Event ids the caller may list children for. null = unrestricted (admin).
export async function visibleEventIds(req: AuthRequest): Promise<ObjectId[] | null> {
  if (isAdmin(req)) return null;
  if (isStaffSide(req)) return ownedEventIds(req.user!.id);
  const events = await getCollection("events")
    .find({ status: "published", visibility: "public" })
    .project({ _id: 1 })
    .toArray();
  return events.map((e: any) => e._id as ObjectId);
}

export async function requireEventAccess(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  if (isAdmin(req)) {
    next();
    return;
  }
  const eventId = eventIdFrom(req);
  if (!eventId) {
    // No event context: staff narrow their own lists downstream; attendees
    // must not enumerate restricted collections without one.
    if (isStaffSide(req)) {
      next();
      return;
    }
    res.status(403).json({ error: "An event context is required" });
    return;
  }
  if (!(await assertOwnEvent(req, res, eventId))) return;
  next();
}
