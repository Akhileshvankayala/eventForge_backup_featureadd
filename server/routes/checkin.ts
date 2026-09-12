import { Router } from "express";
import { body, param } from "express-validator";
import { findAttendeeByQrCode, updateAttendeeCheckin } from "../models/attendee.js";
import { authMiddleware, AuthRequest } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";

const router = Router();

// ─── Check-in via QR code (public endpoint, no auth required) ─────────────────
// We use optionalAuth so any client can scan; admin-only check-in by ID stays on attendees route.
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
    const updated = await updateAttendeeCheckin(attendee._id!);
    res.json({
      checkedIn: true,
      checkedInAt: updated?.checkedInAt,
      attendee: {
        id: updated?._id,
        firstName: updated?.firstName,
        lastName: updated?.lastName,
        email: updated?.email,
        eventId: updated?.eventId,
        checkedIn: true,
      },
    });
  }
);

// ─── Validate QR code (without checking in) ───────────────────────────────────
router.get("/validate/:qrCode", async (req: AuthRequest, res) => {
  const attendee = await findAttendeeByQrCode(req.params.qrCode);
  if (!attendee) return res.status(404).json({ valid: false, error: "Invalid QR code" });
  res.json({
    valid: true,
    attendee: {
      id: attendee._id,
      firstName: attendee.firstName,
      lastName: attendee.lastName,
      email: attendee.email,
      checkedIn: attendee.checkedIn,
      registrationStatus: attendee.registrationStatus,
    },
  });
});

export default router;
