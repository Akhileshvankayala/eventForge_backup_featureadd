import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { baseUrl } from "@/lib/api";
import { api } from "@/lib/api";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  ChevronRight,
  MapPin,
  Search,
  Sparkles,
  Ticket,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import ChatbotPanel from "@/components/ChatbotPanel";

// NOTE: AuthContext (frontend/src/contexts/AuthContext.tsx) is being created by a
// sibling agent and does not exist yet. These pages therefore read the session
// directly from localStorage (key 'eventforge_token') plus GET /api/auth/me, so
// they work now and keep working once AuthContext lands.

interface PublicEventVenue {
  name?: string;
  city?: string;
}

interface PublicEvent {
  id: string;
  title: string;
  slug?: string;
  description?: string;
  type?: string;
  startDate?: string;
  endDate?: string;
  coverImage?: string | null;
  tags?: string[];
  venue?: PublicEventVenue | null;
}

interface AuthUser {
  name?: string;
  email?: string;
}

interface TicketType {
  _id?: string;
  id?: string;
  name?: string;
  price?: number;
  currency?: string;
  status?: string;
  remainingQuantity?: number;
}

interface EventSession {
  _id: string;
  title: string;
  description?: string;
  startTime?: string;
  endTime?: string;
  roomName?: string;
  type?: string;
}

type CardColor = "coral" | "mint" | "lilac";
const COLORS: CardColor[] = ["coral", "mint", "lilac"];

function colorFor(index: number): CardColor {
  return COLORS[index % COLORS.length];
}

function locationOf(event: PublicEvent): string {
  if (!event.venue) return "Online experience";
  const parts = [event.venue.name, event.venue.city].filter(Boolean);
  return parts.length > 0
    ? (parts as string[]).join(" · ")
    : "Online experience";
}

function formatDates(start?: string, end?: string): string {
  const s = start ? new Date(start) : null;
  const e = end ? new Date(end) : null;
  const fmtDay = (d: Date) =>
    d.toLocaleString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    });
  if (s && !Number.isNaN(s.getTime())) {
    if (e && !Number.isNaN(e.getTime()) && e.getTime() !== s.getTime()) {
      const sameMonth =
        s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear();
      if (sameMonth) {
        const month = s.toLocaleString("en-US", { month: "short" });
        const year = s.getFullYear();
        const sDay = String(s.getDate()).padStart(2, "0");
        const eDay = String(e.getDate()).padStart(2, "0");
        return `${month} ${sDay}–${eDay}, ${year}`;
      }
      return `${fmtDay(s)} – ${fmtDay(e)}`;
    }
    return fmtDay(s);
  }
  return "Dates TBA";
}

