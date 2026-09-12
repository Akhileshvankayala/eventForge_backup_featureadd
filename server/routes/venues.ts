import { Router } from "express";
import { body, param, query } from "express-validator";
import { createVenue, findVenueById, findVenueBySlug, findVenues, updateVenue, deleteVenue } from "../models/venue.js";
import { authMiddleware, AuthRequest, requireRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";

const router = Router();

router.use(authMiddleware);

// ─── List venues ──────────────────────────────────────────────────────────────
router.get("/", async (req: AuthRequest, res) => {
  const venues = await findVenues();
  res.json(venues);
});

// ─── Get single venue ─────────────────────────────────────────────────────────
router.get("/:id", async (req: AuthRequest, res) => {
  const venue = await findVenueById(req.params.id);
  if (!venue) return res.status(404).json({ error: "Venue not found" });
  res.json(venue);
});

router.get("/slug/:slug", async (req: AuthRequest, res) => {
  const venue = await findVenueBySlug(req.params.slug);
  if (!venue) return res.status(404).json({ error: "Venue not found" });
  res.json(venue);
});

// ─── Create venue ─────────────────────────────────────────────────────────────
router.post(
  "/",
  requireRole("admin", "organizer"),
  body("name").trim().notEmpty(),
  body("slug").trim().notEmpty(),
  body("address").trim().notEmpty(),
  body("city").trim().notEmpty(),
  body("country").trim().notEmpty(),
  body("capacity").isInt({ min: 0 }),
  validate,
  async (req: AuthRequest, res) => {
    const venue = await createVenue(req.body);
    res.status(201).json(venue);
  }
);

// ─── Update venue ─────────────────────────────────────────────────────────────
router.patch(
  "/:id",
  requireRole("admin", "organizer"),
  body("name").optional().trim().notEmpty(),
  body("slug").optional().trim().notEmpty(),
  body("address").optional().trim(),
  body("city").optional().trim(),
  body("capacity").optional().isInt({ min: 0 }),
  validate,
  async (req: AuthRequest, res) => {
    const updated = await updateVenue(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: "Venue not found" });
    res.json(updated);
  }
);

// ─── Delete venue ─────────────────────────────────────────────────────────────
router.delete("/:id", requireRole("admin", "organizer"), async (req: AuthRequest, res) => {
  await deleteVenue(req.params.id);
  res.json({ message: "Venue deleted" });
});

export default router;
