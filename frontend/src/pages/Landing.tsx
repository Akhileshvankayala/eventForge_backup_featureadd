import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { ArrowRight, CalendarDays, Search, Sparkles, Ticket } from "lucide-react";
import Scene3D from "@/components/Scene3D";
import { LanguageSelector } from "@/components/LanguageSelector";
import { useTranslation } from "@/i18n";
import { baseUrl } from "@/lib/api";

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
  return Number.isNaN(d.getTime()) ? "TBA" : d.toLocaleString("en-US", { month: "short" }).toUpperCase();
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
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const [events, setEvents] = useState<PublicEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadEvents() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${baseUrl}/api/public/events`);
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
          <span>
            <span className="block font-display text-[17px] font-bold tracking-[-0.05em]">{t("brand.name")}</span>
            <span className="block text-[9px] font-black uppercase tracking-[0.18em] text-ink/40">{t("brand.tagline")}</span>
          </span>
        </button>
        <div className="flex items-center gap-2 sm:gap-3">
          <LanguageSelector />
          <button
            onClick={() => navigate("/auth?role=attendee")}
            className="hidden rounded-[12px] px-3 py-2 text-[12px] font-bold text-ink/60 transition hover:bg-white sm:block"
          >
            {t("nav.myTickets")}
          </button>
          <button
            onClick={() => navigate("/auth?role=organizer")}
            className="rounded-[12px] bg-ink px-4 py-2.5 text-[12px] font-black text-white transition hover:-translate-y-0.5 hover:bg-[#264c59]"
          >
            {t("nav.organizerSignIn")}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-[1240px] px-5 pb-16 sm:px-8 lg:px-10">
        <section className="relative overflow-hidden rounded-[32px] bg-ink px-6 py-14 text-white shadow-[0_24px_52px_rgba(14,40,49,0.18)] sm:px-12 sm:py-20 lg:px-16">
          <Scene3D disabled={false} />
          <div className="absolute -right-20 -top-28 size-80 rounded-full border-[38px] border-white/[0.06]" />
          <div className="absolute -bottom-44 left-1/3 size-96 rounded-full border-[52px] border-coral/10" />
          <div className="relative max-w-[700px]">
            <div className="mb-5 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-coral">
              <Sparkles className="size-3.5" />{" "}
              {t("landing.hero.eyebrow")}
            </div>
            <h1 className="font-display text-[clamp(2.7rem,7vw,5.9rem)] font-bold leading-[0.9] tracking-[-0.08em]">
              {t("landing.hero.title1")}
              <br />
              <span className="text-coral">{t("landing.hero.title2")}</span>
            </h1>
            <p className="mt-6 max-w-[510px] text-[14px] leading-6 text-white/60">
              {t("landing.hero.subtitle")}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <button
                onClick={() => document.getElementById("events")?.scrollIntoView({ behavior: "smooth" })}
                className="flex items-center gap-2 rounded-[13px] bg-coral px-4 py-3 text-[12px] font-black text-ink transition hover:-translate-y-0.5 hover:bg-[#f58c79]"
              >
                {t("landing.hero.exploreEvents")} <ArrowRight className="size-4" />
              </button>
              <button
                onClick={() => navigate("/auth?role=attendee")}
                className="flex items-center gap-2 rounded-[13px] border border-white/15 bg-white/10 px-4 py-3 text-[12px] font-bold text-white transition hover:bg-white/15"
              >
                <Ticket className="size-4" /> {t("landing.hero.viewMyTickets")}
              </button>
            </div>
          </div>
        </section>

        <section id="events" className="pt-14">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-coral">{t("nav.events")}</p>
              <h2 className="mt-2 font-display text-[32px] font-bold tracking-[-0.07em]">{t("landing.events.title")}</h2>
              <p className="mt-2 text-[13px] text-ink/50">{t("landing.events.subtitle")}</p>
            </div>
            <div className="flex h-10 items-center gap-2 rounded-[12px] border border-ink/8 bg-white/60 px-3 text-[11px] text-ink/40">
              <Search className="size-4" /> {t("landing.events.search")}
            </div>
          </div>
          <div className="mt-7 grid gap-5 lg:grid-cols-3">
            {loading ? (
              [0, 1, 2].map((i) => (
                <div key={i} className="overflow-hidden rounded-[25px] border border-white/90 bg-white/62 shadow-[0_14px_34px_rgba(47,59,61,0.07)]">
                  <div className="h-[160px] animate-pulse bg-ink/10" />
                  <div className="space-y-3 p-5">
                    <div className="h-5 w-2/3 animate-pulse rounded-[8px] bg-ink/10" />
                    <div className="h-3 w-full animate-pulse rounded-[6px] bg-ink/8" />
                    <div className="h-3 w-5/6 animate-pulse rounded-[6px] bg-ink/8" />
                  </div>
                </div>
              ))
            ) : error ? (
              <div className="col-span-full rounded-[25px] border border-white/90 bg-white/62 p-10 text-center shadow-[0_14px_34px_rgba(47,59,61,0.07)]">
                <p className="font-display text-[20px] font-bold tracking-[-0.05em]">{t("landing.events.error")}</p>
                <p className="mt-2 text-[12px] text-ink/50">{error}</p>
                <button
                  onClick={() => void loadEvents()}
                  className="mt-5 rounded-[12px] bg-ink px-5 py-2.5 text-[12px] font-black text-white transition hover:bg-[#264c59]"
                >
                  {t("landing.events.tryAgain")}
                </button>
              </div>
            ) : events.length === 0 ? (
              <div className="col-span-full rounded-[25px] border border-white/90 bg-white/62 p-10 text-center shadow-[0_14px_34px_rgba(47,59,61,0.07)]">
                <p className="font-display text-[20px] font-bold tracking-[-0.05em]">{t("landing.events.noEvents")}</p>
                <p className="mt-2 text-[12px] text-ink/50">{t("landing.events.noEventsSub")}</p>
              </div>
            ) : (
              events.map((event) => (
                <div
                  key={event.id}
                  className="group flex flex-col rounded-[25px] border border-white/90 bg-white/62 shadow-[0_14px_34px_rgba(47,59,61,0.07)] transition hover:-translate-y-1"
                >
                  <div className="relative h-[160px] w-full shrink-0 overflow-hidden rounded-t-[25px]">
                    <div className="absolute top-3 left-3 z-10 rounded-full bg-ink/80 px-2 py-1 text-[10px] font-black text-white">
                      {dayOf(event.startDate)} {monthOf(event.startDate)}
                    </div>
                    {event.coverImage ? (
                      <img src={event.coverImage} alt={event.title} className="h-full w-full object-cover" />
                    ) : (
                      <div className="bg-ink/5 h-full w-full" />
                    )}
                  </div>
                  <div className="p-5">
                    <span className="text-[10px] font-black uppercase tracking-[0.12em] text-ink/40">
                      {topicsOf(event)}
                    </span>
                    <h3 className="mt-2 font-display text-[18px] font-bold tracking-[-0.04em]">{event.title}</h3>
                    <p className="mt-2 text-[12px] text-ink/50">{locationOf(event)}</p>
                    <p className="mt-2 line-clamp-2 text-[12px] text-ink/55">{event.description}</p>
                    <button
                      onClick={() => navigate("/auth?role=attendee")}
                      className="mt-4 w-full rounded-[11px] bg-coral px-3 py-2 text-[11px] font-black text-ink transition hover:bg-[#f58c79]"
                    >
                      {t("attendee.ticket.book")} {event.title}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="mt-16 grid gap-4 rounded-[26px] border border-white bg-[#e5eee9]/70 p-6 sm:grid-cols-3 sm:p-8">
          <div className="flex items-start gap-3">
            <div className="grid size-9 shrink-0 place-items-center rounded-[11px] bg-white/70">
              <CalendarDays className="size-4 text-[#4a8766]" />
            </div>
            <div>
              <p className="text-[12px] font-black">{t("landing.features.curated.title")}</p>
              <p className="mt-1 text-[11px] leading-5 text-ink/50">{t("landing.features.curated.desc")}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="grid size-9 shrink-0 place-items-center rounded-[11px] bg-white/70">
              <Ticket className="size-4 text-[#a65745]" />
            </div>
            <div>
              <p className="text-[12px] font-black">{t("landing.features.ticketing.title")}</p>
              <p className="mt-1 text-[11px] leading-5 text-ink/50">{t("landing.features.ticketing.desc")}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="grid size-9 shrink-0 place-items-center rounded-[11px] bg-white/70">
              <Sparkles className="size-4 text-[#7963a3]" />
            </div>
            <div>
              <p className="text-[12px] font-black">{t("landing.features.recommendations.title")}</p>
              <p className="mt-1 text-[11px] leading-5 text-ink/50">{t("landing.features.recommendations.desc")}</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
