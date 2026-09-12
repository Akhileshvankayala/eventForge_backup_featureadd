import { useState } from "react";
import { useLocation } from "wouter";
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
import ChatbotPanel from "@/components/ChatbotPanel";

const attendeeEvents = [
  {
    title: "Future of Work Summit",
    dates: "Sep 18–20, 2026",
    location: "The Glasshouse · NYC",
    label: "Recommended for you",
    description: "Three days of sharp conversations on the human edge of work.",
    color: "coral",
    sessions: "24 sessions",
    seats: "252 spots left",
  },
  {
    title: "Northstar Leadership Lab",
    dates: "Oct 02, 2026",
    location: "Convene · Chicago",
    label: "Workshop",
    description: "A focused day for leaders who want practical tools, not platitudes.",
    color: "mint",
    sessions: "18 sessions",
    seats: "Open registration",
  },
  {
    title: "Design Systems Workshop",
    dates: "Oct 21, 2026",
    location: "Online experience",
    label: "Popular",
    description: "Build clearer systems with a room full of thoughtful makers.",
    color: "lilac",
    sessions: "12 sessions",
    seats: "Waitlist available",
  },
];

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
  const [booked, setBooked] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showCopilot, setShowCopilot] = useState(false);
  const filtered = attendeeEvents.filter((e) =>
    e.title.toLowerCase().includes(search.toLowerCase()),
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
              OA
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
              Browse your event calendar, save your tickets, and make an agenda that feels like you.
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
                  {booked ? "1 saved ticket" : "No tickets yet"}
                </p>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-[11px] text-ink/50">
              <button
                onClick={() => setBooked("Future of Work Summit")}
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
                  Based on your interests and the sessions you&apos;ve bookmarked, here are the ones worth a closer look.
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
              {attendeeEvents.slice(0, 2).map((event) => (
                <div
                  key={event.title}
                  className="flex items-start gap-3 rounded-[14px] border border-ink/7 bg-white/50 p-4 transition hover:bg-white hover:border-ink/10"
                >
                  <div
                    className={`mt-0.5 grid size-10 place-items-center rounded-[11px] text-[13px] font-black ${
                      event.color === "coral"
                        ? "bg-[#f6c8b5] text-[#9f503d]"
                        : event.color === "mint"
                        ? "bg-[#dbece1] text-[#39825f]"
                        : "bg-[#e8e0f4] text-[#6b5792]"
                    }`}
                  >
                    <CalendarDays size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-[12px] font-black text-ink">{event.title}</p>
                      <span className="shrink-0 rounded-full bg-ink/6 px-1.5 py-0.5 text-[9px] font-bold text-ink/45">
                        {event.label}
                      </span>
                    </div>
                    <p className="mt-1 flex items-center gap-1 text-[10px] text-ink/45">
                      <MapPin size={10} />
                      {event.location}
                      <span className="mx-1 text-ink/20">·</span>
                      {event.dates}
                    </p>
                    <p className="mt-1.5 text-[11px] text-ink/55">{event.description}</p>
                    <div className="mt-3 flex items-center gap-3">
                      <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-ink/40">
                        {event.sessions}
                      </span>
                      <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-ink/40">
                        {event.seats}
                      </span>
                    </div>
                  </div>
                  <button
                    aria-label={`View ${event.title}`}
                    className="grid size-9 place-items-center rounded-full bg-ink/5 text-ink/45 transition hover:bg-ink hover:text-white"
                  >
                    <ArrowRight size={14} />
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-4 flex items-center gap-3 rounded-[11px] border border-ink/7 bg-white/50 px-4 py-3 text-[11px] text-ink/55">
              <Users size={14} className="shrink-0 text-ink/30" />
              <span className="flex-1">
                68 attendees with similar tastes also booked{" "}
                <span className="font-black text-ink/70">Future of Work Summit</span>.
              </span>
              <button className="shrink-0 rounded-full bg-ink px-3 py-1 text-[9px] font-black text-white transition hover:bg-[#264c59]">
                View their agendas
              </button>
            </div>
          </div>
        </section>

        <section className="grid gap-5 sm:grid-cols-3">
          {filtered.map((event) => (
            <div
              key={event.title}
              className="group relative rounded-[22px] border border-white bg-white/70 p-5 shadow-[0_10px_22px_rgba(47,59,61,0.06)] transition hover:-translate-y-1 sm:p-6"
            >
              <div
                className={`mb-4 grid size-14 place-items-center rounded-[16px] ${
                  event.color === "coral"
                    ? "bg-[#f6c8b5]"
                    : event.color === "mint"
                    ? "bg-[#dbece1]"
                    : "bg-[#e8e0f4]"
                }`}
              >
                <CalendarDays
                  size={26}
                  className={
                    event.color === "coral"
                      ? "text-[#9f503d]"
                      : event.color === "mint"
                      ? "text-[#39825f]"
                      : "text-[#6b5792]"
                  }
                />
              </div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-ink/35">
                {event.label}
              </p>
              <h3 className="mt-2 font-display text-[24px] font-bold tracking-[-0.05em]">
                {event.title}
              </h3>
              <p className="mt-1.5 flex items-center gap-1 text-[11px] text-ink/45">
                <MapPin size={11} />
                {event.location}
                <span className="mx-1 text-ink/20">·</span>
                {event.dates}
              </p>
              <p className="mt-3 text-[12px] text-ink/55">{event.description}</p>
              <div className="mt-4 flex items-center gap-3 text-[10px] font-bold text-ink/40">
                <span>{event.sessions}</span>
                <span className="w-px h-3 bg-ink/8" />
                <span>{event.seats}</span>
              </div>
              <button
                onClick={() => setBooked(event.title)}
                className={`mt-4 w-full rounded-[11px] py-2.5 text-[11px] font-black transition ${
                  event.color === "coral"
                    ? "bg-coral text-ink shadow-[0_9px_18px_rgba(240,123,103,0.22)] hover:bg-[#f58c79]"
                    : event.color === "mint"
                    ? "bg-[#8dbea2] text-ink hover:bg-[#7bb38f]"
                    : "bg-[#b5a2d8] text-ink hover:bg-[#a68fcb]"
                }`}
              >
                {booked === event.title ? (
                  <span className="inline-flex items-center gap-2">
                    <Check size={12} />
                    Booked
                  </span>
                ) : (
                  `Book ${event.title}`
                )}
              </button>
              <button
                onClick={() =>
                  navigate(
                    `/attendee/${event.title.toLowerCase().replace(/\s+/g, "-")}`,
                  )
                }
                className="mt-2 w-full rounded-[11px] border border-ink/8 py-2.5 text-[11px] font-bold text-ink/55 transition hover:bg-white hover:text-ink"
              >
                View details
              </button>
            </div>
          ))}
        </section>
      </main>
      <ChatbotPanel
        attendeeMode
        sessions={SESSIONS_FOR_RECOMMENDATIONS}
        open={showCopilot}
        onOpenChange={setShowCopilot}
      />
    </div>
  );
}
