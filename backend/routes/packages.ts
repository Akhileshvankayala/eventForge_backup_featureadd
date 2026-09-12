import { Router } from "express";
import { body, param, query } from "express-validator";
import { createPackage, findPackageById, findPackageBySlug, findPackages, updatePackage, deletePackage } from "../models/package.js";
import { authMiddleware, AuthRequest, requireRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";

const router = Router();

router.use(authMiddleware);

// ─── List packages ────────────────────────────────────────────────────────────
router.get("/", async (req: AuthRequest, res) => {
  const { eventId } = req.query;
  const packages = await findPackages({}, { eventId: eventId as string });
  res.json(packages);
});

// ─── Get single package ───────────────────────────────────────────────────────
router.get("/:id", async (req: AuthRequest, res) => {
  const pkg = await findPackageById(req.params.id);
  if (!pkg) return res.status(404).json({ error: "Package not found" });
  res.json(pkg);
});

router.get("/slug/:slug", async (req: AuthRequest, res) => {
  const pkg = await findPackageBySlug(req.params.slug);
  if (!pkg) return res.status(404).json({ error: "Package not found" });
  res.json(pkg);
});

// ─── Create package ───────────────────────────────────────────────────────────
router.post(
  "/",
  requireRole("admin", "organizer"),
  body("name").trim().notEmpty(),
  body("slug").trim().notEmpty(),
  body("price").isFloat({ min: 0 }),
  body("currency").notEmpty(),
  body("features").isArray(),
  validate,
  async (req: AuthRequest, res) => {
    const pkg = await createPackage({ ...req.body, status: "active" });
    res.status(201).json(pkg);
  }
);

// ─── Update package ───────────────────────────────────────────────────────────
router.patch(
  "/:id",
  requireRole("admin", "organizer"),
  body("name").optional().trim().notEmpty(),
  body("slug").optional().trim().notEmpty(),
  body("price").optional().isFloat({ min: 0 }),
  body("status").optional().isIn(["draft", "active", "sold-out", "expired"]),
  body("features").optional().isArray(),
  validate,
  async (req: AuthRequest, res) => {
    const updated = await updatePackage(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: "Package not found" });
    res.json(updated);
  }
);

// ─── Delete package ───────────────────────────────────────────────────────────
router.delete("/:id", requireRole("admin", "organizer"), async (req: AuthRequest, res) => {
  await deletePackage(req.params.id);
  res.json({ message: "Package deleted" });
});

export default router;
