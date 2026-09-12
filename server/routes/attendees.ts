import { Router } from "express";
import { body, param, query } from "express-validator";
import { createAttendee, findAttendeeById, findAttendeeByEmailAndEvent, findAttendeeByQrCode, findAttendeesByEvent, findAttendeesByUser, updateAttendee, updateAttendeeCheckin, deleteAttendee } from "../models/attendee.js";
import { authMiddleware, AuthRequest, requireRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { ObjectId } from "mongodb";
import { decrementTicketQuantity } from "../models/ticketType.js";
import { nanoid } from "nanoid";

const router = Router();

router.use(authMiddleware);

// ─── List attendees for an event ───────────────────────────────────────────────
router.get("/event/:eventId", requireRole("admin", "organizer", "staff"), async (req: AuthRequest, res) => {
  const { status } = req.query;
  const attendees = await findAttendeesByEvent(req.params.eventId, { status: status as any });
  res.json(attendees);
});

// ─── List attendee's own registrations ────────────────────────────────────────
router.get("/my-registrations", async (req: AuthRequest, res) => {
  if (!req.user) return res.sendStatus(401);
  const attendees = await findAttendeesByUser(new ObjectId(req.user.id));
  res.json(attendees);
});

// ─── Get single attendee ───────────────────────────────────────────────────────
router.get("/:id", requireRole("admin", "organizer", "staff"), async (req: AuthRequest, res) => {
  const attendee = await findAttendeeById(req.params.id);
  if (!attendee) return res.status(404).json({ error: "Attendee not found" });
  res.json(attendee);
});

// ─── Register for an event ────────────────────────────────────────────────────
router.post(
  "/register",
  body("eventId").notEmpty(),
  body("ticketTypeId").notEmpty(),
  body("firstName").trim().notEmpty(),
  body("lastName").trim().notEmpty(),
  body("email").isEmail().normalizeEmail(),
  body("couponCode").optional().trim(),
  validate,
  async (req: AuthRequest, res) => {
    const { eventId, ticketTypeId, firstName, lastName, email, phone, organization, jobTitle, dietaryRequirements, accessibilityRequirements, emergencyContactName, emergencyContactPhone, couponCode } = req.body;
    const _eventId = new ObjectId(eventId);
    const _ticketTypeId = new ObjectId(ticketTypeId);

    // Check existing registration
    const existing = await findAttendeeByEmailAndEvent(eventId, email);
    if (existing) {
      if (existing.registrationStatus === "completed" || existing.registrationStatus === "approved") {
        return res.status(409).json({ error: "Already registered for this event" });
      }
    }

    // Check ticket availability
    const ticketType = await (await import("../models/ticketType.js")).findTicketTypeById(_ticketTypeId);
    if (!ticketType) return res.status(404).json({ error: "Ticket type not found" });
    if (ticketType.remainingQuantity <= 0 && ticketType.status !== "sold-out") {
      // Try waitlist
    }
    if (ticketType.remainingQuantity <= 0) {
      // Waitlist
      const waitlist = await (await import("../models/attendee.js")).findAttendeesByEvent(_eventId, { status: "waitlisted" });
      const position = waitlist.length + 1;
      const attendee = await createAttendee({
        eventId: _eventId,
        userId: req.user ? new ObjectId(req.user.id) : undefined,
        firstName,
        lastName,
        email,
        phone,
        organization,
        jobTitle,
        dietaryRequirements: dietaryRequirements || [],
        accessibilityRequirements: accessibilityRequirements || [],
        emergencyContactName,
        emergencyContactPhone,
        registrationStatus: "waitlisted",
        ticketTypeId: _ticketTypeId,
        ticketTypePrice: ticketType.price,
        couponCode,
        waitlistPosition: position,
        checkedIn: false,
        qrCode: nanoid(21),
      });
      return res.status(201).json({ ...attendee, waitlisted: true, message: "Added to waitlist" });
    }

    // Apply coupon discount (mock — real app would check against coupons collection)
    let discountAmount = 0;
    if (couponCode && couponCode.startsWith("EVT")) {
      discountAmount = Math.round(ticketType.price * 0.1 * 100) / 100; // 10% mock discount
    }
    const finalPrice = ticketType.price - discountAmount;

    // Decrement ticket quantity
    await decrementTicketQuantity(_ticketTypeId, 1);

    const attendee = await createAttendee({
      eventId: _eventId,
      userId: req.user ? new ObjectId(req.user.id) : undefined,
      firstName,
      lastName,
      email,
      phone,
      organization,
      jobTitle,
      dietaryRequirements: dietaryRequirements || [],
      accessibilityRequirements: accessibilityRequirements || [],
      emergencyContactName,
      emergencyContactPhone,
      registrationStatus: "pending", // requires approval unless auto-approved
      ticketTypeId: _ticketTypeId,
      ticketTypePrice: ticketType.price,
      couponCode,
      discountAmount,
      finalPrice,
      checkedIn: false,
      qrCode: nanoid(21),
    });

    res.status(201).json(attendee);
  }
);

// ─── Approve / reject registration ────────────────────────────────────────────
router.patch(
  "/:id/approval",
  requireRole("admin", "organizer", "staff"),
  body("registrationStatus").isIn(["approved", "rejected", "pending", "waitlisted"]),
  validate,
  async (req: AuthRequest, res) => {
    const attendee = await findAttendeeById(req.params.id);
    if (!attendee) return res.status(404).json({ error: "Attendee not found" });
    if (req.body.registrationStatus === "approved" && attendee.registrationStatus === "waitlisted") {
      // Move from waitlist — check capacity again
      await decrementTicketQuantity(attendee.ticketTypeId!, 1);
    }
    const updated = await updateAttendee(req.params.id, { registrationStatus: req.body.registrationStatus });
    res.json(updated);
  }
);

// ─── Check-in via QR code ─────────────────────────────────────────────────────
router.post(
  "/checkin",
  body("qrCode").notEmpty(),
  validate,
  async (req: AuthRequest, res) => {
    const attendee = await findAttendeeByQrCode(req.body.qrCode);
    if (!attendee) return res.status(404).json({ error: "Invalid QR code" });
    if (attendee.checkedIn) return res.status(409).json({ error: "Already checked in" });
    if (attendee.registrationStatus !== "approved" && attendee.registrationStatus !== "completed") {
      return res.status(403).json({ error: "Registration not approved" });
    }
    const updated = await updateAttendeeCheckin(req.params.id === "checkin" ? attendee._id! : req.params.id);
    res.json({ checkedIn: true, checkedInAt: updated?.checkedInAt, attendee: updated });
  }
);

// ─── Check-in by ID (admin) ───────────────────────────────────────────────────
router.post(
  "/:id/checkin",
  requireRole("admin", "organizer", "staff"),
  async (req: AuthRequest, res) => {
    const attendee = await findAttendeeById(req.params.id);
    if (!attendee) return res.status(404).json({ error: "Attendee not found" });
    if (attendee.checkedIn) return res.status(409).json({ error: "Already checked in" });
    const updated = await updateAttendeeCheckin(req.params.id);
    res.json(updated);
  }
);

// ─── Update attendee ───────────────────────────────────────────────────────────
router.patch("/:id", requireRole("admin", "organizer", "staff"), async (req: AuthRequest, res) => {
  const updated = await updateAttendee(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: "Attendee not found" });
  res.json(updated);
});

// ─── Cancel registration ──────────────────────────────────────────────────────
router.post("/:id/cancel", requireRole("admin", "organizer", "staff"), async (req: AuthRequest, res) => {
  const attendee = await findAttendeeById(req.params.id);
  if (!attendee) return res.status(404).json({ error: "Attendee not found" });
  if (attendee.registrationStatus === "waitlisted") {
    // Remove from waitlist — no quantity to restore
  } else {
    // Restore ticket quantity
    await (await import("../models/ticketType.js")).decrementTicketQuantity(attendee.ticketTypeId!, -1);
  }
  const updated = await updateAttendee(req.params.id, { registrationStatus: "cancelled" });
  res.json(updated);
});

// ─── Delete attendee ───────────────────────────────────────────────────────────
router.delete("/:id", requireRole("admin"), async (req: AuthRequest, res) => {
  await deleteAttendee(req.params.id);
  res.json({ message: "Attendee deleted" });
});

export default router;
