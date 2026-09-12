import { Router } from "express";
import { ObjectId } from "mongodb";
import { body, param, query } from "express-validator";
import { createSpeaker, findSpeakerById, findSpeakerBySlug, findSpeakers, updateSpeaker, deleteSpeaker } from "../models/speaker.js";
import { authMiddleware, AuthRequest, requireRole } from "../middleware/auth.js";
import { assertOwnEvent, isAdmin, isStaffSide, requireEventAccess, visibleEventIds } from "../middleware/scope.js";
import { validate } from "../middleware/validate.js";

const router = Router();

router.use(authMiddleware);

// ─── List speakers ────────────────────────────────────────────────────────────
// Organizers see their events' speakers plus unassigned roster entries.
router.get("/", async (req: AuthRequest, res) => {
  const { eventId } = req.query;
  if (eventId) {
    if (!(await assertOwnEvent(req, res, eventId as string))) return;
    const speakers = await findSpeakers({}, { eventId: eventId as string });
    res.json(speakers);
    return;
  }
  if (!isAdmin(req) && isStaffSide(req)) {
    const visible = await visibleEventIds(req);
    const speakers = await findSpeakers({
      $or: [{ eventId: { $in: visible } }, { eventId: { $exists: false } }, { eventId: null }],
    });
    res.json(speakers);
    return;
  }
  const speakers = await findSpeakers({});
  res.json(speakers);
});

// ─── Get single speaker ───────────────────────────────────────────────────────
router.get("/:id", async (req: AuthRequest, res) => {
  const speaker = await findSpeakerById(req.params.id);
  if (!speaker) return res.status(404).json({ error: "Speaker not found" });
  if (speaker.eventId && !(await assertOwnEvent(req, res, speaker.eventId))) return;
  res.json(speaker);
});

router.get("/slug/:slug", async (req: AuthRequest, res) => {
  const speaker = await findSpeakerBySlug(req.params.slug);
  if (!speaker) return res.status(404).json({ error: "Speaker not found" });
  if (speaker.eventId && !(await assertOwnEvent(req, res, speaker.eventId))) return;
  res.json(speaker);
});

// ─── Create speaker ───────────────────────────────────────────────────────────
router.post(
  "/",
  requireRole("admin", "organizer", "staff"),
  body("name").trim().notEmpty(),
  body("slug").trim().notEmpty(),
  body("bio").trim().notEmpty(),
  validate,
  requireEventAccess,
  async (req: AuthRequest, res) => {
    const data = {
      ...req.body,
      eventId: req.body.eventId ? new ObjectId(req.body.eventId) : undefined,
    };
    const speaker = await createSpeaker(data);
    res.status(201).json(speaker);
  }
);

// ─── Update speaker ───────────────────────────────────────────────────────────
router.patch(
  "/:id",
  requireRole("admin", "organizer", "staff"),
  body("name").optional().trim().notEmpty(),
  body("slug").optional().trim().notEmpty(),
  body("bio").optional().trim(),
  body("topics").optional().isArray(),
  validate,
  async (req: AuthRequest, res) => {
    const existing = await findSpeakerById(req.params.id);
    if (!existing) return res.status(404).json({ error: "Speaker not found" });
    if (existing.eventId && !(await assertOwnEvent(req, res, existing.eventId))) return;
    if (req.body.eventId && !(await assertOwnEvent(req, res, req.body.eventId))) return;
    const data = {
      ...req.body,
      eventId: req.body.eventId ? new ObjectId(req.body.eventId) : undefined,
    };
    const updated = await updateSpeaker(req.params.id, data);
    if (!updated) return res.status(404).json({ error: "Speaker not found" });
    res.json(updated);
  }
);

// ─── Delete speaker ───────────────────────────────────────────────────────────
router.delete("/:id", requireRole("admin", "organizer", "staff"), async (req: AuthRequest, res) => {
  const existing = await findSpeakerById(req.params.id);
  if (!existing) return res.status(404).json({ error: "Speaker not found" });
  if (existing.eventId && !(await assertOwnEvent(req, res, existing.eventId))) return;
  await deleteSpeaker(req.params.id);
  res.json({ message: "Speaker deleted" });
});

export default router;
