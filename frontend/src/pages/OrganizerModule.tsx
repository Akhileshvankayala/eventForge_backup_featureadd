import { useEffect, useMemo, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { ArrowLeft, ArrowUpRight, CalendarDays, Check, ChevronRight, Download, Filter, MapPin, Plus, Search, Ticket, Users, WalletCards, X } from "lucide-react";
import { api } from "@/lib/api";

type Row = { id?: string; name: string; detail: string; status: string; tone: string; ticket?: string; booked?: string; rawStatus?: string };

type ApiEvent = { _id: string; title: string; status?: string; startDate?: string; location?: string; city?: string; capacity?: number };
type ApiAttendee = { _id: string; firstName: string; lastName: string; email: string; organization?: string; registrationStatus: string; ticketTypeId?: string; createdAt?: string };
type ApiTicketType = { _id: string; name: string; price?: number; currency?: string; totalQuantity?: number; soldQuantity?: number; status?: string };
type ApiSession = { _id: string; title: string; startTime?: string; roomName?: string; type?: string; status?: string };
type ApiVenue = { _id: string; name: string; city?: string; country?: string; capacity?: number; isVirtual?: boolean };
type ApiSpeaker = { _id: string; name: string; title?: string; company?: string; topics?: string[] };
type ApiSponsor = { _id: string; name: string; company?: string; tier?: string };

type OverviewStats = { statusLabel?: string; statusDetail?: string; attentionCount?: number; attentionDetail?: string; updatedLabel?: string; updatedDetail?: string };

type EventRef = { id: string; title: string };

const TONES = ["coral", "mint", "lilac"] as const;
const toneFor = (index: number): string => TONES[index % TONES.length];

function capitalize(value?: string, fallback = "—"): string {
  if (!value) return fallback;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function fmtDateLabel(iso?: string): string {
  if (!iso) return "Date TBA";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Date TBA";
  return `${date.toLocaleString("en-US", { month: "short" })} ${String(date.getDate()).padStart(2, "0")}`;
}

function fmtTime(iso?: string): string {
  if (!iso) return "--:--";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "--:--";
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function fmtDay(iso?: string): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

const modules: Record<string, { title: string; eyebrow: string; description: string; icon: typeof CalendarDays }> = {
  events: { title: "Events", eyebrow: "Organization", description: "Plan every experience from first idea to final applause.", icon: CalendarDays },
  attendees: { title: "Attendees", eyebrow: "People", description: "See who is joining, what they care about, and where they are in the journey.", icon: Users },
  tickets: { title: "Tickets", eyebrow: "Commerce", description: "Manage capacity, ticket types, approvals, and the waitlist in one view.", icon: Ticket },
  sessions: { title: "Sessions", eyebrow: "Programming", description: "Shape the run of show and keep every room conflict-free.", icon: CalendarDays },
  venues: { title: "Venues", eyebrow: "Operations", description: "Keep rooms, capacities, floor plans, and on-site notes beautifully organized.", icon: MapPin },
  speakers: { title: "Speakers", eyebrow: "People", description: "Coordinate speaker profiles, availability, materials, and stage moments.", icon: Users },
  sponsors: { title: "Sponsors", eyebrow: "Partnerships", description: "Make every partnership visible, valuable, and easy to deliver.", icon: WalletCards },
};

function mapEvents(items: ApiEvent[]): Row[] {
  return items.map((event, index) => ({
    name: event.title,
    detail: `${fmtDateLabel(event.startDate)} · ${event.location || event.city || "Venue TBA"}`,
    status: capitalize(event.status, "Planning"),
    tone: toneFor(index),
  }));
}

function mapAttendees(items: ApiAttendee[], ticketNames: Record<string, string>): Row[] {
  return items.map((attendee, index) => ({
    id: attendee._id,
    rawStatus: attendee.registrationStatus,
    name: `${attendee.firstName} ${attendee.lastName}`.trim() || attendee.email,
    detail: `${attendee.email}${attendee.organization ? ` · ${attendee.organization}` : ""}`,
    status: capitalize(attendee.registrationStatus, "Pending"),
    tone: toneFor(index),
    ticket: (attendee.ticketTypeId && ticketNames[attendee.ticketTypeId]) || "No ticket",
    booked: fmtDay(attendee.createdAt) || "—",
  }));
}

function mapTickets(items: ApiTicketType[]): Row[] {
  return items.map((ticket, index) => ({
    name: ticket.name,
    detail: `${ticket.price ?? 0} ${ticket.currency || "USD"} · ${ticket.totalQuantity ?? 0} capacity`,
    status: `${ticket.soldQuantity ?? 0} sold`,
    tone: toneFor(index),
  }));
}

function mapSessions(items: ApiSession[]): Row[] {
  return items.map((session, index) => ({
    name: session.title,
    detail: `${fmtTime(session.startTime)} · ${session.roomName || "Room TBA"} · ${session.type || "Session"}`,
    status: capitalize(session.status, "Draft"),
    tone: toneFor(index),
  }));
}

function mapVenues(items: ApiVenue[]): Row[] {
  return items.map((venue, index) => ({
    name: venue.name,
    detail: `${venue.city || venue.country || "Location TBA"} · ${venue.capacity ?? 0} capacity`,
    status: venue.isVirtual ? "Virtual" : "Ready",
    tone: toneFor(index),
  }));
}

function mapSpeakers(items: ApiSpeaker[]): Row[] {
  return items.map((speaker, index) => ({
    name: speaker.name,
    detail: `${speaker.title || "Speaker"}${speaker.company ? ` · ${speaker.company}` : ""}${speaker.topics?.length ? ` · ${speaker.topics.slice(0, 2).join(", ")}` : ""}`,
    status: "Profile complete",
    tone: toneFor(index),
  }));
}

function mapSponsors(items: ApiSponsor[]): Row[] {
  return items.map((sponsor, index) => ({
    name: sponsor.company || sponsor.name,
    detail: `${capitalize(sponsor.tier, "Partner")} partner`,
    status: capitalize(sponsor.tier, "Partner"),
    tone: toneFor(index),
  }));
}

function Select({ value, onChange, options }: { value: string; onChange: (value: string) => void; options: string[] }) {
  return <select value={value} onChange={(event) => onChange(event.target.value)} className="h-10 w-full rounded-[11px] border border-ink/8 bg-white/70 px-3 text-[11px] font-bold text-ink outline-none focus:border-coral/60">{options.map((option) => <option key={option} value={option}>{option}</option>)}</select>;
}

export default function OrganizerModule() {
  const [, navigate] = useLocation();
  const [, params] = useRoute("/organizer/:module");
  const key = params?.module || "events";
  const module = modules[key] || modules.events;
  const Icon = module.icon;
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [eventsList, setEventsList] = useState<EventRef[]>([]);
  const [rawEvents, setRawEvents] = useState<ApiEvent[]>([]);
  const [eventFilter, setEventFilter] = useState("");
  const [attendeeEvent, setAttendeeEvent] = useState("");
  const [attendeeSearch, setAttendeeSearch] = useState("");
  const [attendeeTicket, setAttendeeTicket] = useState("All tickets");
  const [attendeeSort, setAttendeeSort] = useState<"earliest" | "latest">("earliest");
  const [ticketNames, setTicketNames] = useState<string[]>(["General admission"]);
  const [allRows, setAllRows] = useState<Row[]>([]);
  const [ticketSummary, setTicketSummary] = useState({ capacity: 0, sold: 0, waitlist: 0, pending: 0, types: 0 });
  const [overviewStats, setOverviewStats] = useState<OverviewStats | null>(null);
  const [newEventName, setNewEventName] = useState("");
  const [newEventDate, setNewEventDate] = useState("");
  const [newEventVenue, setNewEventVenue] = useState("");
  const [newAttendee, setNewAttendee] = useState("");
  const [newAttendeeEmail, setNewAttendeeEmail] = useState("");
  const [newAttendeeEvent, setNewAttendeeEvent] = useState("");
  const [newAttendeeTicket, setNewAttendeeTicket] = useState("General admission");
  const [refreshTick, setRefreshTick] = useState(0);

  const eventNames = useMemo(() => eventsList.map((event) => event.title), [eventsList]);

  useEffect(() => {
    let cancelled = false;
    api
      .get<{ stats?: OverviewStats }>("/api/analytics/overview")
      .then((data) => {
        if (cancelled) return;
        if (data && typeof data === "object" && data.stats && typeof data.stats === "object") {
          setOverviewStats(data.stats);
        }
      })
      .catch(() => {
        if (cancelled) return;
      });
    return () => {
      cancelled = true;
    };
  }, []);
  const eventIdFor = (title: string): string => eventsList.find((event) => event.title === title)?.id || "";

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    api
      .get<ApiEvent[]>("/api/events")
      .then((items) => {
        if (cancelled) return;
        const list = Array.isArray(items) ? items : [];
        setRawEvents(list);
        const refs = list.map((event) => ({ id: event._id, title: event.title }));
        setEventsList(refs);
        setEventFilter((current) => current || refs[0]?.title || "");
        setNewAttendeeEvent((current) => current || refs[0]?.title || "");
        if (key === "events") {
          setAllRows(mapEvents(list));
          setLoading(false);
        }
      })
      .catch((fetchError) => {
        if (cancelled) return;
        setError(fetchError instanceof Error ? fetchError.message : "Could not load data.");
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, refreshTick]);

  useEffect(() => {
    if (key === "events") return;
    if (key === "attendees" || key === "tickets") return;
    let cancelled = false;
    setLoading(true);
    setError("");
    const loaders: Record<string, () => Promise<Row[]>> = {
      sessions: () => api.get<ApiSession[]>("/api/sessions").then((items) => mapSessions(Array.isArray(items) ? items : [])),
      venues: () => api.get<ApiVenue[]>("/api/venues").then((items) => mapVenues(Array.isArray(items) ? items : [])),
      speakers: () => api.get<ApiSpeaker[]>("/api/speakers").then((items) => mapSpeakers(Array.isArray(items) ? items : [])),
      sponsors: () => api.get<ApiSponsor[]>("/api/sponsors").then((items) => mapSponsors(Array.isArray(items) ? items : [])),
    };
    const load = loaders[key];
    if (!load) {
      setLoading(false);
      return;
    }
    load()
      .then((rows) => {
        if (cancelled) return;
        setAllRows(rows);
        setLoading(false);
      })
      .catch((fetchError) => {
        if (cancelled) return;
        setError(fetchError instanceof Error ? fetchError.message : "Could not load data.");
        setAllRows([]);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [key]);

  useEffect(() => {
    if (key !== "attendees") return;
    if (!attendeeEvent) {
      setAllRows([]);
      setLoading(false);
      return;
    }
    const eventId = eventIdFor(attendeeEvent);
    if (!eventId) return;
    let cancelled = false;
    setLoading(true);
    setError("");
    Promise.all([
      api.get<ApiAttendee[]>(`/api/attendees/event/${eventId}`),
      api.get<ApiTicketType[]>(`/api/tickets/event/${eventId}`).catch(() => [] as ApiTicketType[]),
    ])
      .then(([attendees, tickets]) => {
        if (cancelled) return;
        const names: Record<string, string> = {};
        tickets.forEach((ticket) => {
          names[ticket._id] = ticket.name;
        });
        setTicketNames(tickets.length ? tickets.map((ticket) => ticket.name) : ["General admission"]);
        setAllRows(mapAttendees(Array.isArray(attendees) ? attendees : [], names));
        setLoading(false);
      })
      .catch((fetchError) => {
        if (cancelled) return;
        setError(fetchError instanceof Error ? fetchError.message : "Could not load attendees.");
        setAllRows([]);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, attendeeEvent, eventsList, refreshTick]);

  useEffect(() => {
    if (key !== "tickets") return;
    if (!eventFilter) return;
    const eventId = eventIdFor(eventFilter);
    if (!eventId) return;
    let cancelled = false;
    setLoading(true);
    setError("");
    Promise.all([
      api.get<ApiTicketType[]>(`/api/tickets/event/${eventId}`).catch(() => [] as ApiTicketType[]),
      api.get<ApiAttendee[]>(`/api/attendees/event/${eventId}`).catch(() => [] as ApiAttendee[]),
    ])
      .then(([tickets, attendees]) => {
        if (cancelled) return;
        const list = Array.isArray(tickets) ? tickets : [];
        const people = Array.isArray(attendees) ? attendees : [];
        setAllRows(mapTickets(list));
        setTicketSummary({
          capacity: list.reduce((sum, ticket) => sum + (ticket.totalQuantity ?? 0), 0),
          sold: list.reduce((sum, ticket) => sum + (ticket.soldQuantity ?? 0), 0),
          waitlist: people.filter((person) => person.registrationStatus === "waitlisted").length,
          pending: people.filter((person) => person.registrationStatus === "pending").length,
          types: list.length,
        });
        setLoading(false);
      })
      .catch((fetchError) => {
        if (cancelled) return;
        setError(fetchError instanceof Error ? fetchError.message : "Could not load tickets.");
        setAllRows([]);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, eventFilter, eventsList]);

  const attendeeRows = useMemo(
    () =>
      allRows
        .filter((row) => row.name.toLowerCase().includes(attendeeSearch.toLowerCase()) && (attendeeTicket === "All tickets" || row.ticket === attendeeTicket))
        .sort((a, b) => (attendeeSort === "earliest" ? (a.booked || "").localeCompare(b.booked || "") : (b.booked || "").localeCompare(a.booked || ""))),
    [allRows, attendeeSearch, attendeeTicket, attendeeSort],
  );
  const rows = key === "attendees" ? attendeeRows : allRows.filter((row) => row.name.toLowerCase().includes(search.toLowerCase()));

  const saveEvent = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const start = newEventDate ? new Date(`${newEventDate}T09:00:00`) : new Date();
      const end = new Date(start.getTime() + 8 * 60 * 60 * 1000);
      const slug = `${newEventName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "event"}-${Date.now().toString(36)}`;
      await api.post("/api/events", {
        title: newEventName.trim() || "Untitled event",
        slug,
        description: newEventVenue.trim() ? `Held at ${newEventVenue.trim()}.` : "Event details coming soon.",
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        timezone: "UTC",
        capacity: 100,
        price: 0,
        currency: "USD",
        visibility: "private",
        status: "draft",
      });
      setNotice(`${newEventName || "New event"} saved as a draft.`);
      setShowCreate(false);
      setNewEventName("");
      setNewEventDate("");
      setNewEventVenue("");
      setRefreshTick((n) => n + 1);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not create event.");
    }
  };
  const saveAttendee = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const eventId = eventIdFor(newAttendeeEvent);
      if (!eventId) throw new Error("Pick an event first.");
      const types = await api.get<ApiTicketType[]>(`/api/tickets/event/${eventId}`).catch(() => [] as ApiTicketType[]);
      const match = (Array.isArray(types) ? types : []).find((t) => t.name === newAttendeeTicket) || (Array.isArray(types) ? types : [])[0];
      if (!match) throw new Error("This event has no ticket types yet — create one on the Tickets tab first.");
      const parts = newAttendee.trim().split(/\s+/);
      await api.post("/api/attendees/register", {
        eventId,
        ticketTypeId: match._id,
        firstName: parts[0] || "Guest",
        lastName: parts.slice(1).join(" ") || "Attendee",
        email: newAttendeeEmail.trim(),
      });
      setNotice(`${newAttendee || "New attendee"} assigned to ${newAttendeeEvent} with a ${newAttendeeTicket}.`);
      setShowCreate(false);
      setNewAttendee("");
      setNewAttendeeEmail("");
      setRefreshTick((n) => n + 1);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not add attendee.");
    }
  };

  const moderateAttendee = async (id: string, next: "approved" | "rejected") => {
    try {
      await api.patch(`/api/attendees/${id}/approval`, { registrationStatus: next });
      setAllRows((prev) => prev.map((row) => (row.id === id ? { ...row, rawStatus: next, status: next === "approved" ? "Approved" : "Rejected" } : row)));
      setNotice(next === "approved" ? "Registration approved." : "Registration rejected.");
    } catch (moderateError) {
      setError(moderateError instanceof Error ? moderateError.message : "Could not update registration.");
    }
  };

  return <div className="min-h-screen bg-[#f6f4ee] text-ink"><header className="border-b border-ink/7 bg-white/35"><div className="mx-auto flex max-w-[1180px] items-center justify-between px-5 py-5 sm:px-8"><button onClick={() => navigate("/organizer")} className="flex items-center gap-3"><span className="eventforge-mark grid size-9 place-items-center rounded-[12px] bg-ink text-[11px] font-black text-white">EF</span><span className="font-display text-[17px] font-bold tracking-[-0.05em]">eventforge</span></button><button onClick={() => navigate("/organizer")} className="flex items-center gap-2 rounded-[11px] px-3 py-2 text-[11px] font-bold text-ink/55 hover:bg-white"><ArrowLeft className="size-3.5" /> Overview</button></div></header><main className="mx-auto max-w-[1180px] px-5 pb-16 sm:px-8"><section className="flex flex-col justify-between gap-6 pb-8 pt-12 md:flex-row md:items-end"><div><p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-coral"><Icon className="size-3.5" /> {module.eyebrow}</p><h1 className="mt-3 font-display text-[clamp(2.5rem,6vw,4.7rem)] font-bold leading-[0.9] tracking-[-0.08em]">{module.title}<span className="text-coral">.</span></h1><p className="mt-4 max-w-[510px] text-[13px] leading-6 text-ink/55">{module.description}</p></div><button onClick={() => setShowCreate(true)} className="flex h-11 items-center justify-center gap-2 rounded-[12px] bg-coral px-4 text-[12px] font-black text-ink shadow-[0_10px_18px_rgba(240,123,103,0.18)] transition hover:-translate-y-0.5"><Plus className="size-4" /> {key === "tickets" ? "Add ticket type" : key === "attendees" ? "Add attendee" : "Add event"}</button></section>{notice && <div className="mb-5 flex items-center gap-2 rounded-[14px] border border-[#b7d8c1] bg-[#e5eee9] px-4 py-3 text-[11px] font-bold text-[#39825f]"><Check className="size-4" />{notice}<button onClick={() => setNotice("")} className="ml-auto"><X className="size-4" /></button></div>}{error && <div className="mb-5 flex items-center gap-2 rounded-[14px] border border-[#f0b4a6] bg-[#fbe9e3] px-4 py-3 text-[11px] font-bold text-[#9f503d]"><X className="size-4" />Could not load data: {error}<button onClick={() => setError("")} className="ml-auto"><X className="size-4" /></button></div>}{loading ? <div className="glass-card rounded-[26px] p-10 text-center text-[12px] text-ink/45 shadow-[0_14px_34px_rgba(47,59,61,0.07)]">Loading {module.title.toLowerCase()}…</div> : key === "tickets" ? <TicketOperations rows={rows} eventFilter={eventFilter} setEventFilter={setEventFilter} eventNames={eventNames} summary={ticketSummary} onAction={(message) => setNotice(message)} /> : key === "attendees" ? <AttendeeOperations rows={rows} attendeeEvent={attendeeEvent} setAttendeeEvent={setAttendeeEvent} attendeeSearch={attendeeSearch} setAttendeeSearch={setAttendeeSearch} attendeeTicket={attendeeTicket} setAttendeeTicket={setAttendeeTicket} attendeeSort={attendeeSort} setAttendeeSort={setAttendeeSort} eventNames={eventNames} ticketTypes={ticketNames} onAdd={() => setShowCreate(true)} onModerate={moderateAttendee} /> : ["sessions", "venues", "speakers", "sponsors"].includes(key) ? <EventScopedOperations kind={key as "sessions" | "venues" | "speakers" | "sponsors"} events={eventsList} onAction={(message) => setNotice(message)} /> : <GenericModule module={module} rows={rows} total={allRows.length} search={search} setSearch={setSearch} onAction={(message) => setNotice(message)} stats={overviewStats} />}{showCreate && <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/25 px-4 py-8 backdrop-blur-sm" onClick={() => setShowCreate(false)}><div className="w-full max-w-[480px] rounded-[24px] border border-white bg-[#fffdf8]/95 p-6 shadow-[0_26px_70px_rgba(14,40,49,0.24)]" onClick={(event) => event.stopPropagation()}>{key === "attendees" ? <form onSubmit={saveAttendee}><ModalHeading title="Add attendee" onClose={() => setShowCreate(false)} /><div className="space-y-3"><label className="block text-[10px] font-black uppercase tracking-[0.12em] text-ink/45">Attendee name<input required value={newAttendee} onChange={(event) => setNewAttendee(event.target.value)} placeholder="Jordan Lee" className="mt-1.5 h-10 w-full rounded-[11px] border border-ink/8 bg-white/70 px-3 text-[12px] font-medium outline-none focus:border-coral/60" /></label><label className="block text-[10px] font-black uppercase tracking-[0.12em] text-ink/45">Email<input required type="email" value={newAttendeeEmail} onChange={(event) => setNewAttendeeEmail(event.target.value)} placeholder="jordan@company.com" className="mt-1.5 h-10 w-full rounded-[11px] border border-ink/8 bg-white/70 px-3 text-[12px] font-medium outline-none focus:border-coral/60" /></label><label className="block text-[10px] font-black uppercase tracking-[0.12em] text-ink/45">Assign to event<span className="mt-1.5 block"><Select value={newAttendeeEvent} onChange={setNewAttendeeEvent} options={eventNames.length ? eventNames : ["No events yet"]} /></span></label><label className="block text-[10px] font-black uppercase tracking-[0.12em] text-ink/45">Ticket type<span className="mt-1.5 block"><Select value={newAttendeeTicket} onChange={setNewAttendeeTicket} options={ticketNames} /></span></label><button className="mt-2 flex h-10 w-full items-center justify-center gap-2 rounded-[11px] bg-coral text-[11px] font-black text-ink">Save attendee <Check className="size-4" /></button></div></form> : <form onSubmit={saveEvent}><ModalHeading title="Create event" onClose={() => setShowCreate(false)} /><div className="space-y-3"><label className="block text-[10px] font-black uppercase tracking-[0.12em] text-ink/45">Event name<input required value={newEventName} onChange={(event) => setNewEventName(event.target.value)} placeholder="Leadership offsite" className="mt-1.5 h-10 w-full rounded-[11px] border border-ink/8 bg-white/70 px-3 text-[12px] font-medium outline-none focus:border-coral/60" /></label><div className="grid gap-3 sm:grid-cols-2"><label className="block text-[10px] font-black uppercase tracking-[0.12em] text-ink/45">Start date<input type="date" required value={newEventDate} onChange={(event) => setNewEventDate(event.target.value)} className="mt-1.5 h-10 w-full rounded-[11px] border border-ink/8 bg-white/70 px-3 text-[11px] font-medium outline-none focus:border-coral/60" /></label><label className="block text-[10px] font-black uppercase tracking-[0.12em] text-ink/45">Venue<input required value={newEventVenue} onChange={(event) => setNewEventVenue(event.target.value)} placeholder="The Glasshouse" className="mt-1.5 h-10 w-full rounded-[11px] border border-ink/8 bg-white/70 px-3 text-[11px] font-medium outline-none focus:border-coral/60" /></label></div><button className="mt-2 flex h-10 w-full items-center justify-center gap-2 rounded-[11px] bg-coral text-[11px] font-black text-ink">Create draft <Check className="size-4" /></button></div></form>}</div></div>}</main></div>;
}

function ModalHeading({ title, onClose }: { title: string; onClose: () => void }) { return <div className="mb-5 flex items-start justify-between"><div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-coral">Organizer action</p><h2 className="mt-1 font-display text-[25px] font-bold tracking-[-0.06em]">{title}</h2></div><button onClick={onClose} type="button" className="grid size-8 place-items-center rounded-full bg-ink/5 text-ink/45"><X className="size-4" /></button></div>; }

function GenericModule({ module, rows, total, search, setSearch, onAction, stats }: { module: (typeof modules)[string]; rows: Row[]; total: number; search: string; setSearch: (value: string) => void; onAction: (message: string) => void; stats?: OverviewStats | null }) { const Icon = module.icon; return <><div className="glass-card rounded-[26px] p-5 shadow-[0_14px_34px_rgba(47,59,61,0.07)] sm:p-7"><div className="flex flex-col justify-between gap-3 border-b border-ink/8 pb-5 sm:flex-row sm:items-center"><div><h2 className="font-display text-[21px] font-bold tracking-[-0.055em]">All {module.title.toLowerCase()}</h2><p className="mt-1 text-[11px] text-ink/45">{total} records in this organization</p></div><div className="flex items-center gap-2"><div className="flex h-9 items-center gap-2 rounded-[11px] border border-ink/8 bg-white/65 px-3 text-[11px] text-ink/45"><Search className="size-3.5" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={`Search ${module.title.toLowerCase()}`} className="w-[145px] bg-transparent outline-none placeholder:text-ink/35" /></div><button onClick={() => onAction("Filters are ready for this organization.")} className="grid size-9 place-items-center rounded-[11px] border border-ink/8 bg-white/65 text-ink/45 hover:text-ink"><Filter className="size-3.5" /></button><button onClick={() => onAction("Organization export prepared.")} className="grid size-9 place-items-center rounded-[11px] border border-ink/8 bg-white/65 text-ink/45 hover:text-ink"><Download className="size-3.5" /></button></div></div><div className="divide-y divide-ink/7">{rows.map((row) => <button key={row.name} onClick={() => onAction(`${row.name} opened.`)} className="group flex w-full items-center gap-3 py-5 text-left transition hover:bg-white/35"><div className={`grid size-11 shrink-0 place-items-center rounded-[14px] ${row.tone === "coral" ? "bg-[#f6c8b5]" : row.tone === "mint" ? "bg-[#dbece1]" : "bg-[#e8e0f4]"}`}><Icon className="size-4 text-ink/60" /></div><span className="min-w-0 flex-1"><span className="block truncate text-[12px] font-black">{row.name}</span><span className="mt-1 block truncate text-[10px] text-ink/45">{row.detail}</span></span><span className="hidden rounded-full bg-ink/6 px-2 py-1 text-[9px] font-black text-ink/50 sm:block">{row.status}</span><ChevronRight className="size-4 text-ink/25 transition group-hover:translate-x-1" /></button>)}{!rows.length && <div className="py-10 text-center text-[12px] text-ink/45">No records match your search.</div>}</div></div><Stats stats={stats} /></>; }

function AttendeeOperations({ rows, attendeeEvent, setAttendeeEvent, attendeeSearch, setAttendeeSearch, attendeeTicket, setAttendeeTicket, attendeeSort, setAttendeeSort, eventNames, ticketTypes, onAdd, onModerate }: { rows: Row[]; attendeeEvent: string; setAttendeeEvent: (value: string) => void; attendeeSearch: string; setAttendeeSearch: (value: string) => void; attendeeTicket: string; setAttendeeTicket: (value: string) => void; attendeeSort: "earliest" | "latest"; setAttendeeSort: (value: "earliest" | "latest") => void; eventNames: string[]; ticketTypes: string[]; onAdd: () => void; onModerate: (id: string, next: "approved" | "rejected") => void }) { return <div className="glass-card rounded-[26px] p-5 shadow-[0_14px_34px_rgba(47,59,61,0.07)] sm:p-7"><div className="flex flex-col justify-between gap-3 border-b border-ink/8 pb-5 sm:flex-row sm:items-center"><div><h2 className="font-display text-[21px] font-bold tracking-[-0.055em]">Attendee directory</h2><p className="mt-1 text-[11px] text-ink/45">Select an event first, then manage its attendees.</p></div><div className="flex items-center gap-2"><div className="flex h-9 items-center gap-2 rounded-[11px] border border-ink/8 bg-white/65 px-3 text-[11px] text-ink/45"><Search className="size-3.5" /><input disabled={!attendeeEvent} value={attendeeSearch} onChange={(event) => setAttendeeSearch(event.target.value)} placeholder={attendeeEvent ? "Search attendees" : "Select event first"} className="w-[145px] bg-transparent outline-none placeholder:text-ink/35 disabled:opacity-50" /></div><button onClick={onAdd} className="grid size-9 place-items-center rounded-[11px] bg-coral text-ink"><Plus className="size-4" /></button></div></div><div className="mt-4 flex flex-wrap items-center gap-2 rounded-[14px] border border-ink/7 bg-white/55 p-3 text-[10px] font-bold text-ink/55"><span className="mr-1 text-ink/40">Event:</span>{["", ...eventNames].map((eventName) => <button key={eventName || "all"} onClick={() => setAttendeeEvent(eventName)} className={`rounded-full px-2.5 py-1 transition ${attendeeEvent === eventName ? "bg-ink text-white" : "bg-white hover:bg-coral/20"}`}>{eventName || "Choose event"}</button>)}</div>{attendeeEvent && <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-bold"><span className="self-center text-ink/40">Ticket:</span>{["All tickets", ...ticketTypes].map((ticket) => <button key={ticket} onClick={() => setAttendeeTicket(ticket)} className={`rounded-full px-2.5 py-1 ${attendeeTicket === ticket ? "bg-ink text-white" : "bg-white"}`}>{ticket}</button>)}<button onClick={() => setAttendeeSort(attendeeSort === "earliest" ? "latest" : "earliest")} className="rounded-full bg-white px-2.5 py-1">{attendeeSort === "earliest" ? "Earliest booking" : "Latest booking"}</button></div>}<div className="mt-4 divide-y divide-ink/7">{rows.map((row) => <div key={`${row.name}-${row.detail}`} className="flex items-center gap-3 py-4"><div className="grid size-10 place-items-center rounded-[13px] bg-[#dbece1]"><Users className="size-4 text-ink/55" /></div><div className="min-w-0 flex-1"><p className="truncate text-[12px] font-black">{row.name}</p><p className="truncate text-[10px] text-ink/45">{row.detail} · {row.ticket} · booked {row.booked}</p></div><span className="hidden rounded-full bg-ink/6 px-2 py-1 text-[9px] font-black text-ink/50 sm:block">{row.status}</span>{row.rawStatus === "pending" && row.id && <span className="flex shrink-0 gap-1.5"><button onClick={() => onModerate(row.id as string, "approved")} className="rounded-full bg-[#39825f] px-2.5 py-1 text-[9px] font-black text-white hover:opacity-90">Approve</button><button onClick={() => onModerate(row.id as string, "rejected")} className="rounded-full bg-white px-2.5 py-1 text-[9px] font-black text-[#9f503d] ring-1 ring-[#f0b4a6] hover:bg-[#fbe9e3]">Reject</button></span>}</div>)}{!rows.length && <div className="py-10 text-center text-[12px] text-ink/45">{attendeeEvent ? "No attendees match these filters." : "Choose an event above to view attendees."}</div>}</div></div>; }

function TicketOperations({ rows, eventFilter, setEventFilter, eventNames, summary, onAction }: { rows: Row[]; eventFilter: string; setEventFilter: (value: string) => void; eventNames: string[]; summary: { capacity: number; sold: number; waitlist: number; pending: number; types: number }; onAction: (message: string) => void }) { const pctFull = summary.capacity > 0 ? Math.round((summary.sold / summary.capacity) * 100) : 0; return <div className="space-y-5"><div className="glass-card rounded-[26px] p-5 shadow-[0_14px_34px_rgba(47,59,61,0.07)] sm:p-7"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-coral">Ticket operations</p><h2 className="mt-1 font-display text-[23px] font-bold tracking-[-0.06em]">Manage one event at a time.</h2></div><div className="w-full sm:w-[240px]"><Select value={eventFilter} onChange={setEventFilter} options={eventNames.length ? eventNames : ["No events yet"]} /></div></div><div className="mt-6 grid gap-3 sm:grid-cols-3"><Metric label="Capacity" value={summary.capacity.toLocaleString()} detail="seats configured" tone="mint" /><Metric label="Sold" value={summary.sold.toLocaleString()} detail="tickets issued" tone="coral" /><Metric label="Waitlist" value={summary.waitlist.toLocaleString()} detail="people waiting" tone="lilac" /></div></div><div className="glass-card rounded-[26px] p-5 shadow-[0_14px_34px_rgba(47,59,61,0.07)] sm:p-7"><div className="flex items-center justify-between"><div><h2 className="font-display text-[21px] font-bold tracking-[-0.055em]">{eventFilter || "Select an event"} ticket types</h2><p className="mt-1 text-[11px] text-ink/45">Capacity, approvals, and waitlist health at a glance.</p></div><button onClick={() => onAction("New ticket type draft created.")} className="flex items-center gap-2 rounded-[11px] bg-coral px-3 py-2 text-[10px] font-black text-ink"><Plus className="size-3.5" /> Add type</button></div><div className="mt-5 divide-y divide-ink/7">{rows.map((row) => <div key={row.name} className="flex flex-wrap items-center gap-3 py-4"><div className={`grid size-10 place-items-center rounded-[13px] ${row.tone === "coral" ? "bg-[#f6c8b5]" : "bg-[#dbece1]"}`}><Ticket className="size-4 text-ink/55" /></div><div className="min-w-[170px] flex-1"><p className="text-[12px] font-black">{row.name}</p><p className="mt-1 text-[10px] text-ink/45">{row.detail}</p></div><span className="rounded-full bg-[#e5eee9] px-2 py-1 text-[9px] font-black text-[#39825f]">{row.status}</span><button onClick={() => onAction(`${row.name} settings opened.`)} className="rounded-[10px] p-2 text-ink/40 hover:bg-ink/5"><ArrowUpRight className="size-4" /></button></div>)}{!rows.length && <div className="py-10 text-center text-[12px] text-ink/45">No ticket types for this event yet.</div>}</div><div className="mt-5 grid gap-3 sm:grid-cols-3"><button onClick={() => onAction("Approval queue opened.")} className="rounded-[14px] bg-[#f6c8b5]/60 p-4 text-left"><p className="text-[10px] font-black uppercase tracking-[0.12em] text-ink/40">Approvals</p><p className="mt-2 font-display text-[24px] font-bold tracking-[-0.06em]">{summary.pending} pending</p><p className="mt-1 text-[10px] text-ink/45">Review attendee requests</p></button><button onClick={() => onAction("Waitlist opened.")} className="rounded-[14px] bg-[#e8e0f4]/70 p-4 text-left"><p className="text-[10px] font-black uppercase tracking-[0.12em] text-ink/40">Waitlist</p><p className="mt-2 font-display text-[24px] font-bold tracking-[-0.06em]">{summary.waitlist} waiting</p><p className="mt-1 text-[10px] text-ink/45">Invite when space opens</p></button><button onClick={() => onAction("Capacity editor opened.")} className="rounded-[14px] bg-[#e5eee9]/75 p-4 text-left"><p className="text-[10px] font-black uppercase tracking-[0.12em] text-ink/40">Capacity</p><p className="mt-2 font-display text-[24px] font-bold tracking-[-0.06em]">{pctFull}% full</p><p className="mt-1 text-[10px] text-ink/45">Adjust limits by ticket type</p></button></div></div></div>; }

function Metric({ label, value, detail, tone }: { label: string; value: string; detail: string; tone: "mint" | "coral" | "lilac" }) { return <div className={`rounded-[16px] p-4 ${tone === "mint" ? "bg-[#e5eee9]" : tone === "coral" ? "bg-[#f6c8b5]/65" : "bg-[#e8e0f4]/70"}`}><p className="text-[9px] font-black uppercase tracking-[0.13em] text-ink/40">{label}</p><p className="mt-2 font-display text-[25px] font-bold tracking-[-0.06em]">{value}</p><p className="mt-1 text-[10px] text-ink/45">{detail}</p></div>; }

function Stats({ stats }: { stats?: OverviewStats | null }) { const attentionLabel = `${String(stats?.attentionCount ?? 3).padStart(2, "0")} items`; return <section className="mt-5 grid gap-4 sm:grid-cols-3"><div className="rounded-[20px] bg-[#e5eee9]/75 p-5"><p className="text-[10px] font-black uppercase tracking-[0.14em] text-ink/38">Status</p><p className="mt-2 font-display text-[25px] font-bold tracking-[-0.06em]">{stats?.statusLabel ?? "On track"}</p><p className="mt-1 text-[10px] text-ink/45">{stats?.statusDetail ?? "Everything is moving forward."}</p></div><div className="rounded-[20px] bg-[#f6c8b5]/65 p-5"><p className="text-[10px] font-black uppercase tracking-[0.14em] text-ink/38">Attention</p><p className="mt-2 font-display text-[25px] font-bold tracking-[-0.06em]">{attentionLabel}</p><p className="mt-1 text-[10px] text-ink/45">{stats?.attentionDetail ?? "A few things need a nudge."}</p></div><div className="rounded-[20px] bg-[#e8e0f4]/75 p-5"><p className="text-[10px] font-black uppercase tracking-[0.14em] text-ink/38">Updated</p><p className="mt-2 font-display text-[25px] font-bold tracking-[-0.06em]">{stats?.updatedLabel ?? "Just now"}</p><p className="mt-1 text-[10px] text-ink/45">{stats?.updatedDetail ?? "Your organization is in sync."}</p></div></section>; }


function EventScopedOperations({ kind, events, onAction }: { kind: "sessions" | "venues" | "speakers" | "sponsors"; events: EventRef[]; onAction: (message: string) => void }) {
  const eventTitles = events.map((event) => event.title);
  const [selectedTitle, setSelectedTitle] = useState(eventTitles[0] || "");
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<{ sessions: ApiSession[]; speakers: ApiSpeaker[]; sponsors: ApiSponsor[]; venues: ApiVenue[] }>({ sessions: [], speakers: [], sponsors: [], venues: [] });
  const [venue, setVenue] = useState("");
  const [savedVenue, setSavedVenue] = useState("");
  const [newSponsor, setNewSponsor] = useState("");
  const [localSponsors, setLocalSponsors] = useState<string[]>([]);
  const [speakerMap, setSpeakerMap] = useState<Record<string, string>>({});

  const selectedId = events.find((event) => event.title === selectedTitle)?.id || "";

  useEffect(() => {
    setSelectedTitle((current) => current || eventTitles[0] || "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events]);

  useEffect(() => {
    if (!selectedId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const loaders: Promise<unknown>[] = [];
    if (kind === "sessions" || kind === "speakers") loaders.push(api.get<ApiSession[]>(`/api/sessions?eventId=${selectedId}`).then((data) => ({ key: "sessions", data })).catch(() => ({ key: "sessions", data: [] })));
    if (kind === "speakers") loaders.push(api.get<ApiSpeaker[]>(`/api/speakers?eventId=${selectedId}`).then((data) => ({ key: "speakers", data })).catch(() => ({ key: "speakers", data: [] })));
    if (kind === "sponsors") loaders.push(api.get<ApiSponsor[]>(`/api/sponsors?eventId=${selectedId}`).then((data) => ({ key: "sponsors", data })).catch(() => ({ key: "sponsors", data: [] })));
    if (kind === "venues") loaders.push(api.get<ApiVenue[]>("/api/venues").then((data) => ({ key: "venues", data })).catch(() => ({ key: "venues", data: [] })));
    Promise.all(loaders).then((results) => {
      if (cancelled) return;
      setItems((current) => {
        const next = { ...current };
        results.forEach((result) => {
          const { key: resultKey, data } = result as { key: keyof typeof next; data: never[] };
          (next[resultKey] as never[]) = data;
        });
        return next;
      });
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [kind, selectedId]);

  useEffect(() => {
    if (kind !== "venues") return;
    const first = items.venues[0]?.name || "";
    setVenue((current) => current || first);
    setSavedVenue((current) => current || first);
  }, [kind, items.venues]);

  useEffect(() => {
    if (kind !== "speakers") return;
    setSpeakerMap((current) => {
      const next = { ...current };
      items.sessions.forEach((session, index) => {
        if (!next[session.title]) next[session.title] = items.speakers[index % Math.max(items.speakers.length, 1)]?.name || "";
      });
      return next;
    });
  }, [kind, items.sessions, items.speakers]);

  useEffect(() => {
    setLocalSponsors([]);
    setNewSponsor("");
  }, [selectedTitle]);

  const selectEvent = (value: string) => {
    setSelectedTitle(value);
  };

  const sessions = items.sessions.map((session) => ({
    time: fmtTime(session.startTime),
    title: session.title,
    room: session.roomName || "Room TBA",
    speaker: speakerMap[session.title] || session.type || "Speaker TBA",
  }));
  const currentSponsors = [...items.sponsors.map((sponsor) => sponsor.company || sponsor.name), ...localSponsors];
  const venueOptions = items.venues.length ? items.venues.map((entry) => entry.name) : ["No venues yet"];

  return <div className="space-y-5"><div className="glass-card rounded-[26px] p-5 shadow-[0_14px_34px_rgba(47,59,61,0.07)] sm:p-7"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-coral">Event operations</p><h2 className="mt-1 font-display text-[23px] font-bold tracking-[-0.06em]">{kind === "sessions" ? "Sessions by event" : kind === "venues" ? "Venue by event" : kind === "speakers" ? "Speakers by session" : "Sponsors by event"}</h2><p className="mt-1 text-[11px] text-ink/45">Select an event to manage its {kind}.</p></div><div className="w-full sm:w-[270px]"><Select value={selectedTitle} onChange={selectEvent} options={eventTitles.length ? eventTitles : ["No events yet"]} /></div></div></div>{loading ? <div className="glass-card rounded-[26px] p-10 text-center text-[12px] text-ink/45 shadow-[0_14px_34px_rgba(47,59,61,0.07)]">Loading {kind}…</div> : <>{kind === "sessions" && <div className="glass-card rounded-[26px] p-5 shadow-[0_14px_34px_rgba(47,59,61,0.07)] sm:p-7"><div className="flex items-center justify-between"><div><h3 className="font-display text-[20px] font-bold tracking-[-0.055em]">{selectedTitle} schedule</h3><p className="mt-1 text-[11px] text-ink/45">Every session, room, and assigned speaker for this event.</p></div><button onClick={() => onAction(`New session draft created for ${selectedTitle}.`)} className="flex items-center gap-2 rounded-[11px] bg-coral px-3 py-2 text-[10px] font-black text-ink"><Plus className="size-3.5" /> Add session</button></div><div className="mt-5 divide-y divide-ink/7">{sessions.map((session) => <button key={session.title} onClick={() => onAction(`${session.title} opened for editing.`)} className="flex w-full items-center gap-3 py-4 text-left"><span className="w-11 text-[10px] font-black text-ink/40">{session.time}</span><span className="h-10 w-1 rounded-full bg-coral" /><span className="min-w-0 flex-1"><span className="block text-[12px] font-black">{session.title}</span><span className="mt-1 block text-[10px] text-ink/45">{session.room} · {session.speaker}</span></span><ChevronRight className="size-4 text-ink/25" /></button>)}{!sessions.length && <div className="py-10 text-center text-[12px] text-ink/45">No sessions for this event yet.</div>}</div></div>}{kind === "venues" && <div className="glass-card rounded-[26px] p-5 shadow-[0_14px_34px_rgba(47,59,61,0.07)] sm:p-7"><p className="text-[10px] font-black uppercase tracking-[0.14em] text-ink/40">Assigned venue</p><div className="mt-4 flex flex-col gap-3 rounded-[16px] bg-[#e5eee9] p-4 sm:flex-row sm:items-center"><div className="flex min-w-0 flex-1 items-center gap-3"><div className="grid size-10 place-items-center rounded-[12px] bg-white/70"><MapPin className="size-4 text-[#4a8766]" /></div><div className="min-w-0"><p className="truncate text-[12px] font-black">{selectedTitle}</p><p className="mt-1 text-[10px] text-ink/45">Change the venue and save it for this event.</p></div></div><div className="flex w-full gap-2 sm:w-[390px]"><input value={venue} onChange={(e) => setVenue(e.target.value)} className="h-10 min-w-0 flex-1 rounded-[11px] border border-ink/8 bg-white/75 px-3 text-[11px] font-bold outline-none focus:border-coral/60" /><button onClick={() => { setSavedVenue(venue); onAction(`${selectedTitle} venue saved as ${venue}.`); }} className="h-10 rounded-[11px] bg-ink px-4 text-[10px] font-black text-white">Save venue</button></div></div><p className="mt-4 text-[10px] text-ink/45">Saved for this event: <span className="font-bold text-ink">{savedVenue || "None yet"}</span></p>{items.venues.length > 0 && <div className="mt-4 divide-y divide-ink/7">{items.venues.map((entry) => <div key={entry._id} className="flex items-center gap-3 py-3"><div className="grid size-10 place-items-center rounded-[12px] bg-white/70"><MapPin className="size-4 text-[#4a8766]" /></div><div className="min-w-0 flex-1"><p className="truncate text-[12px] font-black">{entry.name}</p><p className="mt-1 text-[10px] text-ink/45">{entry.city || entry.country || "Location TBA"} · {entry.capacity ?? 0} capacity</p></div><span className="hidden rounded-full bg-ink/6 px-2 py-1 text-[9px] font-black text-ink/50 sm:block">{entry.isVirtual ? "Virtual" : "On-site"}</span></div>)}</div>}{!items.venues.length && <div className="py-8 text-center text-[12px] text-ink/45">No venues yet. Available venues: {venueOptions.join(", ")}.</div>}</div>}{kind === "speakers" && <div className="glass-card rounded-[26px] p-5 shadow-[0_14px_34px_rgba(47,59,61,0.07)] sm:p-7"><h3 className="font-display text-[20px] font-bold tracking-[-0.055em]">{selectedTitle} speaker assignments</h3><p className="mt-1 text-[11px] text-ink/45">Assign one speaker to each session of the selected event.</p>{sessions.length > 0 ? <div className="mt-5 space-y-3">{sessions.map((session) => <div key={session.title} className="flex flex-col gap-3 rounded-[15px] bg-white/60 p-4 sm:flex-row sm:items-center"><div className="min-w-0 flex-1"><p className="text-[12px] font-black">{session.title}</p><p className="mt-1 text-[10px] text-ink/45">{session.time} · {session.room}</p></div><div className="w-full sm:w-[230px]"><input value={session.speaker} onChange={(event) => { const value = event.target.value; setSpeakerMap((current) => ({ ...current, [session.title]: value })); }} onBlur={(event) => onAction(`${event.target.value || "No speaker"} assigned to ${session.title}.`)} placeholder="Type speaker name" className="h-10 w-full rounded-[11px] border border-ink/8 bg-white/70 px-3 text-[11px] font-bold text-ink outline-none focus:border-coral/60" /></div></div>)}</div> : <div className="py-10 text-center text-[12px] text-ink/45">No sessions for this event yet.</div>}</div>}{kind === "sponsors" && <div className="glass-card rounded-[26px] p-5 shadow-[0_14px_34px_rgba(47,59,61,0.07)] sm:p-7"><div className="flex items-center justify-between"><div><h3 className="font-display text-[20px] font-bold tracking-[-0.055em]">{selectedTitle} sponsors</h3><p className="mt-1 text-[11px] text-ink/45">Add and review every sponsor attached to this event.</p></div><span className="rounded-full bg-[#e5eee9] px-2.5 py-1 text-[10px] font-black text-[#39825f]">{currentSponsors.length} sponsors</span></div><div className="mt-5 flex gap-2"><input value={newSponsor} onChange={(e) => setNewSponsor(e.target.value)} placeholder="Sponsor name" className="h-10 min-w-0 flex-1 rounded-[11px] border border-ink/8 bg-white/70 px-3 text-[11px] font-medium outline-none focus:border-coral/60" /><button onClick={() => { if (!newSponsor.trim()) return; setLocalSponsors((current) => [...current, newSponsor.trim()]); onAction(`${newSponsor.trim()} added to ${selectedTitle}.`); setNewSponsor(""); }} className="flex h-10 items-center gap-2 rounded-[11px] bg-coral px-3 text-[10px] font-black text-ink"><Plus className="size-3.5" /> Add sponsor</button></div>{currentSponsors.length > 0 ? <div className="mt-4 grid gap-3 sm:grid-cols-3">{currentSponsors.map((sponsor) => <div key={sponsor} className="flex items-center gap-3 rounded-[14px] bg-[#f6c8b5]/45 p-3"><div className="grid size-8 place-items-center rounded-[10px] bg-white/70 text-[10px] font-black text-ink">{sponsor.slice(0, 1)}</div><span className="text-[11px] font-black">{sponsor}</span></div>)}</div> : <div className="py-8 text-center text-[12px] text-ink/45">No sponsors for this event yet.</div>}</div>}</>}</div>;
}
