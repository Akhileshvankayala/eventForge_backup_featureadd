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
    signal: AbortSignal.timeout(15000),
  });
  let json = null;
  try { json = await r.json(); } catch { /* empty */ }
  return { status: r.status, json };
}
const login = async (email, pw = "password123") =>
  (await req("POST", "/api/auth/login", { email, password: pw })).json.token;

// fresh organizer with zero events sees nothing
const JO = await login("jordan@eventforge.io");
await t("jordan events = 0 (clean DB)", async () => {
  const r = await req("GET", "/api/events", null, JO);
  assert(r.status === 200 && r.json.length === 0, `got ${r.json?.length}`); return "empty";
});

// register second organizer, create an event
const reg = await req("POST", "/api/auth/register", { name: "Casey Lee", email: "casey@ef.com", password: "casey1234", role: "organizer" });
const CO = reg.json.token;
let EID;
await t("casey creates event", async () => {
  const r = await req("POST", "/api/events", { title: "Casey Summit", slug: "casey-summit", description: "d", startDate: "2026-11-05T09:00:00Z", endDate: "2026-11-05T17:00:00Z", timezone: "UTC", capacity: 50, price: 0, currency: "USD", visibility: "public" }, CO);
  assert(r.status === 201, `status=${r.status}`); EID = r.json._id; return "created";
});
await t("casey sees 1 event (own only)", async () => {
  const r = await req("GET", "/api/events", null, CO);
  assert(r.json.length === 1 && r.json[0].title === "Casey Summit", `got ${r.json?.length}`); return "scoped";
});
await t("jordan still sees 0 (not casey's)", async () => {
  const r = await req("GET", "/api/events", null, JO);
  assert(r.json.length === 0, `got ${r.json?.length}`); return "isolated";
});
await t("jordan GET casey event by id -> 403", async () => {
  const r = await req("GET", `/api/events/${EID}`, null, JO);
  assert(r.status === 403, `status=${r.status}`); return "blocked";
});
await t("jordan attendees of casey event -> 403", async () => {
  const r = await req("GET", `/api/attendees/event/${EID}`, null, JO);
  assert(r.status === 403, `status=${r.status}`); return "blocked";
});
await t("admin sees all (1 event)", async () => {
  const AO = await login("admin@eventforge.io");
  const r = await req("GET", "/api/events", null, AO);
  assert(r.json.length === 1, `got ${r.json?.length}`); return "admin ok";
});
// attendee sees nothing until published
await t("attendee sees 0 before publish", async () => {
  const AT = await login("casey@ef.com", "casey1234").then(() => null).catch(() => null);
  const regA = await req("POST", "/api/auth/register", { name: "Att One", email: "att1@ef.com", password: "att12345", role: "attendee" });
  const r = await req("GET", "/api/events", null, regA.json.token);
  assert(r.json.length === 0, `got ${r.json?.length}`); return "hidden draft";
  void AT;
});
await t("publish -> attendee sees it", async () => {
  await req("PATCH", `/api/events/${EID}`, { status: "published" }, CO);
  const regA = await req("POST", "/api/auth/login", { email: "att1@ef.com", password: "att12345" });
  const r = await req("GET", "/api/events", null, regA.json.token);
  assert(r.json.length === 1, `got ${r.json?.length}`); return "visible";
  // note: public endpoint tested separately below
});
await t("public endpoint lists it (no auth)", async () => {
  const r = await req("GET", "/api/public/events");
  assert(r.status === 200 && r.json.length === 1, `got ${r.json?.length}`); return "public ok";
});
// cleanup
await t("cleanup", async () => {
  await req("DELETE", `/api/events/${EID}`, null, CO);
  const db = (await import("mongodb")).MongoClient;
  const c = new db("mongodb://127.0.0.1:27017"); await c.connect();
  await c.db("eventForge").collection("users").deleteMany({ email: { $in: ["casey@ef.com", "att1@ef.com"] } });
  await c.close(); return "clean";
});

console.log(out.join("\n"));
console.log(`\n==== ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