function fmtTime(iso?: string): string {
  if (!iso) return "--:--";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "--:--";
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function labelOf(event: PublicEvent): string {
  if (event.tags && event.tags.length > 0) return event.tags[0];
  return event.type ?? "Event";
}

function topicsLine(event: PublicEvent): string {
  if (event.tags && event.tags.length > 0)
    return `${event.tags.length} topic${event.tags.length === 1 ? "" : "s"}`;
  return event.type ?? "Event";
}

function registrationEventId(reg: unknown): string {
  const v = (reg as { eventId?: unknown })?.eventId;
  if (typeof v === "string") return v;
  if (v && typeof v === "object") {
    const o = v as Record<string, unknown>;
    if (typeof o.$oid === "string") return o.$oid;
    if (typeof o._id === "string") return o._id;
  }
  return "";
}

function initialsFor(user: AuthUser | null): string {
  const parts = (user?.name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2)
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  if (user?.email) return user.email.slice(0, 1).toUpperCase();
  return "G";
}

const SESSIONS_FOR_RECOMMENDATIONS = [
  { title: "Opening keynote: The human edge", tag: "Keynote · Main stage" },
  { title: "Building with responsible AI", tag: "Workshop · Atlas room" },
  { title: "Culture as a growth engine", tag: "Panel · Forum room" },
];

function PlusIcon({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.4}
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export default function Attendee() {
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [showCopilot, setShowCopilot] = useState(false);
  const [events, setEvents] = useState<PublicEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [eventsError, setEventsError] = useState<string | null>(null);
  const [registrations, setRegistrations] = useState<unknown[]>([]);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [detailsEvent, setDetailsEvent] = useState<PublicEvent | null>(null);
  const [detailsSessions, setDetailsSessions] = useState<EventSession[]>([]);
  const [detailsTickets, setDetailsTickets] = useState<TicketType[]>([]);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const registeredIds = useMemo(
    () => new Set(registrations.map(registrationEventId).filter(Boolean)),
    [registrations]
  );

  async function openEventDetails(event: PublicEvent) {
    setDetailsEvent(event);
    setDetailsLoading(true);
    try {
      const [sessions, tickets] = await Promise.all([
        api
          .get<EventSession[]>(`/api/sessions?eventId=${event.id}`)
          .catch(() => []),
        api.get<TicketType[]>(`/api/tickets/event/${event.id}`).catch(() => []),
      ]);
      setDetailsSessions(Array.isArray(sessions) ? sessions : []);
      setDetailsTickets(Array.isArray(tickets) ? tickets : []);
    } finally {
      setDetailsLoading(false);
    }
  }

  async function loadEvents() {
    setEventsLoading(true);
    setEventsError(null);
    try {
      const response = await fetch(`${baseUrl}/api/public/events`);
      if (!response.ok)
        throw new Error(`Could not load events (${response.status})`);
      const data = (await response.json()) as PublicEvent[];
      setEvents(Array.isArray(data) ? data : []);
    } catch (err) {
      setEventsError(
        err instanceof Error ? err.message : "Could not load events"
      );
    } finally {
      setEventsLoading(false);
    }
  }

  async function loadRegistrations(token: string) {
    try {
      const response = await fetch(
        `${baseUrl}/api/attendees/my-registrations`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!response.ok) return;
      const data = (await response.json()) as unknown[];
      setRegistrations(Array.isArray(data) ? data : []);
    } catch {
      // Registrations are best-effort; events remain usable.
    }
  }

  async function loadMe(token: string) {
    try {
      const response = await fetch(`${baseUrl}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) return;
      const data = (await response.json()) as AuthUser;
      setAuthUser({ name: data.name, email: data.email });
    } catch {
      // Fall back to any cached user object.
      try {
        const cached = localStorage.getItem("eventforge_user");
        if (cached) {
          const parsed = JSON.parse(cached) as AuthUser;
          setAuthUser({ name: parsed.name, email: parsed.email });
        }
      } catch {
        // No cached user; avatar falls back to guest.
      }
    }
  }

  useEffect(() => {
    const refreshDashboard = () => {
      void loadEvents();
      const token = localStorage.getItem("eventforge_token");
      if (token) {
        void loadMe(token);
        void loadRegistrations(token);
      }
    };

    void refreshDashboard();
    const handleRefresh = () => void refreshDashboard();
    const handleStorage = (event: StorageEvent) => {
      if (event.key === "eventforge:analytics:refresh") handleRefresh();
    };
    window.addEventListener("eventforge:analytics:refresh", handleRefresh);
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("eventforge:analytics:refresh", handleRefresh);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  async function bookEvent(event: PublicEvent) {
    const token = localStorage.getItem("eventforge_token");
    if (!token) {
      toast.error("Sign in to book your ticket", {
        description: "Create an attendee account first.",
      });
      navigate(`/auth?event=${encodeURIComponent(event.title)}`);
      return;
    }
    if (registeredIds.has(event.id)) return;
    setBookingId(event.id);
    try {
      const ttRes = await fetch(`${baseUrl}/api/tickets/event/${event.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!ttRes.ok) throw new Error("Could not load tickets for this event");
      const types = (await ttRes.json()) as TicketType[];
      const list = Array.isArray(types) ? types : [];
      const available = list.find(
        t =>
          (t.status ?? "active") === "active" && (t.remainingQuantity ?? 0) > 0
      );
      const ticketTypeId = available?._id ?? available?.id;
      if (!ticketTypeId) {
        toast.error("No tickets available for this event yet");
        return;
      }
      const nameParts = (authUser?.name ?? "")
        .trim()
        .split(/\s+/)
        .filter(Boolean);
      const firstName = nameParts[0] ?? "Guest";
      const lastName = nameParts.slice(1).join(" ") || firstName;
      const email = authUser?.email ?? "";
      if (!email) {
        toast.error("Sign in to book your ticket", {
          description: "We need your email to reserve a place.",
        });
        navigate(`/auth?event=${encodeURIComponent(event.title)}`);
        return;
      }
      const regRes = await fetch(`${baseUrl}/api/attendees/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          eventId: event.id,
          ticketTypeId,
          firstName,
          lastName,
          email,
        }),
      });
      const data = (await regRes.json().catch(() => ({}))) as {
        error?: string;
        waitlisted?: boolean;
      };
      if (regRes.status === 409) {
        toast.info("You're already registered for this event");
        await loadRegistrations(token);
        return;
      }
      if (!regRes.ok) throw new Error(data?.error ?? "Booking failed");
      if (data?.waitlisted) {
        toast.success("Added to the waitlist", {
          description: `We'll notify you if a spot opens for ${event.title}.`,
        });
      } else {
        toast.success("Ticket booked", {
          description: `You're on the list for ${event.title}.`,
        });
      }
      localStorage.setItem("eventforge:analytics:refresh", String(Date.now()));
      window.dispatchEvent(new CustomEvent("eventforge:analytics:refresh"));
      await loadRegistrations(token);
      await loadEvents();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Booking failed");
    } finally {
      setBookingId(null);
    }
  }

  const filtered = events.filter(e =>
    e.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#f6f4ee] text-ink">
      <header className="border-b border-ink/7 bg-white/35">
        <div className="mx-auto flex max-w-[1180px] items-center justify-between px-5 py-5 sm:px-8">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-3"
          >
            <span className="grid size-9 place-items-center rounded-[12px] bg-ink text-[11px] font-black text-white">
              EF
            </span>
            <span className="font-display text-[17px] font-bold tracking-[-0.05em]">
              eventforge
            </span>
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/")}
              className="hidden items-center gap-2 rounded-[11px] px-3 py-2 text-[11px] font-bold text-ink/55 hover:bg-white sm:flex"
            >
              <ArrowLeft className="size-3.5" />
              All events
            </button>
            <div className="grid size-9 place-items-center rounded-full bg-[#f6c8b5] text-[10px] font-black">
              {initialsFor(authUser)}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1180px] px-5 pb-16 sm:px-8">
        <section className="flex flex-col justify-between gap-6 pb-8 pt-12 md:flex-row md:items-end">
          <div>
            <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-coral">
              <Sparkles className="size-3.5" />
              Attendee space
            </p>
            <h1 className="mt-3 font-display text-[clamp(2.5rem,6vw,4.7rem)] font-bold leading-[0.9] tracking-[-0.08em]">
              Find your next
              <br />
              <span className="text-coral">yes.</span>
            </h1>
            <p className="mt-5 max-w-[450px] text-[13px] leading-6 text-ink/55">
              Browse your event calendar, save your tickets, and make an agenda
              that feels like you.
            </p>
          </div>
          <div className="rounded-[18px] border border-white bg-white/60 p-4 shadow-[0_12px_26px_rgba(47,59,61,0.06)]">
            <div className="flex items-center gap-3">
              <div className="grid size-9 place-items-center rounded-[11px] bg-[#e5eee9]">
                <Ticket className="size-4 text-[#4a8766]" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.13em] text-ink/40">
                  Your ticket wallet
                </p>
                <p className="mt-1 text-[18px] font-black">
                  {registrations.length === 0
                    ? "No tickets yet"
                    : `${registrations.length} saved ticket${registrations.length === 1 ? "" : "s"}`}
                </p>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-[11px] text-ink/50">
              <button
                onClick={() =>
                  document
                    .getElementById("attendee-events")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
                className="flex items-center gap-1.5 rounded-full bg-[#e5eee9] px-3 py-1 font-bold text-ink/70 transition hover:bg-[#d5e6da] hover:text-ink"
              >
                <PlusIcon size={12} />
                Book a ticket
              </button>
              <button className="flex items-center gap-1.5 rounded-full bg-[#f6c8b5]/40 px-3 py-1 font-bold text-[#9f503d] transition hover:bg-[#f6c8b5]/60">
                <CalendarDays size={12} />
                See calendar
              </button>
            </div>
          </div>
        </section>

        {/* AI recommendation widget */}
        <section className="mb-8">
          <div className="flex flex-col gap-3 rounded-[24px] border border-white bg-white/70 p-5 shadow-[0_14px_30px_rgba(47,59,61,0.07)] sm:rounded-[26px] sm:p-6">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles className="size-3.5 text-coral" strokeWidth={2.2} />
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-ink/40">
                    AI-powered picks
                  </p>
                </div>
                <h2 className="mt-2 font-display text-[24px] font-bold tracking-[-0.055em] text-ink">
                  Suggested for you
                </h2>
                <p className="mt-1.5 text-[12px] text-ink/50">
                  Based on your interests and the sessions you&apos;ve
                  bookmarked, here are the ones worth a closer look.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCopilot(true)}
                className="flex items-center gap-2 rounded-[11px] border border-ink/10 bg-white/80 px-3 py-1.5 text-[10px] font-bold text-ink/70 transition hover:bg-white hover:text-ink"
              >
                <Sparkles size={13} className="text-coral" strokeWidth={2.2} />
                Ask AI for more picks
                <ArrowRight size={12} className="text-ink/30" />
              </button>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {events.slice(0, 2).map((event, index) => {
                const color = colorFor(index);
                return (
                  <div
                    key={event.id}
                    className="flex items-start gap-3 rounded-[14px] border border-ink/7 bg-white/50 p-4 transition hover:bg-white hover:border-ink/10"
                  >
                    <div
                      className={`mt-0.5 grid size-10 place-items-center rounded-[11px] text-[13px] font-black ${
                        color === "coral"
                          ? "bg-[#f6c8b5] text-[#9f503d]"
                          : color === "mint"
                            ? "bg-[#dbece1] text-[#39825f]"
                            : "bg-[#e8e0f4] text-[#6b5792]"
                      }`}
                    >
                      <CalendarDays size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-[12px] font-black text-ink">
                          {event.title}
                        </p>
                        <span className="shrink-0 rounded-full bg-ink/6 px-1.5 py-0.5 text-[9px] font-bold text-ink/45">
                          {labelOf(event)}
                        </span>
                      </div>
                      <p className="mt-1 flex items-center gap-1 text-[10px] text-ink/45">
                        <MapPin size={10} />
                        {locationOf(event)}
                        <span className="mx-1 text-ink/20">·</span>
                        {formatDates(event.startDate, event.endDate)}
                      </p>
                      <p className="mt-1.5 text-[11px] text-ink/55">
                        {event.description}
                      </p>
                      <div className="mt-3 flex items-center gap-3">
                        <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-ink/40">
                          {topicsLine(event)}
                        </span>
                        <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-ink/40">
                          {registeredIds.has(event.id)
                            ? "Ticket saved"
                            : "Open registration"}
                        </span>
                      </div>
                    </div>
                    <button
                      aria-label={`View ${event.title}`}
                      onClick={() => void openEventDetails(event)}
                      className="grid size-9 place-items-center rounded-full bg-ink/5 text-ink/45 transition hover:bg-ink hover:text-white"
                    >
                      <ArrowRight size={14} />
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 flex items-center gap-3 rounded-[11px] border border-ink/7 bg-white/50 px-4 py-3 text-[11px] text-ink/55">
              <Users size={14} className="shrink-0 text-ink/30" />
              <span className="flex-1">
                Explore the schedule and ticket options for{" "}
                <span className="font-black text-ink/70">
                  {events[0]?.title ?? "your next event"}
                </span>
                .
              </span>
              <button onClick={() => document.getElementById("attendee-events")?.scrollIntoView({ behavior: "smooth" })} className="shrink-0 rounded-full bg-ink px-3 py-1 text-[9px] font-black text-white transition hover:bg-[#264c59]">
                Browse events
              </button>
            </div>
          </div>
        </section>

        <section id="attendee-events" className="grid gap-5 sm:grid-cols-3">
          {eventsLoading ? (
            [0, 1, 2].map(i => (
              <div
                key={i}
                className="rounded-[22px] border border-white bg-white/70 p-5 shadow-[0_10px_22px_rgba(47,59,61,0.06)] sm:p-6"
              >
                <div className="mb-4 size-14 animate-pulse rounded-[16px] bg-ink/10" />
                <div className="h-3 w-1/3 animate-pulse rounded-[6px] bg-ink/10" />
                <div className="mt-3 h-6 w-3/4 animate-pulse rounded-[8px] bg-ink/10" />
                <div className="mt-3 h-3 w-full animate-pulse rounded-[6px] bg-ink/8" />
                <div className="mt-2 h-3 w-5/6 animate-pulse rounded-[6px] bg-ink/8" />
              </div>
            ))
          ) : eventsError ? (
            <div className="col-span-full rounded-[22px] border border-white bg-white/70 p-10 text-center shadow-[0_10px_22px_rgba(47,59,61,0.06)]">
              <p className="font-display text-[22px] font-bold tracking-[-0.05em]">
                We couldn&apos;t load events.
              </p>
              <p className="mt-2 text-[12px] text-ink/50">{eventsError}</p>
              <button
                onClick={() => void loadEvents()}
                className="mt-5 rounded-[11px] bg-ink px-5 py-2.5 text-[11px] font-black text-white transition hover:bg-[#264c59]"
              >
                Try again
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="col-span-full rounded-[22px] border border-white bg-white/70 p-10 text-center shadow-[0_10px_22px_rgba(47,59,61,0.06)]">
              <p className="font-display text-[22px] font-bold tracking-[-0.05em]">
                No events found.
              </p>
              <p className="mt-2 text-[12px] text-ink/50">
                {events.length === 0
                  ? "Check back soon — new rooms are being prepared."
                  : "Try a different search."}
              </p>
            </div>
          ) : (
            filtered.map((event, index) => {
              const color = colorFor(index);
              const isRegistered = registeredIds.has(event.id);
              const isBooking = bookingId === event.id;
              return (
                <div
                  key={event.id}
                  className="group relative rounded-[22px] border border-white bg-white/70 p-5 shadow-[0_10px_22px_rgba(47,59,61,0.06)] transition hover:-translate-y-1 sm:p-6"
                >
                  <div
                    className={`mb-4 grid size-14 place-items-center rounded-[16px] ${
                      color === "coral"
                        ? "bg-[#f6c8b5]"
                        : color === "mint"
                          ? "bg-[#dbece1]"
                          : "bg-[#e8e0f4]"
                    }`}
                  >
                    <CalendarDays
                      size={26}
                      className={
                        color === "coral"
                          ? "text-[#9f503d]"
                          : color === "mint"
                            ? "text-[#39825f]"
                            : "text-[#6b5792]"
                      }
                    />
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-ink/35">
                    {labelOf(event)}
                  </p>
                  <h3 className="mt-2 font-display text-[24px] font-bold tracking-[-0.05em]">
                    {event.title}
                  </h3>
                  <p className="mt-1.5 flex items-center gap-1 text-[11px] text-ink/45">
                    <MapPin size={11} />
                    {locationOf(event)}
                    <span className="mx-1 text-ink/20">·</span>
                    {formatDates(event.startDate, event.endDate)}
                  </p>
                  <p className="mt-3 text-[12px] text-ink/55">
                    {event.description}
                  </p>
                  <div className="mt-4 flex items-center gap-3 text-[10px] font-bold text-ink/40">
                    <span>{topicsLine(event)}</span>
                    <span className="w-px h-3 bg-ink/8" />
                    <span>
                      {isRegistered ? "Ticket saved" : "Open registration"}
                    </span>
                  </div>
                  <button
                    onClick={() => void bookEvent(event)}
                    disabled={isBooking || isRegistered}
                    className={`mt-4 w-full rounded-[11px] py-2.5 text-[11px] font-black transition ${
                      color === "coral"
                        ? "bg-coral text-ink shadow-[0_9px_18px_rgba(240,123,103,0.22)] hover:bg-[#f58c79]"
                        : color === "mint"
                          ? "bg-[#8dbea2] text-ink hover:bg-[#7bb38f]"
                          : "bg-[#b5a2d8] text-ink hover:bg-[#a68fcb]"
                    } ${isBooking || isRegistered ? "opacity-80" : ""}`}
                  >
                    {isRegistered ? (
                      <span className="inline-flex items-center gap-2">
                        <Check size={12} />
                        Booked
                      </span>
                    ) : isBooking ? (
                      "Booking…"
                    ) : (
                      `Book ${event.title}`
                    )}
                  </button>
                  <button
                    onClick={() => void openEventDetails(event)}
                    className="mt-2 w-full rounded-[11px] border border-ink/8 py-2.5 text-[11px] font-bold text-ink/55 transition hover:bg-white hover:text-ink"
                  >
                    View details
                  </button>
                </div>
              );
            })
          )}
        </section>
      </main>
      {detailsEvent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/25 px-4 py-8 backdrop-blur-sm"
          onClick={() => setDetailsEvent(null)}
        >
          <div
            className="max-h-[88vh] w-full max-w-[680px] overflow-y-auto rounded-[26px] border border-white bg-[#fffdf8] p-6 shadow-[0_26px_70px_rgba(14,40,49,0.24)] sm:p-8"
            onClick={event => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-coral">
                  Event details
                </p>
                <h2 className="mt-2 font-display text-[30px] font-bold leading-none tracking-[-0.06em]">
                  {detailsEvent.title}
                </h2>
                <p className="mt-3 flex items-center gap-2 text-[11px] text-ink/50">
                  <MapPin size={13} /> {locationOf(detailsEvent)} <span>·</span>{" "}
                  {formatDates(detailsEvent.startDate, detailsEvent.endDate)}
                </p>
              </div>
              <button
                aria-label="Close event details"
                onClick={() => setDetailsEvent(null)}
                className="grid size-8 place-items-center rounded-full bg-ink/5 text-ink/45"
              >
                ×
              </button>
            </div>
            <p className="mt-5 text-[13px] leading-6 text-ink/60">
              {detailsEvent.description || "Event details coming soon."}
            </p>
            {detailsLoading ? (
              <div className="py-12 text-center text-[12px] text-ink/45">
                Loading schedule and tickets…
              </div>
            ) : (
              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                <section className="rounded-[18px] bg-[#e5eee9] p-4">
                  <h3 className="font-display text-[18px] font-bold tracking-[-0.04em]">
                    Schedule
                  </h3>
                  <div className="mt-3 space-y-3">
                    {detailsSessions.length ? (
                      detailsSessions.map(session => (
                        <div
                          key={session._id}
                          className="border-b border-ink/8 pb-3 last:border-0"
                        >
                          <p className="text-[11px] font-black">
                            {session.title}
                          </p>
                          <p className="mt-1 text-[10px] text-ink/50">
                            {fmtTime(session.startTime)}
                            {session.endTime
                              ? `–${fmtTime(session.endTime)}`
                              : ""}{" "}
                            · {session.roomName || "Room TBA"}
                          </p>
                          <p className="mt-1 text-[10px] text-ink/50">
                            {session.description || session.type || "Session"}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="text-[11px] text-ink/50">
                        Schedule coming soon.
                      </p>
                    )}
                  </div>
                </section>
                <section className="rounded-[18px] bg-[#f6c8b5]/55 p-4">
                  <h3 className="font-display text-[18px] font-bold tracking-[-0.04em]">
                    Tickets
                  </h3>
                  <div className="mt-3 space-y-3">
                    {detailsTickets.length ? (
                      detailsTickets.map(ticket => (
                        <div
                          key={ticket._id || ticket.id}
                          className="flex items-center justify-between border-b border-ink/8 pb-3 last:border-0"
                        >
                          <div>
                            <p className="text-[11px] font-black">
                              {ticket.name || "Ticket"}
                            </p>
                            <p className="mt-1 text-[10px] text-ink/50">
                              {ticket.remainingQuantity ?? 0} remaining
                            </p>
                          </div>
                          <span className="text-[11px] font-black">
                            {ticket.price ?? 0} {ticket.currency || "USD"}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-[11px] text-ink/50">
                        Tickets coming soon.
                      </p>
                    )}
                  </div>
                </section>
              </div>
            )}
            <button
              onClick={() => {
                setDetailsEvent(null);
                void bookEvent(detailsEvent);
              }}
              disabled={registeredIds.has(detailsEvent.id)}
              className="mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-[12px] bg-coral text-[12px] font-black text-ink disabled:opacity-60"
            >
              {registeredIds.has(detailsEvent.id)
                ? "Ticket saved"
                : "Book a ticket"}{" "}
              <Ticket size={15} />
            </button>
          </div>
        </div>
      )}
      <ChatbotPanel
        attendeeMode
        sessions={SESSIONS_FOR_RECOMMENDATIONS}
        open={showCopilot}
        onOpenChange={setShowCopilot}
      />
    </div>
  );
}
