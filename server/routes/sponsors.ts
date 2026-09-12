import { Router } from "express";
import { body, param, query } from "express-validator";
import { createSponsor, findSponsorById, findSponsorBySlug, findSponsors, updateSponsor, deleteSponsor } from "../models/sponsor.js";
import { authMiddleware, AuthRequest, requireRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";

const router = Router();

router.use(authMiddleware);

// ─── List sponsors ────────────────────────────────────────────────────────────
router.get("/", async (req: AuthRequest, res) => {
  const { eventId, tier } = req.query;
  const sponsors = await findSponsors({}, { eventId: eventId as string, tier: tier as any });
  res.json(sponsors);
});

// ─── Get single sponsor ───────────────────────────────────────────────────────
router.get("/:id", async (req: AuthRequest, res) => {
  const sponsor = await findSponsorById(req.params.id);
  if (!sponsor) return res.status(404).json({ error: "Sponsor not found" });
  res.json(sponsor);
});

router.get("/slug/:slug", async (req: AuthRequest, res) => {
  const sponsor = await findSponsorBySlug(req.params.slug);
  if (!sponsor) return res.status(404).json({ error: "Sponsor not found" });
  res.json(sponsor);
});

// ─── Create sponsor ───────────────────────────────────────────────────────────
router.post(
  "/",
  requireRole("admin", "organizer"),
  body("name").trim().notEmpty(),
  body("slug").trim().notEmpty(),
  body("company").trim().notEmpty(),
  body("tier").isIn(["platinum", "gold", "silver", "bronze", "community"]),
  body("description").trim().notEmpty(),
  validate,
  async (req: AuthRequest, res) => {
    const sponsor = await createSponsor(req.body);
    res.status(201).json(sponsor);
  }
);

// ─── Update sponsor ───────────────────────────────────────────────────────────
router.patch(
  "/:id",
  requireRole("admin", "organizer"),
  body("name").optional().trim().notEmpty(),
  body("slug").optional().trim().notEmpty(),
  body("company").optional().trim(),
  body("tier").optional().isIn(["platinum", "gold", "silver", "bronze", "community"]),
  body("description").optional().trim(),
  validate,
  async (req: AuthRequest, res) => {
    const updated = await updateSponsor(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: "Sponsor not found" });
    res.json(updated);
  }
);

// ─── Delete sponsor ───────────────────────────────────────────────────────────
router.delete("/:id", requireRole("admin", "organizer"), async (req: AuthRequest, res) => {
  await deleteSponsor(req.params.id);
  res.json({ message: "Sponsor deleted" });
});

export default router;
