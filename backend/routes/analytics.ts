import { Router } from "express";
import { ObjectId } from "mongodb";
import { getCollection } from "../db.js";
import { authMiddleware, AuthRequest } from "../middleware/auth.js";
import { isAdmin, isStaffSide, ownedEventIds, visibleEventIds } from "../middleware/scope.js";

const router = Router();

router.use(authMiddleware);

const COUNTED_STATUSES = ["approved", "completed", "pending"];

function toYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function toHM(d: Date): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function relativeUpdated(d: Date | null): string {
  if (!d) return "No activity yet";
  const ms = Date.now() - d.getTime();
  if (ms < 0) return "Just now";
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return "Just now";
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function dateLabelFor(d: Date | null): string {
  if (!d || Number.isNaN(d.getTime())) return "No sessions scheduled";
  return d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

// GET /api/analytics/overview — scoped realtime dashboard data (auth required)
router.get("/overview", async (req: AuthRequest, res) => {
  if (!req.user) return res.status(401).json({ error: "Authentication required" });

  // ─── Scope ────────────────────────────────────────────────────────────
  let scopedIds: ObjectId[] | null = null; // null = all (admin)
  if (!isAdmin(req)) {
    if (isStaffSide(req)) {
      scopedIds = await ownedEventIds(req.user.id);
    } else {
      scopedIds = await visibleEventIds(req);
    }
  }
  if (scopedIds !== null && scopedIds.length === 0) {
    const emptyDaily: { date: string; count: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      emptyDaily.push({ date: toYMD(d), count: 0 });
    }
    return res.json({
      velocity: { totalThisMonth: 0, pctChange: 0, daily: emptyDaily },
      nextEvent: null,
      runOfShow: { dateLabel: "No sessions scheduled", sessions: [] },
      stats: {
        statusLabel: "No events",
        statusDetail: "No events in scope",
        attentionCount: 0,
        attentionDetail: "Nothing needs attention",
        updatedLabel: "No activity yet",
        updatedDetail: "No recent changes",
      },
      totals: { events: 0, attendees: 0, sessions: 0 },
    });
  }

  const eventFilter: Record<string, unknown> =
    scopedIds === null ? {} : { _id: { $in: scopedIds } };
  const inScope: Record<string, unknown> =
    scopedIds === null ? {} : { eventId: { $in: scopedIds } };

  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  // ─── Events ───────────────────────────────────────────────────────────
  const events: any[] = await getCollection("events")
    .find(eventFilter)
    .sort({ startDate: 1 })
    .toArray();

  // ─── Attendees (counted registrations) ────────────────────────────────
  const countedQuery: Record<string, unknown> = {
    ...inScope,
    registrationStatus: { $in: COUNTED_STATUSES },
  };
  const counted: any[] = await getCollection("attendees")
    .find(countedQuery)
    .project({ createdAt: 1, updatedAt: 1, registrationStatus: 1, eventId: 1 })
    .toArray();

  // ─── Velocity ─────────────────────────────────────────────────────────
  const msDay = 86400000;
  const curStart = new Date(now.getTime() - 30 * msDay);
  const prevStart = new Date(now.getTime() - 60 * msDay);
  let totalThisMonth = 0;
  let prevCount = 0;
  for (const a of counted) {
    const c = a.createdAt ? new Date(a.createdAt) : null;
    if (!c || Number.isNaN(c.getTime())) continue;
    if (c >= curStart) totalThisMonth++;
    else if (c >= prevStart) prevCount++;
  }
  const pctChange =
    prevCount === 0 ? (totalThisMonth > 0 ? 100 : 0) : ((totalThisMonth - prevCount) / prevCount) * 100;

  const daily: { date: string; count: number }[] = [];
  const byDay = new Map<string, number>();
  for (const a of counted) {
    const c = a.createdAt ? new Date(a.createdAt) : null;
    if (!c || Number.isNaN(c.getTime())) continue;
    byDay.set(toYMD(c), (byDay.get(toYMD(c)) ?? 0) + 1);
  }
  for (let i = 13; i >= 0; i--) {
    const d = new Date(todayStart);
    d.setDate(d.getDate() - i);
    const key = toYMD(d);
    daily.push({ date: key, count: byDay.get(key) ?? 0 });
  }

  // ─── Next event ───────────────────────────────────────────────────────
  const upcoming = events
    .filter((e) => e.startDate && !Number.isNaN(new Date(e.startDate).getTime()))
    .filter((e) => new Date(e.startDate) >= todayStart)
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
  const pool = upcoming.length > 0 ? upcoming : [...events].sort(
    (a, b) => new Date(a.startDate ?? 0).getTime() - new Date(b.startDate ?? 0).getTime(),
  ).filter((e) => e.endDate && new Date(e.endDate) >= todayStart);
  const next = pool.length > 0 ? pool[0] : null;

  let venueName: string | null = null;
  if (next?.venueId) {
    try {
      const venue: any = await getCollection("venues").findOne({ _id: new ObjectId(next.venueId) });
      venueName = venue?.name ?? null;
    } catch {
      venueName = null;
    }
  }

  let nextEvent: {
    id: string; title: string; startDate: string; endDate: string;
    venueName: string; city: string; daysUntil: number; registered: number; capacity: number;
  } | null = null;
  if (next) {
    const start = new Date(next.startDate);
    const end = next.endDate ? new Date(next.endDate) : start;
    const daysUntil = Math.max(0, Math.ceil((start.getTime() - now.getTime()) / msDay));
    const registered = counted.filter((a) => a.eventId?.toString() === next._id?.toString()).length;
    nextEvent = {
      id: next._id.toString(),
      title: next.title,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      venueName: venueName ?? next.location ?? "Venue to be announced",
      city: next.city ?? "",
      daysUntil,
      registered,
      capacity: typeof next.capacity === "number" ? next.capacity : 0,
    };
  }

  // ─── Sessions + run of show ───────────────────────────────────────────
  const sessions: any[] = await getCollection("sessions")
    .find(inScope)
    .sort({ startTime: 1 })
    .toArray();

  let runSessions: any[] = [];
  let runDate: Date | null = null;
  if (next) {
    const firstDay = new Date(next.startDate);
    runDate = firstDay;
    runSessions = sessions.filter((s) => {
      if (s.eventId?.toString() !== next._id?.toString()) return false;
      if (!s.startTime) return false;
      const st = new Date(s.startTime);
      return !Number.isNaN(st.getTime()) && sameDay(st, firstDay);
    });
  }
  if (runSessions.length === 0) {
    const upcomingSessions = sessions
      .filter((s) => s.startTime && new Date(s.startTime) >= now && !Number.isNaN(new Date(s.startTime).getTime()))
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
      .slice(0, 5);
    runSessions = upcomingSessions;
    runDate = upcomingSessions.length > 0 ? new Date(upcomingSessions[0].startTime) : null;
  } else {
    runSessions = runSessions.slice(0, 5);
  }
  const runOfShow = {
    dateLabel: dateLabelFor(runDate),
    sessions: runSessions.map((s) => {
      const st = s.startTime ? new Date(s.startTime) : null;
      return {
        time: st && !Number.isNaN(st.getTime()) ? toHM(st) : "--:--",
        title: s.title,
        room: s.roomName ?? "Room TBA",
        type: s.type ?? s.status ?? "Session",
      };
    }),
  };

  // ─── Attention ────────────────────────────────────────────────────────
  const pendingApprovals = await getCollection("attendees").countDocuments({
    ...inScope,
    registrationStatus: "pending",
  });
  const waitlisted = await getCollection("attendees").countDocuments({
    ...inScope,
    registrationStatus: "waitlisted",
  });
  const missingSpeakers = await getCollection("sessions").countDocuments({
    ...inScope,
    $or: [{ speakerIds: { $exists: false } }, { speakerIds: { $size: 0 } }],
  });
  const attentionCount = pendingApprovals + waitlisted + missingSpeakers;
  const drivers = [
    { count: pendingApprovals, label: `${pendingApprovals} pending approval${pendingApprovals === 1 ? "" : "s"}` },
    { count: missingSpeakers, label: `${missingSpeakers} session${missingSpeakers === 1 ? "" : "s"} missing speakers` },
    { count: waitlisted, label: `${waitlisted} waitlisted` },
  ].sort((a, b) => b.count - a.count);
  const attentionDetail =
    attentionCount === 0 ? "Nothing needs attention" : drivers[0].label;

  // ─── Status ───────────────────────────────────────────────────────────
  const byStatus = new Map<string, number>();
  for (const e of events) byStatus.set(e.status ?? "draft", (byStatus.get(e.status ?? "draft") ?? 0) + 1);
  const published = byStatus.get("published") ?? 0;
  const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
  const statusLabel =
    next ? `${cap(next.status ?? "draft")} · ${next.title}` : events.length === 0 ? "No events" : `${events.length} event${events.length === 1 ? "" : "s"}`;
  const statusDetail =
    events.length === 0
      ? "No events in scope"
      : `${published} published · ${events.length} total`;

  // ─── Updated ──────────────────────────────────────────────────────────
  const latestIn = async (coll: string): Promise<Date | null> => {
    const doc: any = await getCollection(coll).find(inScopeForColl(coll, scopedIds)).sort({ updatedAt: -1 }).limit(1).next();
    return doc?.updatedAt ? new Date(doc.updatedAt) : null;
  };
  const [eu, su, au] = await Promise.all([latestIn("events"), latestIn("sessions"), latestIn("attendees")]);
  const candidates = [
    { d: eu, label: "Event updated" },
    { d: su, label: "Session updated" },
    { d: au, label: "Attendee updated" },
  ].filter((c) => c.d && !Number.isNaN(c.d!.getTime())) as { d: Date; label: string }[];
  candidates.sort((a, b) => b.d.getTime() - a.d.getTime());
  const mostRecent = candidates[0]?.d ?? null;
  const stats = {
    statusLabel,
    statusDetail,
    attentionCount,
    attentionDetail,
    updatedLabel: relativeUpdated(mostRecent),
    updatedDetail: candidates[0]?.label ?? "No recent changes",
  };

  // ─── Totals ───────────────────────────────────────────────────────────
  const [attendeeTotal, sessionTotal] = await Promise.all([
    getCollection("attendees").countDocuments(inScope),
    getCollection("sessions").countDocuments(inScope),
  ]);

  return res.json({
    velocity: {
      totalThisMonth,
      pctChange: Math.round(pctChange * 10) / 10,
      daily,
    },
    nextEvent,
    runOfShow,
    stats,
    totals: { events: events.length, attendees: attendeeTotal, sessions: sessionTotal },
  });
});

function inScopeForColl(coll: string, scopedIds: ObjectId[] | null): Record<string, unknown> {
  if (scopedIds === null) return {};
  if (coll === "events") return { _id: { $in: scopedIds } };
  return { eventId: { $in: scopedIds } };
}

export default router;
