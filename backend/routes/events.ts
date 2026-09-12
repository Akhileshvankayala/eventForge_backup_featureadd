import { Router } from "express";
import { body, param, query } from "express-validator";
import { createEvent, findEventById, findEventBySlug, findEvents, updateEvent, deleteEvent } from "../models/event.js";
import { authMiddleware, AuthRequest, requireRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { ObjectId } from "mongodb";

const router = Router();

router.use(authMiddleware);

// ─── List events ──────────────────────────────────────────────────────────────
router.get("/", async (req: AuthRequest, res) => {
  const { status, organizerId, page = "1", limit = "100" } = req.query;
  const filter: Record<string, unknown> = { visibility: "public" };
  if (status) filter.status = status as any;
  if (organizerId) filter.organizerId = organizerId;
  const events = await findEvents(filter);
  res.json(events);
});

// ─── Get single event ─────────────────────────────────────────────────────────
router.get("/:id", async (req: AuthRequest, res) => {
  const event = await findEventById(req.params.id);
  if (!event) return res.status(404).json({ error: "Event not found" });
  res.json(event);
});

router.get("/slug/:slug", async (req: AuthRequest, res) => {
  const event = await findEventBySlug(req.params.slug);
  if (!event) return res.status(404).json({ error: "Event not found" });
  res.json(event);
});

// ─── Create event (organizer/admin) ───────────────────────────────────────────
router.post(
  "/",
  requireRole("admin", "organizer"),
  body("title").trim().notEmpty(),
  body("slug").trim().notEmpty(),
  body("description").trim().notEmpty(),
  body("startDate").isISO8601(),
  body("endDate").isISO8601(),
  body("timezone").notEmpty(),
  body("capacity").isInt({ min: 0 }),
  body("price").isFloat({ min: 0 }),
  body("currency").notEmpty(),
  validate,
  async (req: AuthRequest, res) => {
    const data = { ...req.body, organizerId: new ObjectId(req.user!.id) };
    const event = await createEvent(data);
    res.status(201).json(event);
  }
);

// ─── Update event ─────────────────────────────────────────────────────────────
router.patch(
  "/:id",
  requireRole("admin", "organizer"),
  body("title").optional().trim().notEmpty(),
  body("slug").optional().trim().notEmpty(),
  body("description").optional().trim(),
  body("status").optional().isIn(["draft", "published", "cancelled", "completed"]),
  body("startDate").optional().isISO8601(),
  body("endDate").optional().isISO8601(),
  body("capacity").optional().isInt({ min: 0 }),
  body("price").optional().isFloat({ min: 0 }),
  validate,
  async (req: AuthRequest, res) => {
    const event = await findEventById(req.params.id);
    if (!event) return res.status(404).json({ error: "Event not found" });
    if (event.organizerId.toString() !== req.user!.id && req.user!.role !== "admin") {
      return res.status(403).json({ error: "Not authorized to edit this event" });
    }
    const updated = await updateEvent(req.params.id, req.body);
    res.json(updated);
  }
);

// ─── Delete event ─────────────────────────────────────────────────────────────
router.delete("/:id", requireRole("admin", "organizer"), async (req: AuthRequest, res) => {
  const event = await findEventById(req.params.id);
  if (!event) return res.status(404).json({ error: "Event not found" });
  if (event.organizerId.toString() !== req.user!.id && req.user!.role !== "admin") {
    return res.status(403).json({ error: "Not authorized" });
  }
  await deleteEvent(req.params.id);
  res.json({ message: "Event deleted" });
});

export default router;
