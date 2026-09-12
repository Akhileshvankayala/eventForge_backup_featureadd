// RAG eval: gold questions with required answer substrings.
// Fixtures: one event + session + ticket + registration, cleaned up after.
const B = "http://localhost:3002";
let pass = 0, fail = 0;
const out = [];
async function t(name, fn) {
  try { const d = await fn(); pass++; out.push(`PASS  ${name}${d ? " — " + d : ""}`); }
  catch (e) { fail++; out.push(`FAIL  ${name} — ${e.message}`); }
}
function assert(c, m) { if (!c) throw new Error(m); }
async function req(method, path, body, token) {
  const r = await fetch(B + path, {
    method,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(20000),
  });
  let json = null;
  try { json = await r.json(); } catch { /* empty */ }
  return { status: r.status, json };
}
const ask = async (token, question, history) => {
  const r = await req("POST", "/api/ai/ask", { question, history, mode: "extractive" }, token);
  assert(r.status === 200, `status=${r.status}`);
  return r.json.text || "";
};
const has = (text, ...needles) => {
  const l = text.toLowerCase();
  const missing = needles.filter((n) => !l.includes(n.toLowerCase()));
  assert(!missing.length, `missing [${missing.join(", ")}] in: ${text.slice(0, 160)}...`);
};
const hasAny = (text, ...needles) => {
  const l = text.toLowerCase();
  assert(needles.some((n) => l.includes(n.toLowerCase())), `none of [${needles.join(", ")}] in: ${text.slice(0, 160)}...`);
};

const AO = (await req("POST", "/api/auth/login", { email: "admin@eventforge.io", password: "password123" })).json.token;
// fixtures as jordan (organizer scope)
const JO = (await req("POST", "/api/auth/login", { email: "jordan@eventforge.io", password: "password123" })).json.token;
const ev = await req("POST", "/api/events", { title: "RAG Eval Summit", slug: "rag-eval-summit", description: "d", startDate: "2026-12-01T09:00:00Z", endDate: "2026-12-01T17:00:00Z", timezone: "UTC", capacity: 80, price: 0, currency: "USD", visibility: "public", status: "published" }, JO);
const EID = ev.json._id;
await req("POST", "/api/sessions", { eventId: EID, title: "Eval Keynote", slug: "eval-keynote", description: "d", type: "Keynote", startTime: "2026-12-01T09:00:00Z", endTime: "2026-12-01T10:00:00Z", duration: 60, timezone: "UTC", capacity: 80 }, JO);
const tt = await req("POST", "/api/tickets", { eventId: EID, name: "Eval Pass", slug: "eval-pass", price: 50, currency: "USD", totalQuantity: 10, salesStart: "2026-01-01T00:00:00Z", salesEnd: "2026-12-31T00:00:00Z" }, JO);
await req("POST", "/api/attendees/register", { eventId: EID, ticketTypeId: tt.json._id, firstName: "Eval", lastName: "User", email: "evaluser@ef.com" }, JO);

// --- organizer: live data questions ---
await t("owns event by name", async () => {
  const a = await ask(JO, "What events do I have?");
  has(a, "RAG Eval Summit"); return "cited";
});
await t("count registrations", async () => {
  const a = await ask(JO, "How many registrations do I have?");
  has(a, "1 registration"); return "computed";
});
await t("list sessions", async () => {
  const a = await ask(JO, "List my sessions");
  has(a, "Eval Keynote"); return "listed";
});
await t("status/attention", async () => {
  const a = await ask(JO, "What needs attention?");
  has(a, "awaiting approval"); return "flagged";
});
await t("synonym: pass -> ticket", async () => {
  const a = await ask(JO, "How many passes are still available?");
  has(a, "9"); return "synonym+count";
});
await t("follow-up with context", async () => {
  const h = [{ role: "user", text: "Tell me about RAG Eval Summit" }];
  const a = await ask(JO, "How many people registered for it?", h);
  has(a, "1 registration"); return "contextual";
});
// --- how-to from guide ---
await t("how to publish", async () => {
  const a = await ask(JO, "How do I publish my event so attendees can find it?");
  has(a, "publish"); return "guide";
});
await t("check-in refused why", async () => {
  const a = await ask(JO, "Why would attendee check-in be refused?");
  has(a, "approved"); return "guide";
});
await t("409 meaning", async () => {
  const a = await ask(JO, "What does a 409 error mean?");
  hasAny(a, "conflict", "duplicate"); return "guide";
});
// --- isolation: other organizer sees nothing of it ---
await t("isolation: sam cannot see it", async () => {
  const SO = (await req("POST", "/api/auth/login", { email: "sam@eventforge.io", password: "password123" })).json.token;
  const a = await ask(SO, "What events do I have?");
  assert(!a.toLowerCase().includes("rag eval summit"), "LEAKED: " + a.slice(0, 160)); return "isolated";
});
// --- attendee perspective ---
await t("attendee sees published event", async () => {
  const reg = await req("POST", "/api/auth/register", { name: "Eval Att", email: "evalatt@ef.com", password: "eval12345", role: "attendee" });
  const a = await ask(reg.json.token, "What events can I attend?");
  has(a, "RAG Eval Summit"); return "visible";
  // cleanup user below
});
// --- graceful unknown ---
await t("unknown topic -> guided fallback", async () => {
  const a = await ask(JO, "What is the capital of Assyria?");
  has(a, "couldn't find"); return "honest";
});
// --- validation ---
await t("empty question -> 400", async () => {
  const r = await req("POST", "/api/ai/ask", { question: "  " }, JO);
  assert(r.status === 400, `status=${r.status}`); return "rejected";
});
await t("no auth -> 401", async () => {
  const r = await req("POST", "/api/ai/ask", { question: "hi" });
  assert(r.status === 401, `status=${r.status}`); return "rejected";
});

// cleanup
await t("cleanup", async () => {
  const atts = await req("GET", `/api/attendees/event/${EID}`, null, JO);
  for (const a of atts.json) await req("DELETE", `/api/attendees/${a._id}`, null, AO);
  const sess = await req("GET", `/api/sessions?eventId=${EID}`, null, JO);
  for (const s of sess.json) await req("DELETE", `/api/sessions/${s._id}`, null, JO);
  const tix = await req("GET", `/api/tickets/event/${EID}`, null, JO);
  for (const x of tix.json) await req("DELETE", `/api/tickets/${x._id}`, null, JO);
  await req("DELETE", `/api/events/${EID}`, null, JO);
  const db = (await import("mongodb")).MongoClient;
  const c = new db("mongodb://127.0.0.1:27017"); await c.connect();
  await c.db("eventForge").collection("users").deleteMany({ email: { $in: ["evalatt@ef.com"] } });
  await c.close(); return "clean";
});

console.log(out.join("\n"));
console.log(`\n==== ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
