import { Router } from "express";
import { ObjectId } from "mongodb";
import { body, param, query } from "express-validator";
import { createSponsor, findSponsorById, findSponsorBySlug, findSponsors, updateSponsor, deleteSponsor } from "../models/sponsor.js";
import { authMiddleware, AuthRequest, requireRole } from "../middleware/auth.js";
import { assertOwnEvent, isAdmin, isStaffSide, requireEventAccess, visibleEventIds } from "../middleware/scope.js";
import { validate } from "../middleware/validate.js";

const router = Router();

router.use(authMiddleware);

// ─── List sponsors ────────────────────────────────────────────────────────────
// Organizers see their events' sponsors plus unassigned entries.
router.get("/", async (req: AuthRequest, res) => {
  const { eventId, tier } = req.query;
  if (eventId) {
    if (!(await assertOwnEvent(req, res, eventId as string))) return;
    const sponsors = await findSponsors({}, { eventId: eventId as string, tier: tier as any });
    res.json(sponsors);
    return;
  }
  if (!isAdmin(req) && isStaffSide(req)) {
    const visible = await visibleEventIds(req);
    const sponsors = await findSponsors({
      $or: [{ eventId: { $in: visible } }, { eventId: { $exists: false } }, { eventId: null }],
    }, { tier: tier as any });
    res.json(sponsors);
    return;
  }
  const sponsors = await findSponsors({}, { tier: tier as any });
  res.json(sponsors);
});

// ─── Get single sponsor ───────────────────────────────────────────────────────
router.get("/:id", async (req: AuthRequest, res) => {
  const sponsor = await findSponsorById(req.params.id);
  if (!sponsor) return res.status(404).json({ error: "Sponsor not found" });
  if ((sponsor as any).eventId && !(await assertOwnEvent(req, res, (sponsor as any).eventId))) return;
  res.json(sponsor);
});

router.get("/slug/:slug", async (req: AuthRequest, res) => {
  const sponsor = await findSponsorBySlug(req.params.slug);
  if (!sponsor) return res.status(404).json({ error: "Sponsor not found" });
  if ((sponsor as any).eventId && !(await assertOwnEvent(req, res, (sponsor as any).eventId))) return;
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
  requireEventAccess,
  async (req: AuthRequest, res) => {
    const sponsor = await createSponsor({
      ...req.body,
      eventId: req.body.eventId ? new ObjectId(req.body.eventId) : undefined,
    });
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
    const existing = await findSponsorById(req.params.id);
    if (!existing) return res.status(404).json({ error: "Sponsor not found" });
    if ((existing as any).eventId && !(await assertOwnEvent(req, res, (existing as any).eventId))) return;
    if (req.body.eventId && !(await assertOwnEvent(req, res, req.body.eventId))) return;
    const updated = await updateSponsor(req.params.id, {
      ...req.body,
      eventId: req.body.eventId ? new ObjectId(req.body.eventId) : undefined,
    });
    if (!updated) return res.status(404).json({ error: "Sponsor not found" });
    res.json(updated);
  }
);

// ─── Delete sponsor ───────────────────────────────────────────────────────────
router.delete("/:id", requireRole("admin", "organizer"), async (req: AuthRequest, res) => {
  const existing = await findSponsorById(req.params.id);
  if (!existing) return res.status(404).json({ error: "Sponsor not found" });
  if ((existing as any).eventId && !(await assertOwnEvent(req, res, (existing as any).eventId))) return;
  await deleteSponsor(req.params.id);
  res.json({ message: "Sponsor deleted" });
});

export default router;
