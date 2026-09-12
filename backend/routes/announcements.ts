import { Router } from "express";
import { body, param, query } from "express-validator";
import { createAnnouncement, findAnnouncementById, findAnnouncements, updateAnnouncement, deleteAnnouncement } from "../models/announcement.js";
import { authMiddleware, AuthRequest, requireRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";

const router = Router();

router.use(authMiddleware);

// ─── List announcements ───────────────────────────────────────────────────────
router.get("/", async (req: AuthRequest, res) => {
  const { eventId } = req.query;
  const announcements = await findAnnouncements({}, { eventId: eventId as string });
  res.json(announcements);
});

// ─── Get single announcement ──────────────────────────────────────────────────
router.get("/:id", async (req: AuthRequest, res) => {
  const announcement = await findAnnouncementById(req.params.id);
  if (!announcement) return res.status(404).json({ error: "Announcement not found" });
  res.json(announcement);
});

// ─── Create announcement ──────────────────────────────────────────────────────
router.post(
  "/",
  requireRole("admin", "organizer", "staff"),
  body("title").trim().notEmpty(),
  body("body").trim().notEmpty(),
  body("type").isIn(["info", "warning", "alert", "promo", "urgent"]),
  body("target").isIn(["all", "attendees", "speakers", "sponsors", "staff"]),
  validate,
  async (req: AuthRequest, res) => {
    const data = {
      ...req.body,
      isActive: true,
      priority: req.body.type === "urgent" ? 10 : req.body.type === "alert" ? 7 : req.body.type === "warning" ? 5 : 3,
      authorId: req.user ? new globalThis.ObjectId(req.user.id) : undefined,
    };
    const announcement = await createAnnouncement(data);
    res.status(201).json(announcement);
  }
);

// ─── Update announcement ──────────────────────────────────────────────────────
router.patch(
  "/:id",
  requireRole("admin", "organizer", "staff"),
  body("title").optional().trim().notEmpty(),
  body("body").optional().trim(),
  body("type").optional().isIn(["info", "warning", "alert", "promo", "urgent"]),
  body("target").optional().isIn(["all", "attendees", "speakers", "sponsors", "staff"]),
  body("isActive").optional().isBoolean(),
  validate,
  async (req: AuthRequest, res) => {
    const updated = await updateAnnouncement(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: "Announcement not found" });
    res.json(updated);
  }
);

// ─── Delete announcement ──────────────────────────────────────────────────────
router.delete("/:id", requireRole("admin", "organizer", "staff"), async (req: AuthRequest, res) => {
  await deleteAnnouncement(req.params.id);
  res.json({ message: "Announcement deleted" });
});

export default router;
