import { Router } from "express";
import bcrypt from "bcryptjs";
import { body, param, query } from "express-validator";
import { createUser, findUserByEmail, findUserById } from "../models/user.js";
import { generateToken, verifyToken, authMiddleware, AuthRequest, requireRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { ObjectId } from "mongodb";

const router = Router();

// ─── Register ────────────────────────────────────────────────────────────────
router.post(
  "/register",
  body("email").isEmail().normalizeEmail(),
  body("password").isLength({ min: 6 }),
  body("name").trim().notEmpty(),
  body("role").isIn(["admin", "organizer", "staff", "speaker", "attendee", "sponsor"]),
  validate,
  async (req: AuthRequest, res) => {
    const { email, password, name, role, phone, organization, bio, avatar } = req.body;
    const existing = await findUserByEmail(email);
    if (existing) return res.status(409).json({ error: "Email already registered" });

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await createUser({ email, passwordHash, name, role, phone, organization, bio, avatar });
    const token = generateToken({ id: user._id!.toString(), email: user.email, role: user.role, name: user.name });
    res.status(201).json({ user: { id: user._id, email: user.email, name: user.name, role: user.role, avatar: user.avatar }, token });
  }
);

// ─── Login ────────────────────────────────────────────────────────────────────
router.post(
  "/login",
  body("email").isEmail().normalizeEmail(),
  body("password").notEmpty(),
  validate,
  async (req: AuthRequest, res) => {
    const { email, password } = req.body;
    const user = await findUserByEmail(email);
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ error: "Invalid credentials" });

    const token = generateToken({ id: user._id!.toString(), email: user.email, role: user.role, name: user.name });
    res.json({
      user: { id: user._id, email: user.email, name: user.name, role: user.role, avatar: user.avatar, phone: user.phone, organization: user.organization, bio: user.bio },
      token,
    });
  }
);

// ─── Me ───────────────────────────────────────────────────────────────────────
router.get("/me", authMiddleware, async (req: AuthRequest, res) => {
  if (!req.user) return res.sendStatus(401);
  const user = await findUserById(new ObjectId(req.user.id));
  if (!user) return res.sendStatus(404);
  const { passwordHash: _p, ...safe } = user;
  res.json(safe);
});

// ─── Change password ──────────────────────────────────────────────────────────
router.post(
  "/change-password",
  authMiddleware,
  body("currentPassword").notEmpty(),
  body("newPassword").isLength({ min: 6 }),
  validate,
  async (req: AuthRequest, res) => {
    if (!req.user) return res.sendStatus(401);
    const user = await findUserById(new ObjectId(req.user.id));
    if (!user) return res.sendStatus(404);

    const valid = await bcrypt.compare(req.body.currentPassword, user.passwordHash);
    if (!valid) return res.status(401).json({ error: "Current password is incorrect" });

    const newHash = await bcrypt.hash(req.body.newPassword, 12);
    await (await import("../models/user.js")).updateUser(req.user.id, { passwordHash: newHash });
    res.json({ message: "Password updated successfully" });
  }
);

// ─── Refresh token ────────────────────────────────────────────────────────────
router.post("/refresh", authMiddleware, async (req: AuthRequest, res) => {
  if (!req.user) return res.sendStatus(401);
  const user = await findUserById(new ObjectId(req.user.id));
  if (!user) return res.sendStatus(404);
  const token = generateToken({ id: user._id!.toString(), email: user.email, role: user.role, name: user.name });
  res.json({ token });
});

// ─── Logout (client-side token removal; server returns success) ───────────────
router.post("/logout", authMiddleware, (req, res) => {
  res.json({ message: "Logged out" });
});

export default router;
