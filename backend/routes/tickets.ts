import { Router } from "express";
import { body, param, query } from "express-validator";
import { createTicketType, findTicketTypeById, findTicketTypesByEvent, findTicketTypes, updateTicketType, decrementTicketQuantity, deleteTicketType } from "../models/ticketType.js";
import { authMiddleware, AuthRequest, requireRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";

const router = Router();

router.use(authMiddleware);

// ─── List ticket types ────────────────────────────────────────────────────────
router.get("/", async (req: AuthRequest, res) => {
  const { eventId } = req.query;
  const filter = eventId ? { eventId: new globalThis.ObjectId(eventId as string) } : {};
  const types = await findTicketTypes(filter);
  res.json(types);
});

router.get("/event/:eventId", async (req: AuthRequest, res) => {
  const types = await findTicketTypesByEvent(req.params.eventId);
  res.json(types);
});

// ─── Get single ticket type ───────────────────────────────────────────────────
router.get("/:id", async (req: AuthRequest, res) => {
  const type = await findTicketTypeById(req.params.id);
  if (!type) return res.status(404).json({ error: "Ticket type not found" });
  res.json(type);
});

// ─── Create ticket type ───────────────────────────────────────────────────────
router.post(
  "/",
  requireRole("admin", "organizer"),
  body("eventId").notEmpty(),
  body("name").trim().notEmpty(),
  body("slug").trim().notEmpty(),
  body("price").isFloat({ min: 0 }),
  body("currency").notEmpty(),
  body("totalQuantity").isInt({ min: 0 }),
  body("salesStart").isISO8601(),
  body("salesEnd").isISO8601(),
  validate,
  async (req: AuthRequest, res) => {
    const data = {
      ...req.body,
      remainingQuantity: req.body.totalQuantity,
      soldQuantity: 0,
      status: "active",
    };
    const type = await createTicketType(data);
    res.status(201).json(type);
  }
);

// ─── Update ticket type ───────────────────────────────────────────────────────
router.patch(
  "/:id",
  requireRole("admin", "organizer"),
  body("name").optional().trim().notEmpty(),
  body("slug").optional().trim().notEmpty(),
  body("price").optional().isFloat({ min: 0 }),
  body("status").optional().isIn(["active", "sold-out", "hidden", "expired"]),
  body("totalQuantity").optional().isInt({ min: 0 }),
  body("whatsIncluded").optional().isArray(),
  validate,
  async (req: AuthRequest, res) => {
    const updated = await updateTicketType(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: "Ticket type not found" });
    res.json(updated);
  }
);

// ─── Decrement quantity (called on purchase) ──────────────────────────────────
router.post("/:id/decrement", requireRole("admin", "organizer"), async (req: AuthRequest, res) => {
  const qty = req.body.qty || 1;
  const updated = await decrementTicketQuantity(req.params.id, qty);
  if (!updated) return res.status(404).json({ error: "Ticket type not found or insufficient quantity" });
  res.json(updated);
});

// ─── Delete ticket type ───────────────────────────────────────────────────────
router.delete("/:id", requireRole("admin", "organizer"), async (req: AuthRequest, res) => {
  await deleteTicketType(req.params.id);
  res.json({ message: "Ticket type deleted" });
});

export default router;
