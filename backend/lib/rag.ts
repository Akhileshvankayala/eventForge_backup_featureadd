import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { ObjectId } from "mongodb";
import { getCollection } from "../db.js";

// ─── EventForge RAG: retrieval + intent reasoning over guide + live data ─────
// Pipeline per question:
//   1. normalize (lowercase, synonyms, Porter stemming, unigrams + bigrams)
//   2. retrieve top chunks with field-weighted TF-IDF cosine
//      (heading ×3, lead sentence ×2, body ×1)
//   3. route intent (COUNT/LIST/HOWTO/STATUS/GENERIC) and resolve structured
//      answers directly from live records — computed, never hallucinated
//   4. compose an extractive answer with named sources + confidence fallback

export interface Chunk {
  id: string;
  source: "guide" | "live";
  heading: string;
  text: string;
}

export interface HistoryTurn {
  role: "user" | "assistant";
  text: string;
}

const DIR = dirname(fileURLToPath(import.meta.url));
const GUIDE_PATH = join(DIR, "..", "knowledge", "guide.md");

// ─── Text normalization ──────────────────────────────────────────────────────

const STOP = new Set(
  "the,a,an,and,or,for,with,from,that,this,these,those,are,was,were,has,have,had,will,would,can,its,you,your,yours,our,they,them,their,what,when,where,which,who,how,why,not,but,all,any,each,into,than,then,there,here,about,also,does,doing,done,over,such,very,just,like,get,got,need,want,know,tell,give,does,please,thanks".split(",")
);

// Canonical synonym normalization, applied to BOTH queries and documents so
// "summit" and "event" (or "pass" and "ticket") always match each other.
const CANON: Record<string, string> = {
  summit: "event", conference: "event", meetup: "event", gathering: "event", show: "event",
  pass: "ticket", admission: "ticket", seat: "ticket",
  booking: "registration", signup: "registration", rsvp: "registration", register: "registration",
  guest: "attendee", participant: "attendee", registrant: "attendee", member: "attendee", attend: "attendee",
  presenter: "speaker", keynote: "speaker", panelist: "speaker", host: "speaker",
  talk: "session", workshop: "session", panel: "session", agenda: "session", schedule: "session",
  slot: "session", timetable: "session", program: "session",
  room: "venue", hall: "venue", location: "venue", place: "venue", site: "venue",
  partner: "sponsor", backer: "sponsor",
  scan: "checkin", qr: "checkin", entry: "checkin", arrival: "checkin",
  waiting: "waitlist", queue: "waitlist",
  launch: "publish", release: "publish", announce: "publish", live: "publish", visible: "publish",
  delete: "cancel", remove: "cancel", refund: "cancel",
  cost: "price", fee: "price", charge: "price", discount: "price", coupon: "price", promo: "price", offer: "price",
  seats: "capacity", size: "capacity", limit: "capacity", soldout: "capacity", full: "capacity",
};

