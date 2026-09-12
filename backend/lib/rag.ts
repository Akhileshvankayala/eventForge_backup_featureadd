import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { ObjectId } from "mongodb";
import { getCollection } from "../db.js";

// ─── RAG: static guide chunks + live user-scoped DB chunks ───────────────────
// Retrieval is TF-IDF cosine similarity over tokens (lexical semantic search).
// The static half mirrors backend/knowledge/guide.md (= guide.pdf content).
// The dynamic half is always read live, so data updates are instantly
// answerable — nothing stale is ever embedded.

export interface Chunk {
  id: string;
  source: "guide" | "live";
  heading: string;
  text: string;
}

const DIR = dirname(fileURLToPath(import.meta.url));
const GUIDE_PATH = join(DIR, "..", "knowledge", "guide.md");

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

function tokens(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP.has(w));
}

const STOP = new Set(
  "the,a,an,and,or,for,with,from,that,this,these,those,are,was,were,has,have,had,will,would,can,its,you,your,our,they,them,their,what,when,where,which,who,how,why,not,but,all,any,each,into,than,then,there,here,about,also,its,it's,does,doing,done,into,over,such,very,just,like,get,got".split(",")
);

function tfidfScores(query: string, docs: Chunk[]): number[] {
  const qTokens = tokens(query);
  const docTokens = docs.map((d) => tokens(`${d.heading}\n${d.text}`));
  const df = new Map<string, number>();
  docTokens.forEach((dt) => {
    Array.from(new Set(dt)).forEach((t) => df.set(t, (df.get(t) ?? 0) + 1));
  });
  const N = docs.length;
  const idf = (t: string) => Math.log((N + 1) / ((df.get(t) ?? 0) + 1)) + 1;
  const qVec = new Map<string, number>();
  qTokens.forEach((t) => qVec.set(t, (qVec.get(t) ?? 0) + 1));
  qVec.forEach((c, t) => qVec.set(t, c * idf(t)));
  let qSum = 0;
  qVec.forEach((w) => { qSum += w * w; });
  const qNorm = Math.sqrt(qSum) || 1;
  return docTokens.map((dt) => {
    const tf = new Map<string, number>();
    dt.forEach((t) => tf.set(t, (tf.get(t) ?? 0) + 1));
    let dot = 0;
    qVec.forEach((w, t) => { dot += w * (tf.get(t) ?? 0) * idf(t); });
    let dSum = 0;
    tf.forEach((c, t) => { dSum += (c * idf(t)) ** 2; });
    const dNorm = Math.sqrt(dSum) || 1;
    return dot / (qNorm * dNorm);
  });
}

export function retrieve(query: string, docs: Chunk[], topK = 3): Array<{ chunk: Chunk; score: number }> {
  const scores = tfidfScores(query, docs);
  return docs
    .map((chunk, i) => ({ chunk, score: scores[i] }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

// ─── Live per-user snapshot (the "PDF gets updated" half) ────────────────────
export interface SnapshotUser {
  id: string;
  role: string;
  name: string;
  email: string;
}

export async function buildLiveChunks(user: SnapshotUser): Promise<Chunk[]> {
  const chunks: Chunk[] = [];
  const isAdmin = user.role === "admin";
  const staffSide = isAdmin || user.role === "organizer" || user.role === "staff";

  let eventFilter: Record<string, unknown> = { status: "published", visibility: "public" };
  if (isAdmin) eventFilter = {};
  else if (staffSide) eventFilter = { organizerId: new ObjectId(user.id) };

  const events = (await getCollection("events").find(eventFilter).sort({ startDate: 1 }).toArray()) as any[];
  const eventIds = events.map((e) => e._id);

  if (!events.length) {
    chunks.push({
      id: "live:events",
      source: "live",
      heading: staffSide ? "Your events right now" : "Events right now",
      text: staffSide && !isAdmin
        ? `${user.name} has not created any events yet. Use Events → Add event, then publish it so attendees can discover it.`
        : "There are no published events right now.",
    });
    return chunks;
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
      `Registrations: ${evAtt.length} total — ${approved} approved/completed, ${pending} pending approval, ${waitlisted} waitlisted.`,
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
  return chunks;
}

// ─── Answer composer (extractive: quotes retrieved chunks, never invents) ────
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
