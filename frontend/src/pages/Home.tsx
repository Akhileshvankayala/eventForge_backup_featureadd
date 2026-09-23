import { useEffect, useMemo, useState } from "react";
import Spline from "@splinetool/react-spline";
import { useLocation } from "wouter";
import {
  ArrowDownRight,
  ArrowUpRight,
  Bell,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Clock3,
  Command,
  Download,
  FileText,
  Filter,
  LayoutDashboard,
  LifeBuoy,
  ListFilter,
  Menu,
  MapPin,
  Megaphone,
  MessageCircle,
  MoreHorizontal,
  Plus,
  QrCode,
  Search,
  LogOut,
  Sparkles,
  Ticket,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import { toast } from "sonner";
import ChatbotPanel from "@/components/ChatbotPanel";
import { LanguageSelector } from "@/components/LanguageSelector";
import { api } from "@/lib/api";
import { downloadReport } from "@/lib/report";
import { useTranslation } from "@/i18n";

type ApiEvent = {
  _id?: string;
  title: string;
  slug?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  location?: string;
  city?: string;
  venueId?: string;
  capacity?: number;
};

type ApiSession = {
  _id?: string;
  title: string;
  startTime?: string;
  roomName?: string;
  type?: string;
  status?: string;
};

type DisplayEvent = {
  id: string;
  date: string;
  month: string;
  title: string;
  location: string;
  meta: string;
  tone: string;
  progress: number;
  badge: string;
};

type DisplaySession = {
  time: string;
  title: string;
  room: string;
  type: string;
  color: string;
};

type StoredUser = { name?: string; role?: string; email?: string };

function getStoredUser(): StoredUser {
  try {
    const raw = localStorage.getItem("eventforge_user");
    if (!raw) return {};
    return JSON.parse(raw) as StoredUser;
  } catch {
    return {};
  }
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "EF";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function roleLabel(role?: string): string {
  if (!role) return "Organizer";
  const map: Record<string, string> = {
    admin: "Administrator",
    organizer: "Lead organizer",
    staff: "Event staff",
    speaker: "Speaker",
    attendee: "Attendee",
    sponsor: "Sponsor",
  };
  return map[role.toLowerCase()] || role;
}

const TONES = ["coral", "mint", "lilac"];
const SESSION_COLORS = ["#f07b67", "#93bfae", "#b5a2d8"];

function toDisplayEvents(items: ApiEvent[]): DisplayEvent[] {
  return items.map((event, index) => {
    const start = event.startDate ? new Date(event.startDate) : null;
    const valid = start && !Number.isNaN(start.getTime()) ? start : null;
    const tone = TONES[index % TONES.length];
    const capacity = typeof event.capacity === "number" && event.capacity > 0 ? event.capacity : 0;
    return {
      id: event._id || event.slug || event.title,
      date: valid ? String(valid.getDate()).padStart(2, "0") : "--",
      month: valid ? valid.toLocaleString("en-US", { month: "short" }).toUpperCase() : "TBD",
      title: event.title,
      location: event.location || event.city || "Venue TBA",
      meta: capacity > 0 ? `${capacity} seats` : (event.status || "Planning"),
      tone,
      progress: capacity > 0 ? Math.min(96, 24 + ((index * 31) % 68)) : 24 + ((index * 29) % 60),
      badge: event.status ? event.status.charAt(0).toUpperCase() + event.status.slice(1) : "Planning",
    };
  });
}

function toDisplaySessions(items: ApiSession[]): DisplaySession[] {
  return items.slice(0, 5).map((session, index) => {
    const start = session.startTime ? new Date(session.startTime) : null;
    const time = start && !Number.isNaN(start.getTime())
      ? `${String(start.getHours()).padStart(2, "0")}:${String(start.getMinutes()).padStart(2, "0")}`
      : "--:--";
    return {
      time,
      title: session.title,
      room: session.roomName || "Room TBA",
      type: session.type || session.status || "Session",
      color: SESSION_COLORS[index % SESSION_COLORS.length],
    };
  });
}

type NavItem = {
  label: string;
  icon: typeof LayoutDashboard;
  route: string;
  count?: string;
};

function createNavGroups(t: (key: string, fallback?: string) => string): { label: string; items: NavItem[] }[] {
  return [
    {
      label: t("nav.eventManagement"),
      items: [
        { label: t("nav.overview"), icon: LayoutDashboard, route: "overview" },
        { label: t("nav.events"), icon: CalendarDays, count: "06", route: "events" },
        { label: t("nav.attendees"), icon: Users, route: "attendees" },
        { label: t("nav.tickets"), icon: Ticket, route: "tickets" },
      ],
    },
    {
      label: t("nav.operations"),
      items: [
        { label: t("nav.sessions"), icon: Clock3, route: "sessions" },
        { label: t("nav.venues"), icon: MapPin, route: "venues" },
        { label: t("nav.speakers"), icon: MessageCircle, route: "speakers" },
        { label: t("nav.sponsors"), icon: WalletCards, route: "sponsors" },
      ],
    },
  ];
}

type OverviewVelocity = {
  totalThisMonth: number;
  pctChange: number;
  daily: { date: string; count: number }[];
};

type OverviewNextEvent = {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  venueName: string;
  city: string;
  daysUntil: number;
  registered: number;
  capacity: number;
} | null;

type OverviewRunSession = { time: string; title: string; room: string; type: string };

type OverviewResponse = {
  velocity: OverviewVelocity;
  nextEvent: OverviewNextEvent;
  runOfShow: { dateLabel: string; sessions: OverviewRunSession[] };
  stats: {
    statusLabel: string;
    statusDetail: string;
    attentionCount: number;
    attentionDetail: string;
    updatedLabel: string;
    updatedDetail: string;
  };
  totals: { events: number; attendees: number; sessions: number };
};

function formatCount(n: number): string {
  return n.toLocaleString("en-US");
}

function daysUntilLabel(days: number): string {
  if (days <= 0) return "Today";
  if (days === 1) return "1 day";
  return `${days} days`;
}

function shortDayLabel(isoDate: string): string {
  const d = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function barHeights(daily: { date: string; count: number }[]): number[] {
  const max = Math.max(1, ...daily.map((d) => d.count));
  return daily.map((d) => Math.max(8, Math.round((d.count / max) * 96)));
}

function overviewRunToDisplay(items: OverviewRunSession[]): DisplaySession[] {
  return items.slice(0, 5).map((session, index) => ({
    time: session.time,
    title: session.title,
    room: session.room,
    type: session.type,
    color: SESSION_COLORS[index % SESSION_COLORS.length],
  }));
}

export default function Home() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const [activeNav, setActiveNav] = useState("overview");
  const [selectedEvent, setSelectedEvent] = useState("");
  const [showCommand, setShowCommand] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showAllEvents, setShowAllEvents] = useState(false);
  const [showEventDetails, setShowEventDetails] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [eventSort, setEventSort] = useState<"all" | "readiness" | "date">("all");
  const [showMobileNav, setShowMobileNav] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showCopilot, setShowCopilot] = useState(false);
  const [search, setSearch] = useState("");

  const [storedUser] = useState<StoredUser>(() => getStoredUser());
  const userName = storedUser.name || "Organizer";
  const firstName = userName.trim().split(/\s+/)[0] || "Organizer";
  const initials = getInitials(userName);
  const userRoleLabel = roleLabel(storedUser.role);

  const navGroups = useMemo(() => createNavGroups(t), [t]);

  const [events, setEvents] = useState<DisplayEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [dataError, setDataError] = useState("");

  const [overview, setOverview] = useState<OverviewResponse | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [overviewError, setOverviewError] = useState("");
  const [overviewAttempt, setOverviewAttempt] = useState(0);

  useEffect(() => {
    const refreshData = () => {
      setEventsLoading(true);
      setDataError("");
      api
        .get<ApiEvent[]>("/api/events")
        .then((items) => {
          const list = Array.isArray(items) ? items : [];
          setEvents(toDisplayEvents(list));
          setSelectedEvent((current) => current || list[0]?.title || "");
        })
        .catch((error) => {
          setDataError(error instanceof Error ? error.message : t("dashboard.events.couldNotLoad"));
        })
        .finally(() => {
          setEventsLoading(false);
        });

      setOverviewLoading(true);
      setOverviewError("");
      api
        .get<OverviewResponse>("/api/analytics/overview")
        .then((data) => {
          setOverview(data);
        })
        .catch((error) => {
          setOverviewError(error instanceof Error ? error.message : t("dashboard.couldNotLoad"));
        })
        .finally(() => {
          setOverviewLoading(false);
        });
    };

    refreshData();

    const handleRefresh = () => refreshData();
    const handleStorage = (event: StorageEvent) => {
      if (event.key === "eventforge:analytics:refresh") handleRefresh();
    };
    window.addEventListener("eventforge:analytics:refresh", handleRefresh);
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("eventforge:analytics:refresh", handleRefresh);
      window.removeEventListener("storage", handleStorage);
    };
  }, [overviewAttempt, t]);

  const retryOverview = () => setOverviewAttempt((n) => n + 1);

  const velocityBars = useMemo(
    () => (overview?.velocity?.daily ? barHeights(overview.velocity.daily) : []),
    [overview],
  );
  const velocityUp = (overview?.velocity?.pctChange ?? 0) >= 0;
  const runSessions: DisplaySession[] = useMemo(
    () => overviewRunToDisplay(overview?.runOfShow?.sessions ?? []),
    [overview],
  );
  const nextEv = overview?.nextEvent ?? null;
  const nextEvStart = nextEv ? new Date(nextEv.startDate) : null;
  const nextEvValid = nextEvStart && !Number.isNaN(nextEvStart.getTime()) ? nextEvStart : null;

  const handleLogout = () => {
    try {
      localStorage.removeItem("eventforge_token");
      localStorage.removeItem("eventforge_user");
    } catch {
      /* storage unavailable */
    }
    navigate("/");
  };

  const filteredEvents = useMemo(
    () => events.filter((event) => event.title.toLowerCase().includes(search.toLowerCase())),
    [events, search],
  );
  const upcomingEvents = useMemo(() => {
    const items = [...filteredEvents];
    if (eventSort === "readiness") items.sort((a, b) => b.progress - a.progress);
    if (eventSort === "date") items.sort((a, b) => Number(a.date) - Number(b.date));
    return items;
  }, [filteredEvents, eventSort]);

  const notify = (message: string) => toast.success(message, { description: t("dashboard.reportDesc") });
  const notifyError = (message: string) => toast.error(message);
  const handleExportReport = async () => {
    try {
      const filename = await downloadReport(userName);
      notify(`${t("dashboard.reportDownloaded")}: ${filename}`);
    } catch (exportError) {
      notifyError(exportError instanceof Error ? exportError.message : t("dashboard.couldNotLoad"));
    }
  };
  const todayLabel = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  const dayPart = (() => {
    const h = new Date().getHours();
    if (h < 12) return t("dashboard.greeting.morning");
    if (h < 17) return t("dashboard.greeting.afternoon");
    return t("dashboard.greeting.evening");
  })();
  const notificationRows = overview
    ? [
        `${overview.stats.attentionCount} item(s) {} — ${overview.stats.attentionDetail}`,
        `${overview.velocity.totalThisMonth} ticket(s) sold this month (${overview.velocity.pctChange >= 0 ? "+" : ""}${overview.velocity.pctChange.toFixed(1)}% vs prior 30 days)`,
        overview.nextEvent
          ? `Next up: ${overview.nextEvent.title} in ${daysUntilLabel(overview.nextEvent.daysUntil)}`
          : t("dashboard.noUpcomingEvents", "No upcoming events — create one from") + " " + t("nav.newEvent"),
      ]
    : [t("dashboard.notifications.liveNotifications")];

  return (
    <div className="eventforge-shell min-h-screen overflow-hidden text-ink">
      <aside className="sidebar fixed inset-y-0 left-0 z-40 hidden w-[248px] flex-col border-r border-[#18313b]/10 bg-[#f8f6f0]/86 px-5 py-6 backdrop-blur-2xl lg:flex">
        <div className="flex items-center gap-3 px-1">
          <div className="eventforge-mark brand-mark eventforge-mark grid size-10 place-items-center rounded-[14px] bg-ink text-white shadow-[0_10px_24px_rgba(14,40,49,0.18)]">
            <span className="text-[15px] font-black tracking-[-0.08em]">EF</span>
          </div>
          <div>
            <p className="font-display text-[17px] font-bold tracking-[-0.04em]">eventforge</p>
            <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-ink/40">{t("brand.tagline")}</p>
          </div>
        </div>


        <nav className="mt-8 flex-1 space-y-7">
          {navGroups.map((group) => (
            <div key={group.label}>
              <p className="mb-2 px-2 text-[10px] font-black uppercase tracking-[0.17em] text-ink/35">{group.label}</p>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeNav === item.route;
                  return (
                    <button
                      key={item.label}
                      onClick={() => {
                        setActiveNav(item.route);
                        if (item.route === "overview") navigate("/organizer");
                        else navigate(`/organizer/${item.route}`);
                        setShowMobileNav(false);
                      }}
                      className={`nav-item group flex w-full items-center gap-3 rounded-[13px] px-3 py-2.5 text-left text-[13px] font-semibold transition ${isActive ? "active bg-ink text-white shadow-[0_8px_18px_rgba(14,40,49,0.16)]" : "text-ink/58 hover:bg-white/75 hover:text-ink"}`}
                    >
                      <Icon className={`size-[17px] ${isActive ? "text-coral" : "text-ink/38 group-hover:text-coral"}`} strokeWidth={isActive ? 2.4 : 1.8} />
                      <span className="flex-1">{item.label}</span>
                      {item.count && <span className={`text-[10px] font-bold ${isActive ? "text-white/55" : "text-ink/35"}`}>{item.count}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          <div>
            <p className="mb-2 px-2 text-[10px] font-black uppercase tracking-[0.17em] text-ink/35">{t("nav.intelligence")}</p>
            <button onClick={() => setShowCopilot(true)} className="nav-item group flex w-full items-center gap-3 rounded-[13px] px-3 py-2.5 text-left text-[13px] font-semibold text-ink/58 transition hover:bg-white/75 hover:text-ink">
              <Sparkles className="size-[17px] text-coral transition group-hover:rotate-12" strokeWidth={1.8} />
              <span className="flex-1">{t("nav.aiCopilot")}</span>
              <span className="rounded-full bg-[#f6c8b5]/60 px-1.5 py-0.5 text-[9px] font-black text-[#9f503d]">{t("chatbot.beta")}</span>
            </button>
          </div>
        </nav>

        <div className="space-y-1.5 border-t border-ink/8 pt-4">
          <button onClick={() => setShowHelp(true)} className="flex w-full items-center gap-3 rounded-[13px] px-3 py-2 text-[12px] font-semibold text-ink/50 transition hover:bg-white/80 hover:text-ink">
            <CircleHelp className="size-4 text-ink/35" strokeWidth={1.8} />
            {t('nav.helpCenter')}
          </button>
          <button onClick={handleLogout} className="flex w-full items-center gap-3 rounded-[13px] px-3 py-2 text-[12px] font-semibold text-ink/50 transition hover:bg-white/80 hover:text-ink">
            <LogOut className="size-4 text-ink/35" strokeWidth={1.8} />
            {t('nav.logOut')}
          </button>
          <div className="mt-4 flex items-center gap-3 rounded-[15px] bg-[#e5eee9]/70 p-2.5">
            <div className="grid size-8 place-items-center rounded-full bg-[#c5d9cb] text-[11px] font-black text-ink">{initials}</div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[11px] font-bold">{userName}</p>
              <p className="truncate text-[10px] text-ink/45">{userRoleLabel}</p>
            </div>
            <MoreHorizontal className="size-4 text-ink/35" />
          </div>
        </div>
      </aside>

      {showMobileNav && <div className="fixed inset-0 z-50 lg:hidden" onClick={() => setShowMobileNav(false)}><div className="absolute inset-0 bg-ink/25 backdrop-blur-sm" /><aside onClick={(event) => event.stopPropagation()} className="relative flex h-full w-[min(86vw,300px)] flex-col overflow-y-auto border-r border-white/80 bg-[#f8f6f0]/95 px-5 py-6 shadow-[18px_0_48px_rgba(14,40,49,0.18)] backdrop-blur-2xl"><div className="flex items-center justify-between px-1"><div className="flex items-center gap-3"><div className="eventforge-mark grid size-10 place-items-center rounded-[14px] bg-ink text-white shadow-[0_10px_24px_rgba(14,40,49,0.18)]"><span className="text-[15px] font-black tracking-[-0.08em]">EF</span></div><div><p className="font-display text-[17px] font-bold tracking-[-0.04em]">eventforge</p><p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-ink/40">{t("brand.tagline")}</p></div></div><button aria-label={t("nav.backToHome")} onClick={() => setShowMobileNav(false)} className="grid size-9 place-items-center rounded-full bg-white/70 text-ink/55"><X className="size-4" /></button></div><nav className="mt-8 flex-1 space-y-7">{navGroups.map((group) => <div key={group.label}><p className="mb-2 px-2 text-[10px] font-black uppercase tracking-[0.17em] text-ink/35">{group.label}</p><div className="space-y-1">{group.items.map((item) => { const Icon = item.icon; const isActive = activeNav === item.route; return <button key={item.label} onClick={() => { setActiveNav(item.route); if (item.route === "overview") navigate("/organizer"); else navigate(`/organizer/${item.route}`); setShowMobileNav(false); }} className={`group flex w-full items-center gap-3 rounded-[13px] px-3 py-2.5 text-left text-[13px] font-semibold transition ${isActive ? "active bg-ink text-white shadow-[0_8px_18px_rgba(14,40,49,0.16)]" : "text-ink/58 hover:bg-white/75 hover:text-ink"}`}><Icon className={`size-[17px] ${isActive ? "text-coral" : "text-ink/38 group-hover:text-coral"}`} strokeWidth={isActive ? 2.4 : 1.8} /><span className="flex-1">{item.label}</span>{item.count && <span className={`text-[10px] font-bold ${isActive ? "text-white/55" : "text-ink/35"}`}>{item.count}</span>}</button>; })}</div></div>)}<div><p className="mb-2 px-2 text-[10px] font-black uppercase tracking-[0.17em] text-ink/35">{t("nav.intelligence")}</p><button onClick={() => { setShowMobileNav(false); setShowCopilot(true); }} className="group flex w-full items-center gap-3 rounded-[13px] px-3 py-2.5 text-left text-[13px] font-semibold text-ink/58 transition hover:bg-white/75 hover:text-ink"><Sparkles className="size-[17px] text-coral" strokeWidth={1.8} /><span className="flex-1">{t("nav.aiCopilot")}</span><span className="rounded-full bg-[#f6c8b5]/60 px-1.5 py-0.5 text-[9px] font-black text-[#9f503d]">{t("chatbot.beta")}</span></button></div></nav><div className="space-y-1.5 border-t border-ink/8 pt-4"><button onClick={() => { setShowMobileNav(false); setShowHelp(true); }} className="flex w-full items-center gap-3 rounded-[13px] px-3 py-2 text-[12px] font-semibold text-ink/50 hover:bg-white/80"><CircleHelp className="size-4 text-ink/35" strokeWidth={1.8} />{t("nav.helpCenter")}</button><button onClick={handleLogout} className="flex w-full items-center gap-3 rounded-[13px] px-3 py-2 text-[12px] font-semibold text-ink/50 hover:bg-white/80"><LogOut className="size-4 text-ink/35" strokeWidth={1.8} />{t("nav.logOut")}</button><div className="mt-4 flex items-center gap-3 rounded-[15px] bg-[#e5eee9]/70 p-2.5"><div className="grid size-8 place-items-center rounded-full bg-[#c5d9cb] text-[11px] font-black text-ink">{initials}</div><div className="min-w-0 flex-1"><p className="truncate text-[11px] font-bold">{userName}</p><p className="truncate text-[10px] text-ink/45">{userRoleLabel}</p></div><MoreHorizontal className="size-4 text-ink/35" /></div></div></aside></div>}
      <main className="min-h-screen lg:pl-[248px]">
        <header className="topbar flex items-center justify-between gap-4 px-5 py-5 sm:px-8 lg:px-11">
          <div className="flex items-center gap-3 lg:hidden">
            <button aria-label="Open navigation" onClick={() => setShowMobileNav(true)} className="grid size-9 place-items-center rounded-[12px] border border-white/80 bg-white/60 text-ink shadow-sm"><Menu className="size-[17px]" /></button>
            <div className="eventforge-mark grid size-9 place-items-center rounded-[12px] bg-ink text-[11px] font-black text-white">EF</div>
            <span className="font-display font-bold tracking-[-0.04em]">eventforge</span>
          </div>
          <div className="hidden items-center gap-2 text-[12px] font-semibold text-ink/40 lg:flex">
            <span>EventForge</span><ChevronRight className="size-3.5" /><span className="text-ink">{t("nav.overview")}</span>
          </div>
          <div className="flex flex-1 items-center justify-end gap-2 sm:gap-3">
            <button onClick={handleExportReport} className="hidden h-10 items-center gap-2 rounded-[13px] border border-ink/8 bg-white/65 px-3 text-[11px] font-black text-ink/65 transition hover:-translate-y-0.5 hover:bg-white sm:flex"><FileText className="size-3.5 text-coral" /> {t("dashboard.generateReport")}</button>
            <div className="relative hidden w-full max-w-[260px] sm:block">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink/35" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t("dashboard.searchPlaceholder")} className="h-10 w-full rounded-[13px] border border-white/90 bg-white/55 pl-9 pr-10 text-[12px] font-medium outline-none ring-coral/20 transition placeholder:text-ink/35 focus:bg-white/80 focus:ring-4" />
              <kbd className="absolute right-2.5 top-1/2 hidden -translate-y-1/2 items-center gap-0.5 rounded-md border border-ink/10 bg-white/70 px-1.5 py-0.5 text-[9px] font-bold text-ink/30 md:flex"><Command className="size-2.5" />K</kbd>
            </div>
            <button aria-label="Search" onClick={() => setShowCommand(true)} className="grid size-10 place-items-center rounded-[13px] border border-white/90 bg-white/55 text-ink/55 transition hover:-translate-y-0.5 hover:bg-white sm:hidden"><Search className="size-[17px]" /></button>
            <button aria-label="Notifications" onClick={() => setShowNotifications((value) => !value)} className="relative grid size-11 place-items-center rounded-[13px] border border-white/90 bg-white/55 text-ink/55 transition hover:-translate-y-0.5 hover:bg-white"><Bell className="size-[17px]" /><span className="absolute right-2.5 top-2.5 size-1.5 rounded-full bg-coral ring-2 ring-[#f8f6f0]" /></button>
            <button onClick={() => navigate("/organizer/events")} className="hidden h-10 items-center gap-2 rounded-[13px] bg-coral px-4 text-[12px] font-black text-ink shadow-[0_9px_18px_rgba(240,123,103,0.22)] transition hover:-translate-y-0.5 hover:bg-[#f58c79] sm:flex"><Plus className="size-4" /> {t("nav.newEvent")}</button>
          </div>
          {showNotifications && <div className="absolute right-5 top-[76px] z-30 w-[min(92vw,360px)] rounded-[20px] border border-white bg-[#fffdf8]/95 p-4 shadow-[0_22px_48px_rgba(14,40,49,0.16)] backdrop-blur-xl sm:right-8 lg:right-11"><div className="mb-3 flex items-center justify-between"><p className="text-[12px] font-black">{t("dashboard.notifications.title")} <span className="ml-1 rounded-full bg-coral/20 px-1.5 py-0.5 text-[9px] text-[#9f503d]">{overview ? t("dashboard.notifications.live") : t("dashboard.notifications.offline")}</span></p><button onClick={() => setShowNotifications(false)}><X className="size-4 text-ink/35" /></button></div><div className="space-y-3 text-[11px] text-ink/65">{notificationRows.map((row, index) => <p key={index}><span className={`mr-2 inline-block size-1.5 rounded-full ${index === 0 ? "bg-coral" : index === 1 ? "bg-mint" : "bg-lilac"}`} />{row}</p>)}</div></div>}
        </header>

        <div className="px-5 pb-12 sm:px-8 lg:px-11">
          <section className="animate-rise flex flex-col justify-between gap-6 pb-7 pt-3 md:flex-row md:items-end">
            <div>
              <div className="mb-3 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-ink/35"><span className="size-1.5 rounded-full bg-coral" /> {todayLabel}</div>
                            <h1 className="font-display max-w-[650px] text-[clamp(2.35rem,4vw,4.4rem)] font-bold leading-[0.93] tracking-[-0.075em] text-ink">{dayPart}, {firstName}<span className="text-coral">.</span></h1>
              <p className="mt-4 max-w-[490px] text-[13px] leading-6 text-ink/55">{t('dashboard.subtitle')}</p>
            </div>
            <div className="hidden items-center gap-2 md:flex"><span className="size-2 rounded-full bg-[#6db292] shadow-[0_0_0_4px_rgba(109,178,146,0.14)]" /><span className="text-[11px] font-bold text-ink/50">{t("dashboard.allSystems")}</span></div>
          </section>

          <section className="grid gap-4 xl:grid-cols-[1.06fr_1.32fr_0.95fr]">
            <div className="clay-card group relative min-h-[250px] overflow-hidden rounded-[26px] bg-ink p-6 text-white shadow-[0_20px_40px_rgba(14,40,49,0.18)] transition hover:-translate-y-1">
              <div className="absolute -right-12 -top-20 size-48 rounded-full border-[28px] border-white/[0.05] transition duration-500 group-hover:scale-110" />
              <div className="absolute -bottom-20 -left-16 size-48 rounded-full border-[24px] border-coral/20" />
              <div className="relative flex items-start justify-between">{overviewLoading ? (<div className="w-full animate-pulse"><div className="h-3 w-32 rounded-full bg-white/15" /><div className="mt-3 h-8 w-48 rounded-[10px] bg-white/15" /></div>) : overviewError ? (<div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/45">{t("dashboard.nextEvent")}</p><p className="mt-3 max-w-[240px] text-[13px] font-semibold leading-5 text-white/70">{t("dashboard.couldNotLoadEvent")}</p><button onClick={retryOverview} className="mt-3 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-bold text-white/80 transition hover:bg-white/15">{t("dashboard.tryAgain")}</button></div>) : nextEv ? (<div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/45">{t("dashboard.nextEvent")}</p><h2 className="mt-3 max-w-[240px] font-display text-[28px] font-bold leading-[0.98] tracking-[-0.06em]">{nextEv.title}</h2></div>) : (<div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/45">{t("dashboard.nextEventEyebrow")}</p><h2 className="mt-3 max-w-[240px] font-display text-[28px] font-bold leading-[0.98] tracking-[-0.06em]">{t("dashboard.noEvents")}</h2></div>)}<span className="rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[10px] font-bold text-white/70">{overviewLoading ? "…" : nextEv ? daysUntilLabel(nextEv.daysUntil) : "—"}</span></div>
              <div className="relative mt-8 flex items-end justify-between">{overviewLoading ? (<div className="w-full animate-pulse"><div className="h-3 w-24 rounded-full bg-white/15" /><div className="mt-2 h-3 w-40 rounded-full bg-white/10" /></div>) : nextEv && nextEvValid ? (<div><p className="text-[12px] font-semibold text-white/60">{nextEvValid.toLocaleDateString("en-US", { month: "short", day: "numeric" })} · {nextEv.registered.toLocaleString("en-US")} registered</p><p className="mt-1 flex items-center gap-1.5 text-[11px] text-white/40"><MapPin className="size-3" /> {nextEv.venueName}{nextEv.city ? ` · ${nextEv.city}` : ""}</p></div>) : (<div><p className="text-[12px] font-semibold text-white/60">{t("dates.tba")}</p><p className="mt-1 flex items-center gap-1.5 text-[11px] text-white/40"><MapPin className="size-3" /> {t("dashboard.venueTba")}</p></div>)}<button aria-label={t("dashboard.events.selected")} onClick={() => setShowEventDetails(true)} className="grid size-9 place-items-center rounded-full bg-coral text-ink transition hover:rotate-[-45deg]"><ArrowUpRight className="size-4" /></button></div>
            </div>

            <div className="glass-card rounded-[26px] p-5 shadow-[0_14px_34px_rgba(47,59,61,0.07)] sm:p-6">
              <div className="flex items-start justify-between">{overviewLoading ? (<div className="animate-pulse"><div className="h-3 w-36 rounded-full bg-ink/10" /><div className="mt-3 h-9 w-28 rounded-[10px] bg-ink/10" /><div className="mt-2 h-3 w-40 rounded-full bg-ink/5" /></div>) : overviewError ? (<div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-ink/38">{t("dashboard.velocity.title")}</p><p className="mt-2 text-[12px] font-semibold text-ink/55">Could not load analytics.</p><button onClick={retryOverview} className="mt-2 rounded-full bg-ink px-3 py-1.5 text-[10px] font-bold text-white transition hover:bg-[#264c59]">{t("dashboard.tryAgain")}</button></div>) : (<div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-ink/38">Registration velocity</p><div className="mt-2 flex items-end gap-3"><span className="font-display text-[34px] font-bold tracking-[-0.07em]">{formatCount(overview?.velocity?.totalThisMonth ?? 0)}</span><span className={`mb-1.5 inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-black ${velocityUp ? "bg-[#e4f2e9] text-[#39825f]" : "bg-[#fbe7e1] text-[#a65745]"}`}>{velocityUp ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />} {Math.abs(overview?.velocity?.pctChange ?? 0).toFixed(1)}%</span></div><p className="mt-1 text-[11px] text-ink/45">{t("dashboard.velocity.subtitle")}</p></div>)}<button onClick={handleExportReport} className="grid size-9 place-items-center rounded-full bg-white/80 text-ink/45 transition hover:bg-white hover:text-ink"><Download className="size-4" /></button></div>
              {overviewLoading ? (<div className="mt-7 flex h-[94px] items-end gap-1.5 sm:gap-2">{Array.from({ length: 14 }).map((_, index) => <div key={index} className="flex h-full flex-1 animate-pulse items-end"><div className="w-full rounded-t-[6px] bg-ink/8" style={{ height: `${24 + ((index * 37) % 60)}%` }} /></div>)}</div>) : overviewError ? (<div className="mt-7 flex h-[94px] items-center justify-center rounded-[14px] border border-dashed border-ink/10 text-[11px] text-ink/45">{t("dashboard.couldNotLoad")}</div>) : (<div className="mt-7 flex h-[94px] items-end gap-1.5 sm:gap-2">{velocityBars.map((bar, index) => <div key={overview?.velocity?.daily[index]?.date ?? index} className="group relative flex h-full flex-1 items-end"><div className={`w-full rounded-t-[6px] transition duration-300 group-hover:opacity-80 ${index === velocityBars.length - 1 ? "bg-coral" : index > 8 ? "bg-[#d2e2d8]" : "bg-[#e9eeea]"}`} style={{ height: `${bar}%` }} /></div>)}</div>)}
              <div className="mt-3 flex justify-between text-[9px] font-bold uppercase tracking-[0.13em] text-ink/30"><span>{overview?.velocity?.daily[0] ? shortDayLabel(overview.velocity.daily[0].date) : "—"}</span><span>{overview?.velocity?.daily.length ? shortDayLabel(overview.velocity.daily[overview.velocity.daily.length - 1].date) : "—"}</span></div>
            </div>

            <div className="robot-card relative min-h-[250px] overflow-hidden rounded-[26px] border border-[#f6c8b5]/35 bg-[radial-gradient(circle_at_78%_18%,rgba(255,255,255,.56),transparent_28%),linear-gradient(135deg,#f8d5c7_0%,#f6c8b5_52%,#efb5a7_100%)] shadow-[0_18px_38px_rgba(174,106,84,0.16)]">
              <div className="absolute -left-16 -top-20 size-56 rounded-full border-[28px] border-white/20" />
              <div className="absolute -bottom-24 -left-12 size-48 rounded-full border-[22px] border-white/15" />
              <div className="spline-wrap absolute -bottom-16 -left-4 right-[-4%] top-[-12px] sm:-bottom-20 sm:left-1 sm:right-[-2%]"><Spline scene="https://prod.spline.design/mXCAfS3klVZAt7Nm/scene.splinecode" /></div>
              <div className="spline-watermark-mask absolute inset-x-0 bottom-0 z-20 h-[44px] bg-gradient-to-t from-[#efb5a7] via-[#efb5a7]/95 to-transparent" />
            </div>
          </section>

          <section className="mt-5 grid gap-5 lg:grid-cols-[1.35fr_0.65fr]">
            <div className="glass-card rounded-[26px] p-5 shadow-[0_14px_34px_rgba(47,59,61,0.06)] sm:p-6">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div><div className="flex items-center gap-2"><h2 className="font-display text-[21px] font-bold tracking-[-0.055em]">{t("dashboard.events.title")}</h2><span className="rounded-full bg-ink/7 px-2 py-0.5 text-[10px] font-black text-ink/45">{eventsLoading ? "…" : `${String(events.length).padStart(2, "0")} total`}</span></div><p className="mt-1.5 text-[11px] text-ink/45">{t("dashboard.events.subtitle")}</p></div><div className="flex items-center gap-2"><button onClick={() => setShowFilters((value) => !value)} className="flex h-9 items-center gap-2 rounded-[11px] border border-ink/8 bg-white/55 px-3 text-[11px] font-bold text-ink/55 transition hover:bg-white"><Filter className="size-3.5" /> {t("nav.filter")}</button><button onClick={() => setShowAllEvents((value) => !value)} className="flex h-9 items-center gap-1.5 rounded-[11px] bg-ink px-3 text-[11px] font-bold text-white transition hover:bg-[#264c59]">{showAllEvents ? t("nav.collapse") : t("nav.viewAll")}<ChevronRight className="size-3.5" /></button></div></div>
              {showFilters && <div className="mb-4 flex flex-wrap items-center gap-2 rounded-[14px] border border-ink/7 bg-white/55 p-3 text-[10px] font-bold text-ink/55"><span className="mr-1 text-ink/40">Filter:</span><button onClick={() => { setEventSort("all"); setShowFilters(false); }} className="rounded-full bg-ink px-2.5 py-1 text-white">{t("dashboard.events.allEvents")}</button><button onClick={() => { setEventSort("readiness"); setShowFilters(false); }} className="rounded-full bg-white px-2.5 py-1 hover:bg-coral/20">{t("dashboard.events.highestReadiness")}</button><button onClick={() => { setEventSort("date"); setShowFilters(false); }} className="rounded-full bg-white px-2.5 py-1 hover:bg-coral/20">{t("dashboard.events.soonestDate")}</button><button onClick={() => { setEventSort("all"); setShowFilters(false); }} className="rounded-full bg-white px-2.5 py-1 hover:bg-coral/20">{t("dashboard.events.resetSort")}</button></div>}
              <div className="mt-6 divide-y divide-ink/7">{eventsLoading ? <div className="py-10 text-center text-[12px] text-ink/45">{t("dashboard.events.loading")}</div> : dataError ? <div className="py-10 text-center text-[12px] text-ink/45">{t("dashboard.events.couldNotLoad")} {dataError}</div> : upcomingEvents.length === 0 ? <div className="py-10 text-center text-[12px] text-ink/45">{t("dashboard.events.noEvents")}</div> : upcomingEvents.slice(0, showAllEvents ? 5 : 3).map((event, index) => <button key={`${event.title}-${index}`} onClick={() => { setSelectedEvent(event.title); notify(`${event.title} selected`); }} className={`group flex w-full items-center gap-3 py-3.5 text-left transition first:pt-0 last:pb-0 ${selectedEvent === event.title ? "" : "opacity-85 hover:opacity-100"}`}><div className={`grid size-[47px] shrink-0 place-items-center rounded-[14px] ${event.tone === "coral" ? "bg-[#f6c8b5]" : event.tone === "mint" ? "bg-[#dbece1]" : "bg-[#e8e0f4]"}`}><span className="font-display text-[19px] font-bold leading-none tracking-[-0.07em]">{event.date}</span><span className="mt-0.5 text-[8px] font-black tracking-[0.12em] text-ink/45">{event.month}</span></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="truncate text-[12px] font-black text-ink">{event.title}</p><span className="rounded-full bg-ink/6 px-1.5 py-0.5 text-[9px] font-bold text-ink/45">{event.badge}</span></div><p className="mt-1 flex items-center gap-1 text-[10px] text-ink/45"><MapPin className="size-3" />{event.location}<span className="mx-1 text-ink/20">·</span>{event.meta}</p></div><div className="hidden w-[112px] shrink-0 sm:block"><div className="mb-1.5 flex justify-between text-[9px] font-bold text-ink/35"><span>{t("dashboard.events.readiness")}</span><span>{event.progress}%</span></div><div className="h-1.5 overflow-hidden rounded-full bg-ink/7"><div className={`h-full rounded-full ${event.tone === "coral" ? "bg-coral" : event.tone === "mint" ? "bg-[#8dbea2]" : "bg-[#b5a2d8]"}`} style={{ width: `${event.progress}%` }} /></div></div><ChevronRight className="size-4 text-ink/20 transition group-hover:translate-x-1 group-hover:text-ink/55" /></button>)}</div>
            </div>


            <div className="glass-card rounded-[26px] p-5 shadow-[0_14px_34px_rgba(47,59,61,0.06)] sm:p-6"><div className="flex items-start justify-between"><div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-ink/38">{t("dashboard.runOfShow.title")}</p><h2 className="mt-2 font-display text-[22px] font-bold tracking-[-0.055em]">{overviewLoading ? t('dashboard.runOfShow.loading') : overview?.runOfShow?.dateLabel ?? t('dashboard.runOfShow.noSessions')}</h2></div><button onClick={() => notify(t("dashboard.runOfShow.title"))} className="grid size-9 place-items-center rounded-full bg-white/80 text-ink/45 hover:text-ink"><ListFilter className="size-4" /></button></div><div className="mt-5 space-y-3">{overviewLoading ? <div className="space-y-3 animate-pulse">{[0, 1, 2].map((i) => <div key={i} className="flex items-center gap-3"><div className="h-3 w-[42px] rounded-full bg-ink/10" /><div className="h-10 w-1 rounded-full bg-ink/10" /><div className="flex-1"><div className="h-3 w-3/4 rounded-full bg-ink/10" /><div className="mt-2 h-2.5 w-1/2 rounded-full bg-ink/5" /></div></div>)}</div> : overviewError ? <div className="py-8 text-center text-[11px] text-ink/45">{t("dashboard.couldNotLoadSchedule")} <button onClick={retryOverview} className="font-bold text-ink underline underline-offset-2">{t("dashboard.tryAgain")}</button></div> : runSessions.length === 0 ? <div className="py-8 text-center text-[11px] text-ink/45">{t("dashboard.runOfShow.noSessions")}</div> : runSessions.map((session, index) => <button key={`${session.time}-${session.title}-${index}`} onClick={() => notify(`${session.title} selected`)} className="group flex w-full items-center gap-3 text-left"><span className="w-[42px] text-[10px] font-black text-ink/40">{session.time}</span><span className="h-10 w-1 rounded-full" style={{ backgroundColor: session.color }} /><span className="min-w-0 flex-1"><span className="block truncate text-[11px] font-black text-ink">{session.title}</span><span className="mt-0.5 block text-[10px] text-ink/45">{session.room} · {session.type}</span></span><ChevronRight className="size-3.5 text-ink/25 transition group-hover:translate-x-1" /></button>)}</div></div>
          </section>

        </div>
      </main>

      {showHelp && <div className="fixed inset-0 z-[70] flex items-end justify-end bg-ink/15 px-4 pb-4 backdrop-blur-sm sm:items-center sm:justify-center" onClick={() => { setShowHelp(false);
      }}><div className="w-full max-w-[460px] rounded-[24px] border border-white bg-[#fffdf8]/95 p-5 shadow-[0_24px_70px_rgba(14,40,49,0.24)]" onClick={(event) => event.stopPropagation()}><div className="flex items-start justify-between"><div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-coral">{t("brand.name")} support</p><h2 className="mt-1 font-display text-[28px] font-bold tracking-[-0.07em]">{t("dashboard.help.howCanWeHelp")}</h2><p className="mt-2 text-[11px] text-ink/50">{t("dashboard.help.reachTeam")}</p></div><button aria-label={t("nav.helpCenter")} onClick={() => setShowHelp(false)} className="grid size-8 place-items-center rounded-full bg-ink/5 text-ink/45"><X className="size-4" /></button></div><div className="mt-5 grid gap-2 sm:grid-cols-2"><a href="mailto:support@eventforge.app" className="rounded-[14px] bg-[#e5eee9] p-3"><p className="text-[10px] font-black uppercase tracking-[0.12em] text-ink/40">{t("dashboard.help.emailSupport")}</p><p className="mt-1 text-[11px] font-black">support@eventforge.app</p></a><a href="tel:+18005550184" className="rounded-[14px] bg-[#f6c8b5]/60 p-3"><p className="text-[10px] font-black uppercase tracking-[0.12em] text-ink/40">{t("dashboard.help.callUs")}</p><p className="mt-1 text-[11px] font-black">+1 (800) 555-0184</p></a></div><div className="mt-5 space-y-2"><p className="text-[10px] font-black uppercase tracking-[0.14em] text-ink/40">{t("dashboard.help.faqTitle")}</p>{[{ q: t("dashboard.help.faq1.question"), a: t("dashboard.help.faq1.answer") }, { q: t("dashboard.help.faq2.question"), a: t("dashboard.help.faq2.answer") }, { q: t("dashboard.help.faq3.question"), a: t("dashboard.help.faq3.answer") }].map((faq) => <details key={faq.q} className="rounded-[12px] border border-ink/8 bg-white/60 px-3 py-2.5"><summary className="cursor-pointer text-[11px] font-bold">{faq.q}</summary><p className="mt-2 text-[10px] leading-5 text-ink/55">{faq.a}</p></details>)}</div></div></div>}
      <ChatbotPanel
        eventTitle={selectedEvent}
        open={showCopilot}
        onOpenChange={setShowCopilot}
      />

      {showEventDetails && <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/25 px-4 py-8 backdrop-blur-sm" onClick={() => setShowEventDetails(false)}><div className="w-full max-w-[640px] overflow-hidden rounded-[26px] border border-white bg-[#fffdf8]/95 shadow-[0_26px_70px_rgba(14,40,49,0.24)]" onClick={(event) => event.stopPropagation()}><div className="relative overflow-hidden bg-ink px-6 py-7 text-white sm:px-8"><div className="absolute -right-12 -top-20 size-48 rounded-full border-[28px] border-white/[0.06]" /><div className="relative flex items-start justify-between"><div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-coral">{t("dashboard.nextEvent")}</p><h2 className="mt-2 max-w-[420px] font-display text-[30px] font-bold leading-[0.95] tracking-[-0.07em]">{nextEv?.title ?? t("dashboard.noEvents")}</h2><p className="mt-3 text-[12px] text-white/60">{nextEvValid ? nextEvValid.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : t("dates.tba")}{nextEv ? ` · ${nextEv.venueName || t("dashboard.venueTba")}${nextEv.city ? ` · ${nextEv.city}` : ""}` : ""}</p></div><button aria-label={t("nav.backToHome")} onClick={() => setShowEventDetails(false)} className="grid size-9 place-items-center rounded-full bg-white/10 text-white/65 hover:bg-white/15"><X className="size-4" /></button></div></div><div className="grid gap-6 p-6 sm:grid-cols-[1fr_0.84fr] sm:p-8"><div><p className="text-[11px] leading-6 text-ink/60">{nextEv ? `${nextEv.title} — ${nextEv.registered} registered of ${nextEv.capacity} seats, ${daysUntilLabel(nextEv.daysUntil)} to go. Open the session plan for the full run of show.` : t("dashboard.events.noEvents")}</p><div className="mt-6 grid grid-cols-2 gap-3"><div className="rounded-[15px] bg-[#f6c8b5]/55 p-3"><p className="text-[9px] font-black uppercase tracking-[0.12em] text-ink/40">{t("dashboard.stats.attention")}</p><p className="mt-1 font-display text-[22px] font-bold tracking-[-0.06em]">{nextEv ? formatCount(nextEv.registered) : "—"}</p><p className="text-[10px] text-ink/45">of {nextEv ? formatCount(nextEv.capacity) : "—"} seats</p></div><div className="rounded-[15px] bg-[#e5eee9] p-3"><p className="text-[9px] font-black uppercase tracking-[0.12em] text-ink/40">Programming</p><p className="mt-1 font-display text-[22px] font-bold tracking-[-0.06em]">{runSessions.length}</p><p className="text-[10px] text-ink/45">sessions on the run of show</p></div></div></div><div className="rounded-[18px] bg-ink/5 p-4"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-ink/40">Run of show</p><div className="mt-3 space-y-3">{runSessions.slice(0, 3).map((item) => <div key={`${item.time}-${item.title}`} className="flex items-center gap-3"><span className="w-9 text-[10px] font-black text-ink/40">{item.time}</span><span className="h-6 w-1 rounded-full bg-coral" /><span className="text-[11px] font-bold text-ink/70">{item.title}</span></div>)}{!runSessions.length && <p className="text-[11px] text-ink/45">No sessions scheduled yet.</p>}</div><button onClick={() => { setShowEventDetails(false); navigate("/organizer/sessions"); }} className="mt-5 flex w-full items-center justify-center gap-2 rounded-[11px] bg-ink py-2.5 text-[11px] font-black text-white hover:bg-[#264c59]">Open session plan <ArrowUpRight className="size-3.5" /></button></div></div></div></div>}
      {showCommand && <div className="fixed inset-0 z-50 flex items-start justify-center bg-ink/20 px-4 pt-[18vh] backdrop-blur-sm" onClick={() => setShowCommand(false)}><div className="w-full max-w-[520px] rounded-[22px] border border-white bg-[#fffdf8]/95 p-3 shadow-[0_26px_70px_rgba(14,40,49,0.22)]" onClick={(event) => event.stopPropagation()}><div className="flex items-center gap-3 border-b border-ink/8 px-3 pb-3"><Search className="size-4 text-ink/40" /><input autoFocus placeholder={t("dashboard.commandPalette.placeholder")} className="h-8 flex-1 bg-transparent text-sm outline-none placeholder:text-ink/35" /><kbd className="rounded-md bg-ink/6 px-1.5 py-0.5 text-[9px] font-bold text-ink/40">ESC</kbd></div><div className="space-y-1 p-2"><p className="px-2 py-2 text-[9px] font-black uppercase tracking-[0.16em] text-ink/35">{t("dashboard.commandPalette.quickActions")}</p>{[{ label: t("dashboard.commandPalette.createEvent"), icon: Plus }, { label: t("dashboard.commandPalette.openCheckIn"), icon: QrCode }, { label: t("dashboard.commandPalette.askAI"), icon: Sparkles }].map(({ label, icon: Icon }) => <button key={label} onClick={() => { setShowCommand(false); notify(label); }} className="flex w-full items-center gap-3 rounded-[12px] px-2 py-2.5 text-left text-[12px] font-bold text-ink/70 hover:bg-ink/5 hover:text-ink"><span className="grid size-7 place-items-center rounded-lg bg-[#f6c8b5]/60"><Icon className="size-3.5 text-[#a65745]" /></span>{label}<ArrowUpRight className="ml-auto size-3.5 text-ink/25" /></button>)}</div></div></div>}
    </div>
  );
}

void Check;
void Megaphone;
void LifeBuoy;
