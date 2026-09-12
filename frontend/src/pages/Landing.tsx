import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { ArrowRight, CalendarDays, ChevronRight, MapPin, Search, Sparkles, Ticket, Users } from "lucide-react";
import Scene3D from "@/components/Scene3D";

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

type Tone = "coral" | "mint" | "lilac";
const TONES: Tone[] = ["coral", "mint", "lilac"];

function toneFor(index: number): Tone {
  return TONES[index % TONES.length];
}

function dayOf(dateValue?: string): string {
  if (!dateValue) return "--";
  const d = new Date(dateValue);
  return Number.isNaN(d.getTime()) ? "--" : String(d.getDate()).padStart(2, "0");
}

function monthOf(dateValue?: string): string {
  if (!dateValue) return "TBA";
  const d = new Date(dateValue);
  return Number.isNaN(d.getTime())
    ? "TBA"
    : d.toLocaleString("en-US", { month: "short" }).toUpperCase();
}

function locationOf(event: PublicEvent): string {
  if (!event.venue) return "Online experience";
  const parts = [event.venue.name, event.venue.city].filter(Boolean);
  return parts.length > 0 ? (parts as string[]).join(" · ") : "Online experience";
}

function topicsOf(event: PublicEvent): string {
  if (event.tags && event.tags.length > 0) return event.tags.slice(0, 2).join(" · ");
  return event.type ?? "Event";
}