// Compact Porter stemmer (standard algorithm, abbreviated constants).
function stem(word: string): string {
  if (word.length < 4) return word;
  let w = word;
  const step1 = () => {
    if (w.endsWith("sses")) w = w.slice(0, -2);
    else if (w.endsWith("ies")) w = w.slice(0, -2) + "i";
    else if (w.endsWith("ss")) return;
    else if (w.endsWith("s")) w = w.slice(0, -1);
    if (w.endsWith("eed")) {
      if (measure(w.slice(0, -3)) > 0) w = w.slice(0, -1);
    } else if (/(at|bl|iz)$/.test(w)) w += "e";
    else if (/(ed|ing)$/.test(w)) {
      const base = w.replace(/(ed|ing)$/, "");
      if (/[aeiou]/.test(base)) {
        w = base;
        if (/(at|bl|iz)$/.test(w)) w += "e";
        else if (/([^aeiou])\1$/.test(w) && !/(l|s|z)$/.test(w)) w = w.slice(0, -1);
        else if (measure(w) === 1 && /[^aeiou][aeiou][^aeiouwxy]$/.test(w)) w += "e";
      }
    }
  };
  const measure = (s: string): number => (s.match(/[aeiou]+[^aeiou]+/g) || []).length;
  step1();
  const step2map: Record<string, string> = {
    ational: "ate", tional: "tion", enci: "ence", anci: "ance", izer: "ize",
    abli: "able", alli: "al", entli: "ent", eli: "e", ousli: "ous",
    ization: "ize", ation: "ate", ator: "ate", alism: "al", iveness: "ive",
    fulness: "ful", ousness: "ous", aliti: "al", iviti: "ive", biliti: "ble",
  };
  for (const k of Object.keys(step2map).sort((a, b) => b.length - a.length)) {
    if (w.endsWith(k) && measure(w.slice(0, -k.length)) > 0) {
      w = w.slice(0, -k.length) + step2map[k];
      break;
    }
  }
  if (w.endsWith("e") && (measure(w.slice(0, -1)) > 1 || (measure(w.slice(0, -1)) === 1 && !/[^aeiou][aeiou][^aeiouwxy]$/.test(w.slice(0, -1))))) {
    w = w.slice(0, -1);
  }
  if (w.endsWith("ll") && measure(w) > 1) w = w.slice(0, -1);
  return w;
}

function rawTokens(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/[\s-]+/)
    .filter((w) => w.length > 2 && !STOP.has(w))
    .map((w) => CANON[w] ?? w);
}

// Unigrams (stemmed) + bigrams. Synonym handling is done by canonicalization
// in rawTokens, so queries and documents always use the same vocabulary.
export function analyze(s: string, _expandSynonyms = false): Map<string, number> {
  const out = new Map<string, number>();
  const add = (t: string, w: number) => out.set(t, (out.get(t) ?? 0) + w);
  const toks = rawTokens(s);
  toks.forEach((t) => add("u:" + stem(t), 1));
  for (let i = 0; i + 1 < toks.length; i++) {
    add("b:" + stem(toks[i]) + "+" + stem(toks[i + 1]), 1.4);
  }
  return out;
}

// ─── Guide chunks ────────────────────────────────────────────────────────────

let guideCache: Chunk[] | null = null;

export function loadGuideChunks(): Chunk[] {
  if (guideCache) return guideCache;
  const md = readFileSync(GUIDE_PATH, "utf-8");
  const chunks: Chunk[] = [];
  let heading = "Overview";
  let buf: string[] = [];
  const flush = () => {
    const text = buf.join("\n").trim();
    if (text) chunks.push({ id: `guide:${heading}`, source: "guide", heading, text });
    buf = [];
  };
  for (const line of md.split("\n")) {
    if (line.startsWith("## ")) {
      flush();
      heading = line.slice(3).trim();
    } else if (line.startsWith("# ")) {
      continue; // document title, not a chunk
    } else {
      buf.push(line);
    }
  }
  flush();
  guideCache = chunks;
  return chunks;
}

export function clearGuideCache(): void {
  guideCache = null;
}

// ─── Field-weighted TF-IDF retrieval ─────────────────────────────────────────

interface ScoredDoc {
  chunk: Chunk;
  score: number;
}

function splitFields(chunk: Chunk): Array<{ text: string; weight: number }> {
  const sentences = chunk.text.split(/(?<=[.!?])\s+/);
  return [
    { text: chunk.heading, weight: 3 },
    { text: sentences[0] ?? "", weight: 2 },
    { text: chunk.text, weight: 1 },
  ];
}

