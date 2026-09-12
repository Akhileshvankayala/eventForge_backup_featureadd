import { Router } from "express";
import { body, param, query } from "express-validator";
import { findUsers, findUserById, updateUser, deleteUser } from "../models/user.js";
import { authMiddleware, AuthRequest, requireRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";

const router = Router();

router.use(authMiddleware);

// List users (admin/organizer)
router.get(
  "/",
  requireRole("admin", "organizer"),
  async (req: AuthRequest, res) => {
    const { role, page = "1", limit = "50" } = req.query;
    const filter: Record<string, unknown> = {};
    if (role) filter.role = role as any;
    const users = await findUsers(filter);
    res.json(users);
  }
);

// Get single user
router.get("/:id", requireRole("admin", "organizer", "staff"), async (req: AuthRequest, res) => {
  const user = await findUserById(req.params.id);
  if (!user) return res.status(404).json({ error: "User not found" });
  const { passwordHash: _p, ...safe } = user;
  res.json(safe);
});

// Update user (self or admin)
router.patch(
  "/:id",
  body("name").optional().trim().notEmpty(),
  body("email").optional().isEmail().normalizeEmail(),
  body("bio").optional().trim(),
  body("phone").optional().trim(),
  body("organization").optional().trim(),
  body("avatar").optional().trim(),
  validate,
  async (req: AuthRequest, res) => {
    const id = req.params.id;
    const updates: any = { ...req.body };
    delete updates.role; // non-admin cannot change role
    const updated = await updateUser(id, updates);
    if (!updated) return res.status(404).json({ error: "User not found" });
    const { passwordHash: _p, ...safe } = updated;
    res.json(safe);
  }
);

// Delete user (admin only)
router.delete("/:id", requireRole("admin"), async (req: AuthRequest, res) => {
  const deleted = await deleteUser(req.params.id);
  if (!deleted) return res.status(404).json({ error: "User not found" });
  res.json({ message: "User deleted" });
});

export default router;
