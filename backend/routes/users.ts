import { Router } from "express";
import { body, param, query } from "express-validator";
import { findUsers, findUserById, findUserByEmail, updateUser, deleteUser, createUser } from "../models/user.js";
import { authMiddleware, AuthRequest, requireRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import bcrypt from "bcryptjs";

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

// Create user with any role (admin only — invitations, staff, admins)
router.post(
  "/",
  requireRole("admin"),
  body("email").isEmail().normalizeEmail(),
  body("password").isLength({ min: 6 }),
  body("name").trim().notEmpty(),
  body("role").isIn(["admin", "organizer", "staff", "speaker", "attendee", "sponsor"]),
  validate,
  async (req: AuthRequest, res) => {
    const { email, password, name, role } = req.body;
    const existing = await findUserByEmail(email);
    if (existing) return res.status(409).json({ error: "Email already registered" });
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await createUser({ email, passwordHash, name, role });
    const { passwordHash: _p, ...safe } = user;
    res.status(201).json(safe);
  }
);

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
    // Non-admins may only edit their own profile.
    if (req.user!.role !== "admin" && req.user!.id !== id) {
      return res.status(403).json({ error: "You can only edit your own profile" });
    }
    const updates: any = { ...req.body };
    delete updates.role; // roles change only via admin re-invite (delete + create)
    delete updates.passwordHash;
    delete updates.password; // use /change-password instead
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