export function retrieve(query: string, docs: Chunk[], topK = 4): ScoredDoc[] {
  const qVec = analyze(query, true);
  // Document frequencies over stemmed unigrams+bigrams in body text.
  const df = new Map<string, number>();
  const docVecs = docs.map((d) => {
    const v = analyze(`${d.heading}\n${d.text}`, false);
    Array.from(new Set(v.keys())).forEach((t) => df.set(t, (df.get(t) ?? 0) + 1));
    return v;
  });
  const N = docs.length;
  const idf = (t: string) => Math.log((N + 1) / ((df.get(t) ?? 0) + 1)) + 1;
  const weight = (t: string, c: number) => (t.startsWith("b:") ? c * 2 : c) * idf(t);
  let qSum = 0;
  const qw = new Map<string, number>();
  qVec.forEach((c, t) => {
    const w = weight(t, c);
    qw.set(t, w);
    qSum += w * w;
  });
  const qNorm = Math.sqrt(qSum) || 1;

  return docs
    .map((chunk, i) => {
      // Field-weighted document vector.
      const dv = new Map<string, number>();
      splitFields(chunk).forEach((f) => {
        analyze(f.text, false).forEach((c, t) => {
          dv.set(t, (dv.get(t) ?? 0) + c * f.weight);
        });
      });
      let dot = 0;
      qw.forEach((w, t) => {
        dot += w * (weight(t, dv.get(t) ?? 0) / (idf(t) || 1));
      });
      let dSum = 0;
      dv.forEach((c, t) => {
        const w = weight(t, c) / (idf(t) || 1);
        dSum += w * w;
      });
      return { chunk, score: dot / ((qNorm * Math.sqrt(dSum)) || 1) / (idf("__x") || 1) };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

// ─── Live per-user snapshot ──────────────────────────────────────────────────

export interface SnapshotUser {
  id: string;
  role: string;
  name: string;
  email: string;
}

export interface LiveContext {
  chunks: Chunk[];
  events: any[];
  attendees: any[];
  sessions: any[];
  ticketTypes: any[];
  staffSide: boolean;
  isAdmin: boolean;
}

export async function buildLiveContext(user: SnapshotUser): Promise<LiveContext> {
  const isAdmin = user.role === "admin";
  const staffSide = isAdmin || user.role === "organizer" || user.role === "staff";

  let eventFilter: Record<string, unknown> = { status: "published", visibility: "public" };
  if (isAdmin) eventFilter = {};
  else if (staffSide) eventFilter = { organizerId: new ObjectId(user.id) };

  const events = (await getCollection("events").find(eventFilter).sort({ startDate: 1 }).toArray()) as any[];
  const eventIds = events.map((e) => e._id);
  const chunks: Chunk[] = [];

  if (!events.length) {
    chunks.push({
      id: "live:events",
      source: "live",
      heading: staffSide ? "Your events right now" : "Events right now",
      text: staffSide && !isAdmin
        ? `${user.name} has not created any events yet. Use Events → Add event, then publish it so attendees can discover it.`
        : "There are no published events right now.",
    });
    return { chunks, events, attendees: [], sessions: [], ticketTypes: [], staffSide, isAdmin };
  }

  const [attendees, sessions, ticketTypes] = await Promise.all([
    getCollection("attendees").find({ eventId: { $in: eventIds } }).toArray() as Promise<any[]>,
    getCollection("sessions").find({ eventId: { $in: eventIds } }).sort({ startTime: 1 }).toArray() as Promise<any[]>,
    getCollection("ticketTypes").find({ eventId: { $in: eventIds } }).toArray() as Promise<any[]>,
  ]);

  for (const e of events) {
    const eid = e._id.toString();
    const evAtt = attendees.filter((a) => a.eventId?.toString() === eid);
    const evSes = sessions.filter((s) => s.eventId?.toString() === eid);
    const evTix = ticketTypes.filter((t) => t.eventId?.toString() === eid);
    const approved = evAtt.filter((a) => ["approved", "completed"].includes(a.registrationStatus)).length;
    const pending = evAtt.filter((a) => a.registrationStatus === "pending").length;
    const waitlisted = evAtt.filter((a) => a.registrationStatus === "waitlisted").length;
    const lines = [
      `${e.title} (${e.type || "event"}, status ${e.status}, visibility ${e.visibility || "public"}).`,
      `Dates: ${new Date(e.startDate).toISOString().slice(0, 10)} → ${new Date(e.endDate).toISOString().slice(0, 10)}. Capacity ${e.capacity ?? "TBA"}.`,
      `Registrations: ${evAtt.length} total — ${approved} approved or completed, ${pending} pending approval, ${waitlisted} waitlisted.`,
      evSes.length
        ? `Sessions (${evSes.length}): ` + evSes.map((s) => `${s.title} (${s.roomName || "room TBA"}, ${s.startTime ? new Date(s.startTime).toISOString().slice(11, 16) : "time TBA"}, ${s.type || "session"})`).join("; ") + "."
        : "No sessions scheduled yet.",
      evTix.length
        ? `Ticket types: ` + evTix.map((t) => `${t.name} ($${t.price}, ${t.remainingQuantity ?? "?"} left)`).join("; ") + "."
        : "No ticket types configured yet.",
    ];
    if (staffSide) {
      const missing = evSes.filter((s) => !s.speakerIds?.length).map((s) => s.title);
      if (missing.length) lines.push(`Needs attention: sessions without speakers — ${missing.join(", ")}.`);
      if (pending) lines.push(`Needs attention: ${pending} registration(s) awaiting approval.`);
    }
    chunks.push({ id: `live:event:${eid}`, source: "live", heading: e.title, text: lines.join("\n") });
  }

  if (!staffSide) {
    const mine = (await getCollection("attendees").find({ email: user.email.toLowerCase() }).toArray()) as any[];
    if (mine.length) {
      const byEvent = new Map<string, any[]>();
      for (const a of mine) {
        const k = a.eventId?.toString() ?? "?";
        if (!byEvent.has(k)) byEvent.set(k, []);
        (byEvent.get(k) as any[]).push(a);
      }
      const lines: string[] = [];
      byEvent.forEach((regs, eid) => {
        const ev = events.find((e) => e._id.toString() === eid);
        lines.push(
          `${ev ? ev.title : "An event"}: ` +
            regs.map((r: any) => `${r.firstName} ${r.lastName} — ${r.registrationStatus}${r.checkedIn ? ", checked in" : ""}`).join("; ") +
            "."
        );
      });
      chunks.push({ id: "live:my-registrations", source: "live", heading: `${user.name}'s registrations`, text: lines.join("\n") });
    } else {
      chunks.push({
        id: "live:my-registrations",
        source: "live",
        heading: `${user.name}'s registrations`,
        text: `${user.name} has no registrations yet. Browse published events and book a ticket to get started.`,
      });
    }
  }
  return { chunks, events, attendees, sessions, ticketTypes, staffSide, isAdmin };
}

// Backwards-compatible wrapper.
export async function buildLiveChunks(user: SnapshotUser): Promise<Chunk[]> {
  return (await buildLiveContext(user)).chunks;
}

// ─── Intent router + structured resolvers ────────────────────────────────────

type Intent = "COUNT" | "LIST" | "HOWTO" | "STATUS" | "GENERIC";

const COUNT_RE = /\b(how many|count|total|number of|how much)\b/i;
const LIST_RE = /\b(list|show|what are|which|name all|all (my|the)|what \w+ (do|can) (i|we) (have|see|attend|join|book))\b/i;
const HOWTO_RE = /\b(how (do|can|to)|steps?|guide|help|why (can't|can\'t|is)|what does \w+ mean)\b/i;
const STATUS_RE = /\b(status|state|pending|approved|waiting|attention|problem|issue|wrong|missing|need)\b/i;

function routeIntent(q: string): Intent {
  if (COUNT_RE.test(q)) return "COUNT";
  if (LIST_RE.test(q)) return "LIST";
  if (HOWTO_RE.test(q)) return "HOWTO";
  if (STATUS_RE.test(q)) return "STATUS";
  return "GENERIC";
}

function fmtDate(d: any): string {
  const dt = new Date(d);
  return Number.isNaN(dt.getTime()) ? "date TBA" : dt.toISOString().slice(0, 10);
}

function resolveStructured(intent: Intent, q: string, ctx: LiveContext, user: SnapshotUser): string | null {
  const ql = q.toLowerCase();
  const wants = {
    events: /event|summit|conference|show/i.test(q),
    attendees: /attendee|guest|regist|people|who/i.test(q),
    sessions: /session|talk|workshop|agenda|schedule|program/i.test(q),
    tickets: /ticket|pass|seat|price|cost|sale/i.test(q),
    speakers: /speaker|presenter|keynote/i.test(q),
    sponsors: /sponsor|partner/i.test(q),
  };
  const interested = Object.keys(wants).filter((k) => (wants as any)[k]);
  const scope = ctx.staffSide && !ctx.isAdmin ? "your events" : ctx.isAdmin ? "the platform" : "published events";

  if (intent === "COUNT") {
    const bits: string[] = [];
    if (!interested.length || wants.events) bits.push(`${ctx.events.length} event(s) in ${scope}`);
    if (!interested.length || wants.attendees) {
      const ap = ctx.attendees.filter((a) => a.registrationStatus === "pending").length;
      const aw = ctx.attendees.filter((a) => a.registrationStatus === "waitlisted").length;
      bits.push(`${ctx.attendees.length} registration(s) (${ap} pending, ${aw} waitlisted)`);
    }
    if (wants.sessions) bits.push(`${ctx.sessions.length} session(s)`);
    if (wants.tickets) {
      const left = ctx.ticketTypes.reduce((a: number, t: any) => a + (t.remainingQuantity ?? 0), 0);
      bits.push(`${left} ticket(s) still available`);
    }
    if (wants.speakers) {
      const ids = new Set(ctx.sessions.flatMap((s: any) => (s.speakerIds || []).map(String)));
      bits.push(`${ids.size} speaker slot(s) assigned`);
    }
    return `Right now: ${bits.join(" · ")}.`;
  }

  if (intent === "LIST") {
    if (wants.sessions || (!interested.length && ctx.sessions.length)) {
      if (!ctx.sessions.length) return "No sessions scheduled yet.";
      return "Sessions:\n" + ctx.sessions.slice(0, 10).map((s: any, i: number) => `${i + 1}. ${s.title} — ${s.roomName || "room TBA"}, ${s.startTime ? new Date(s.startTime).toISOString().slice(11, 16) : "time TBA"}`).join("\n");
    }
    if (wants.attendees && ctx.staffSide) {
      if (!ctx.attendees.length) return "No registrations yet.";
      return "Registrations:\n" + ctx.attendees.slice(0, 10).map((a: any, i: number) => `${i + 1}. ${a.firstName} ${a.lastName} — ${a.registrationStatus}`).join("\n");
    }
    if (!ctx.events.length) return ctx.staffSide ? "You have no events yet. Create one from Events → Add event." : "No published events right now.";
    return "Events:\n" + ctx.events.slice(0, 10).map((e: any, i: number) => `${i + 1}. ${e.title} (${fmtDate(e.startDate)}, ${e.status})`).join("\n");
  }

  if (intent === "STATUS") {
    const pending = ctx.attendees.filter((a) => a.registrationStatus === "pending");
    const waitlisted = ctx.attendees.filter((a) => a.registrationStatus === "waitlisted");
    const noSpeaker = ctx.sessions.filter((s: any) => !s.speakerIds?.length);
    const problems: string[] = [];
    if (pending.length) problems.push(`${pending.length} registration(s) awaiting approval (${pending.slice(0, 3).map((a: any) => `${a.firstName} ${a.lastName}`).join(", ")}${pending.length > 3 ? ", …" : ""})`);
    if (noSpeaker.length) problems.push(`${noSpeaker.length} session(s) without speakers (${noSpeaker.slice(0, 3).map((s: any) => s.title).join(", ")}${noSpeaker.length > 3 ? ", …" : ""})`);
    if (waitlisted.length) problems.push(`${waitlisted.length} attendee(s) on the waitlist`);
    if (!problems.length) return ctx.events.length ? "All clear — nothing needs attention across your events." : "Nothing to report yet — no events, no pending items.";
    return "Needs your attention:\n• " + problems.join("\n• ");
  }

  return null; // HOWTO + GENERIC fall through to extractive composition
}

// ─── Public answer entry point ───────────────────────────────────────────────

export interface Answer {
  text: string;
  sources: Array<{ heading: string; source: "guide" | "live" }>;
}

export async function answer(question: string, user: SnapshotUser, history: HistoryTurn[] = []): Promise<Answer> {
  // Resolve follow-ups ("how many of them?", "and the second one?") by
  // carrying the previous user question's nouns into retrieval.
  const priorNouns = history
    .filter((h) => h.role === "user")
    .slice(-2)
    .map((h) => h.text)
    .join(" ");
  const retrievalQuery = priorNouns ? `${priorNouns}\n${question}` : question;

  const ctx = await buildLiveContext(user);
  const intent = routeIntent(question);
  const structured = intent === "HOWTO" || intent === "GENERIC" ? null : resolveStructured(intent, question, ctx, user);
  if (structured) {
    return {
      text: `${structured}\n\nWant detail on any of these — a specific event, session, or attendee?`,
      sources: [{ heading: "live records", source: "live" as const }],
    };
  }

  const guide = loadGuideChunks();
  const scored = retrieve(retrievalQuery, [...ctx.chunks, ...guide], 3);
  // Possessive/personal questions ("my events", "what do I have") are about
  // live data — bias toward the user's own records.
  const personal = /\b(my|mine|i have|do i|can i|for me)\b/i.test(question);
  const hits = scored.map((h) => ({
    ...h,
    score: h.score + (personal && h.chunk.source === "live" ? 0.12 : 0),
  })).sort((a, b) => b.score - a.score);
  const useful = hits.filter((h) => h.score > 0.015);
  if (!useful.length) {
    return {
      text: "I couldn't find anything in the EventForge guide or your current data about that. Try asking about your events, registrations, tickets, sessions, check-in, or how a workflow works (e.g. \"how do I publish my event?\").",
      sources: [],
    };
  }
  const parts = useful.map((h) => {
    const sentences = h.chunk.text.split(/(?<=[.!?])\s+/).slice(0, 4).join(" ");
    const tag = h.chunk.source === "live" ? "your current data" : "the EventForge guide";
    return `From ${tag} (${h.chunk.heading}):\n${sentences}`;
  });
  return {
    text: `${parts.join("\n\n")}\n\nAnything more specific — a particular event, session, or attendee?`,
    sources: useful.map((h) => ({ heading: h.chunk.heading, source: h.chunk.source })),
  };
}

// Legacy exports (kept for compatibility).
export function composeAnswer(question: string, hits: Array<{ chunk: Chunk; score: number }>): string {
  const useful = hits.filter((h) => h.score > 0.02);
  if (!useful.length) {
    return "I couldn't find anything in the EventForge guide or your current data about that. Try asking about your events, registrations, tickets, sessions, check-in, or how a workflow works (e.g. \"how do I publish my event?\").";
  }
  const parts = useful.map((h) => {
    const sentences = h.chunk.text.split(/(?<=[.!?])\s+/).slice(0, 4).join(" ");
    const tag = h.chunk.source === "live" ? "your current data" : "the EventForge guide";
    return `From ${tag} (${h.chunk.heading}):\n${sentences}`;
  });
  return `${parts.join("\n\n")}\n\nAnything more specific — a particular event, session, or attendee?`;
}