export default function Landing() {
  const [, navigate] = useLocation();
  const [events, setEvents] = useState<PublicEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadEvents() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/public/events");
      if (!response.ok) throw new Error(`Could not load events (${response.status})`);
      const data = (await response.json()) as PublicEvent[];
      setEvents(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load events");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadEvents();
  }, []);

  return (
    <div className="min-h-screen bg-[#f6f4ee] text-ink">
      <header className="mx-auto flex max-w-[1240px] items-center justify-between px-5 py-5 sm:px-8 lg:px-10">
        <button onClick={() => navigate("/")} className="flex items-center gap-3">
          <span className="eventforge-mark grid size-10 place-items-center rounded-[14px] bg-ink text-[12px] font-black text-white shadow-[0_10px_24px_rgba(14,40,49,0.16)]">EF</span>
          <span><span className="block font-display text-[17px] font-bold tracking-[-0.05em]">eventforge</span><span className="block text-[9px] font-black uppercase tracking-[0.18em] text-ink/40">Corporate events, beautifully orchestrated</span></span>
        </button>
        <div className="flex items-center gap-2 sm:gap-3"><button onClick={() => navigate("/auth?role=attendee")} className="hidden rounded-[12px] px-3 py-2 text-[12px] font-bold text-ink/60 transition hover:bg-white sm:block">My tickets</button><button onClick={() => navigate("/auth?role=organizer")} className="rounded-[12px] bg-ink px-4 py-2.5 text-[12px] font-black text-white transition hover:-translate-y-0.5 hover:bg-[#264c59]">Organizer sign in</button></div>
      </header>

      <main className="mx-auto max-w-[1240px] px-5 pb-16 sm:px-8 lg:px-10">
        <section className="relative overflow-hidden rounded-[32px] bg-ink px-6 py-14 text-white shadow-[0_24px_52px_rgba(14,40,49,0.18)] sm:px-12 sm:py-20 lg:px-16">
          <Scene3D disabled={false} />
          <div className="absolute -right-20 -top-28 size-80 rounded-full border-[38px] border-white/[0.06]" /><div className="absolute -bottom-44 left-1/3 size-96 rounded-full border-[52px] border-coral/10" />
          <div className="relative max-w-[700px]"><div className="mb-5 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-coral"><Sparkles className="size-3.5" /> Find your next meaningful room</div><h1 className="font-display text-[clamp(2.7rem,7vw,5.9rem)] font-bold leading-[0.9] tracking-[-0.08em]">Ideas are better<br /><span className="text-coral">together.</span></h1><p className="mt-6 max-w-[510px] text-[14px] leading-6 text-white/60">Discover conferences, workshops, and conversations built for curious people. Pick a room, bring your questions, and leave with momentum.</p><div className="mt-8 flex flex-wrap gap-3"><button onClick={() => document.getElementById("events")?.scrollIntoView({ behavior: "smooth" })} className="flex items-center gap-2 rounded-[13px] bg-coral px-4 py-3 text-[12px] font-black text-ink transition hover:-translate-y-0.5 hover:bg-[#f58c79]">Explore events <ArrowRight className="size-4" /></button><button onClick={() => navigate("/auth?role=attendee")} className="flex items-center gap-2 rounded-[13px] border border-white/15 bg-white/10 px-4 py-3 text-[12px] font-bold text-white transition hover:bg-white/15"><Ticket className="size-4" /> View my tickets</button></div></div>
        </section>

        <section id="events" className="pt-14"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-coral">The event calendar</p><h2 className="mt-2 font-display text-[32px] font-bold tracking-[-0.07em]">Something worth showing up for.</h2><p className="mt-2 text-[13px] text-ink/50">Choose an event to see the experience and reserve your place.</p></div><div className="flex h-10 items-center gap-2 rounded-[12px] border border-ink/8 bg-white/60 px-3 text-[11px] text-ink/40"><Search className="size-4" /> Search events</div></div><div className="mt-7 grid gap-5 lg:grid-cols-3">{loading ? [0, 1, 2].map((i) => <div key={i} className="overflow-hidden rounded-[25px] border border-white/90 bg-white/62 shadow-[0_14px_34px_rgba(47,59,61,0.07)]"><div className="h-[160px] animate-pulse bg-ink/10" /><div className="space-y-3 p-5"><div className="h-5 w-2/3 animate-pulse rounded-[8px] bg-ink/10" /><div className="h-3 w-full animate-pulse rounded-[6px] bg-ink/8" /><div className="h-3 w-5/6 animate-pulse rounded-[6px] bg-ink/8" /></div></div>) : error ? <div className="col-span-full rounded-[25px] border border-white/90 bg-white/62 p-10 text-center shadow-[0_14px_34px_rgba(47,59,61,0.07)]"><p className="font-display text-[20px] font-bold tracking-[-0.05em]">We couldn&apos;t load events.</p><p className="mt-2 text-[12px] text-ink/50">{error}</p><button onClick={() => void loadEvents()} className="mt-5 rounded-[12px] bg-ink px-5 py-2.5 text-[12px] font-black text-white transition hover:bg-[#264c59]">Try again</button></div> : events.length === 0 ? <div className="col-span-full rounded-[25px] border border-white/90 bg-white/62 p-10 text-center shadow-[0_14px_34px_rgba(47,59,61,0.07)]"><p className="font-display text-[20px] font-bold tracking-[-0.05em]">No events yet.</p><p className="mt-2 text-[12px] text-ink/50">Check back soon — new rooms are being prepared.</p></div> : events.map((event, index) => { const tone = toneFor(index); return <button key={event.id} onClick={() => navigate(`/auth?event=${encodeURIComponent(event.title)}`)} className="group overflow-hidden rounded-[25px] border border-white/90 bg-white/62 text-left shadow-[0_14px_34px_rgba(47,59,61,0.07)] transition hover:-translate-y-1 hover:shadow-[0_20px_42px_rgba(47,59,61,0.12)]"><div className={`relative h-[160px] overflow-hidden ${tone === "coral" ? "bg-[#f6c8b5]" : tone === "mint" ? "bg-[#dbece1]" : "bg-[#e8e0f4]"}`}><div className="absolute -right-10 -top-20 size-52 rounded-full border-[28px] border-white/25" /><div className="absolute left-5 top-5 grid size-[53px] place-items-center rounded-[15px] bg-white/65 backdrop-blur-sm"><span className="font-display text-[21px] font-bold leading-none tracking-[-0.07em]">{dayOf(event.startDate)}</span><span className="mt-0.5 text-[8px] font-black tracking-[0.12em] text-ink/45">{monthOf(event.startDate)}</span></div><span className="absolute bottom-5 left-5 rounded-full bg-ink/85 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-white">{event.type ?? "Event"}</span><ArrowRight className="absolute bottom-5 right-5 size-5 text-ink/40 transition group-hover:translate-x-1 group-hover:text-ink" /></div><div className="p-5"><h3 className="font-display text-[20px] font-bold leading-[1] tracking-[-0.055em]">{event.title}</h3><p className="mt-3 text-[12px] leading-5 text-ink/55">{event.description}</p><div className="mt-5 flex items-center gap-3 border-t border-ink/7 pt-4 text-[10px] font-bold text-ink/45"><span className="flex items-center gap-1"><MapPin className="size-3" />{locationOf(event)}</span><span className="ml-auto flex items-center gap-1"><Users className="size-3" />{topicsOf(event)}</span></div></div></button>; })}</div></section>

        <section className="mt-16 grid gap-4 rounded-[26px] border border-white bg-[#e5eee9]/70 p-6 sm:grid-cols-3 sm:p-8"><div className="flex items-start gap-3"><div className="grid size-9 shrink-0 place-items-center rounded-[11px] bg-white/70"><CalendarDays className="size-4 text-[#4a8766]" /></div><div><p className="text-[12px] font-black">Curated experiences</p><p className="mt-1 text-[11px] leading-5 text-ink/50">Browse rooms built around ideas that move teams forward.</p></div></div><div className="flex items-start gap-3"><div className="grid size-9 shrink-0 place-items-center rounded-[11px] bg-white/70"><Ticket className="size-4 text-[#a65745]" /></div><div><p className="text-[12px] font-black">Simple ticketing</p><p className="mt-1 text-[11px] leading-5 text-ink/50">Book your place, save your ticket, and show up ready.</p></div></div><div className="flex items-start gap-3"><div className="grid size-9 shrink-0 place-items-center rounded-[11px] bg-white/70"><Sparkles className="size-4 text-[#7963a3]" /></div><div><p className="text-[12px] font-black">Thoughtful recommendations</p><p className="mt-1 text-[11px] leading-5 text-ink/50">Get a sharper agenda based on what you care about.</p></div></div></section>
      </main>
    </div>
  );
}
