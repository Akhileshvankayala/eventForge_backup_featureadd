import { Router } from "express";
import { body, param, query } from "express-validator";
import { createSession, findSessionById, findSessionBySlug, findSessionsByEvent, findSessions, updateSession, deleteSession, checkSessionConflict } from "../models/session.js";
import { authMiddleware, AuthRequest, requireRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { ObjectId } from "mongodb";

const router = Router();

router.use(authMiddleware);

// ─── List sessions ────────────────────────────────────────────────────────────
router.get("/", async (req: AuthRequest, res) => {
  const { eventId, speakerId } = req.query;
  const sessions = await findSessions({}, { eventId: eventId as string, speakerId: speakerId as string });
  res.json(sessions);
});

// ─── Get single session ───────────────────────────────────────────────────────
router.get("/:id", async (req: AuthRequest, res) => {
  const session = await findSessionById(req.params.id);
  if (!session) return res.status(404).json({ error: "Session not found" });
  res.json(session);
});

router.get("/event/:eventId", async (req: AuthRequest, res) => {
  const sessions = await findSessionsByEvent(req.params.eventId);
  res.json(sessions);
});

// ─── Create session ───────────────────────────────────────────────────────────
router.post(
  "/",
  requireRole("admin", "organizer", "staff"),
  body("eventId").notEmpty(),
  body("title").trim().notEmpty(),
  body("slug").trim().notEmpty(),
  body("description").trim().notEmpty(),
  body("type").notEmpty(),
  body("startTime").isISO8601(),
  body("endTime").isISO8601(),
  body("duration").isInt({ min: 1 }),
  body("timezone").notEmpty(),
  body("capacity").isInt({ min: 0 }),
  validate,
  async (req: AuthRequest, res) => {
    // Check for conflicts
    const conflicts = await checkSessionConflict(req.body.eventId, new Date(req.body.startTime), new Date(req.body.endTime));
    if (conflicts.length > 0) {
      return res.status(409).json({
        error: "Time slot conflicts with existing sessions",
        conflicts: conflicts.map((c) => ({ id: c._id, title: c.title, startTime: c.startTime, endTime: c.endTime })),
      });
    }

    const session = await createSession(req.body);
    res.status(201).json(session);
  }
);

// ─── Update session ───────────────────────────────────────────────────────────
router.patch(
  "/:id",
  requireRole("admin", "organizer", "staff"),
  body("title").optional().trim().notEmpty(),
  body("slug").optional().trim().notEmpty(),
  body("description").optional().trim(),
  body("type").optional().notEmpty(),
  body("status").optional().isIn(["draft", "scheduled", "in-progress", "completed", "cancelled"]),
  body("startTime").optional().isISO8601(),
  body("endTime").optional().isISO8601(),
  body("duration").optional().isInt({ min: 1 }),
  body("capacity").optional().isInt({ min: 0 }),
  validate,
  async (req: AuthRequest, res) => {
    const session = await findSessionById(req.params.id);
    if (!session) return res.status(404).json({ error: "Session not found" });

    // Re-check conflicts if time changed
    if (req.body.startTime || req.body.endTime) {
      const startTime = req.body.startTime ? new Date(req.body.startTime) : session.startTime;
      const endTime = req.body.endTime ? new Date(req.body.endTime) : session.endTime;
      const conflicts = await checkSessionConflict(session.eventId, startTime, endTime, req.params.id);
      if (conflicts.length > 0) {
        return res.status(409).json({
          error: "Time slot conflicts with existing sessions",
          conflicts: conflicts.map((c) => ({ id: c._id, title: c.title, startTime: c.startTime, endTime: c.endTime })),
        });
      }
    }

    const updated = await updateSession(req.params.id, req.body);
    res.json(updated);
  }
);

// ─── Delete session ───────────────────────────────────────────────────────────
router.delete("/:id", requireRole("admin", "organizer", "staff"), async (req: AuthRequest, res) => {
  await deleteSession(req.params.id);
  res.json({ message: "Session deleted" });
});

// ─── Check conflict (standalone) ──────────────────────────────────────────────
router.post("/check-conflict", requireRole("admin", "organizer", "staff"), async (req: AuthRequest, res) => {
  const { eventId, startTime, endTime, excludeSessionId } = req.body;
  if (!eventId || !startTime || !endTime) return res.status(400).json({ error: "eventId, startTime, endTime required" });
  const conflicts = await checkSessionConflict(eventId, new Date(startTime), new Date(endTime), excludeSessionId);
  res.json({ conflicts });
});

export default router;
