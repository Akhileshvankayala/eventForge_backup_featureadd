import { Router } from "express";
import { body, param, query } from "express-validator";
import { createSpeaker, findSpeakerById, findSpeakerBySlug, findSpeakers, updateSpeaker, deleteSpeaker } from "../models/speaker.js";
import { authMiddleware, AuthRequest, requireRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";

const router = Router();

router.use(authMiddleware);

// ─── List speakers ────────────────────────────────────────────────────────────
router.get("/", async (req: AuthRequest, res) => {
  const { eventId } = req.query;
  const speakers = await findSpeakers({}, { eventId: eventId as string });
  res.json(speakers);
});

// ─── Get single speaker ───────────────────────────────────────────────────────
router.get("/:id", async (req: AuthRequest, res) => {
  const speaker = await findSpeakerById(req.params.id);
  if (!speaker) return res.status(404).json({ error: "Speaker not found" });
  res.json(speaker);
});

router.get("/slug/:slug", async (req: AuthRequest, res) => {
  const speaker = await findSpeakerBySlug(req.params.slug);
  if (!speaker) return res.status(404).json({ error: "Speaker not found" });
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
  async (req: AuthRequest, res) => {
    const speaker = await createSpeaker(req.body);
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
    const updated = await updateSpeaker(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: "Speaker not found" });
    res.json(updated);
  }
);

// ─── Delete speaker ───────────────────────────────────────────────────────────
router.delete("/:id", requireRole("admin", "organizer", "staff"), async (req: AuthRequest, res) => {
  await deleteSpeaker(req.params.id);
  res.json({ message: "Speaker deleted" });
});

export default router;
