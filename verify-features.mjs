const B = "http://localhost:3002";
let pass = 0, fail = 0;
const results = [];
async function t(name, fn) {
  try {
    const detail = await fn();
    pass++;
    results.push(`PASS  ${name}${detail ? " — " + detail : ""}`);
  } catch (e) {
    fail++;
    results.push(`FAIL  ${name} — ${e.message}`);
  }
}
function assert(cond, msg) { if (!cond) throw new Error(msg); }
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

// --- auth ---
const adminLogin = await req("POST", "/api/auth/login", { email: "admin@eventforge.io", password: "password123" });
const TOKEN = adminLogin.json?.token;
await t("login admin", async () => { assert(adminLogin.status === 200 && TOKEN, `status=${adminLogin.status}`); return adminLogin.json.user.email; });
await t("login wrong password -> 401", async () => {
  const r = await req("POST", "/api/auth/login", { email: "admin@eventforge.io", password: "nope" });
  assert(r.status === 401, `status=${r.status}`); return "rejected";
});
await t("register validation -> 400", async () => {
  const r = await req("POST", "/api/auth/register", { email: "x@ef.com", password: "123", name: "", role: "attendee" });
  assert(r.status === 400, `status=${r.status}`); return "rejected";
});
await t("GET /me", async () => {
  const r = await req("GET", "/api/auth/me", null, TOKEN);
  assert(r.status === 200 && !("passwordHash" in r.json), `status=${r.status}`); return r.json.email;
});
await t("GET /me no token -> 401", async () => {
  const r = await req("GET", "/api/auth/me");
  assert(r.status === 401, `status=${r.status}`); return "rejected";
});
await t("POST /refresh", async () => {
  const r = await req("POST", "/api/auth/refresh", null, TOKEN);
  assert(r.status === 200 && r.json.token, `status=${r.status}`); return "new token";
});

// --- events CRUD ---
let eventId;
await t("POST /events create", async () => {
  const r = await req("POST", "/api/events", { title: "Verify Event", slug: "verify-event", description: "d", startDate: "2026-11-01T09:00:00Z", endDate: "2026-11-02T17:00:00Z", timezone: "UTC", capacity: 100, price: 0, currency: "USD", visibility: "public" }, TOKEN);
  assert(r.status === 201 && r.json._id, `status=${r.status} ${JSON.stringify(r.json).slice(0,120)}`);
  eventId = r.json._id; return eventId.slice(-6);
});
await t("POST /events validation -> 400", async () => {
  const r = await req("POST", "/api/events", { title: "" }, TOKEN);
  assert(r.status === 400, `status=${r.status}`); return "rejected";
});
await t("GET /events list", async () => {
  const r = await req("GET", "/api/events", null, TOKEN);
  assert(r.status === 200 && r.json.length >= 3, `count=${r.json?.length}`); return `${r.json.length} events`;
});
await t("GET /events/:id", async () => {
  const r = await req("GET", `/api/events/${eventId}`, null, TOKEN);
  assert(r.status === 200 && r.json.title === "Verify Event", `status=${r.status}`); return "found";
});
await t("GET /events/slug/:slug", async () => {
  const r = await req("GET", "/api/events/slug/verify-event", null, TOKEN);
  assert(r.status === 200, `status=${r.status}`); return "found";
});
await t("PATCH /events/:id", async () => {
  const r = await req("PATCH", `/api/events/${eventId}`, { capacity: 150 }, TOKEN);
  assert(r.status === 200 && r.json.capacity === 150, `status=${r.status}`); return "updated";
});

// --- venues ---
await t("GET /venues", async () => {
  const r = await req("GET", "/api/venues", null, TOKEN);
  assert(r.status === 200 && r.json.length === 3, `count=${r.json?.length}`); return "3 venues";
});

// --- sessions + conflict ---
let sessId;
await t("POST /sessions create", async () => {
  const r = await req("POST", "/api/sessions", { eventId, title: "Verify Session", slug: "verify-session", description: "verify", type: "Talk", startTime: "2026-11-01T10:00:00Z", endTime: "2026-11-01T11:00:00Z", duration: 60, timezone: "UTC", capacity: 50 }, TOKEN);
  assert((r.status === 201 || r.status === 200) && (r.json._id || r.json.id), `status=${r.status} ${JSON.stringify(r.json).slice(0,120)}`);
  sessId = r.json._id || r.json.id; return "created";
});
await t("GET /sessions?eventId=", async () => {
  const r = await req("GET", `/api/sessions?eventId=${eventId}`, null, TOKEN);
  assert(r.status === 200 && r.json.length >= 1, `status=${r.status}`); return `${r.json.length} sessions`;
});
await t("POST overlapping session -> 409", async () => {
  const r = await req("POST", "/api/sessions", { eventId, title: "Overlap", slug: "overlap", description: "x", type: "Talk", startTime: "2026-11-01T10:30:00Z", endTime: "2026-11-01T11:30:00Z", duration: 60, timezone: "UTC", capacity: 10 }, TOKEN);
  assert(r.status === 409, `status=${r.status}`); return "conflict detected";
});
await t("POST /check-conflict", async () => {
  const r = await req("POST", "/api/sessions/check-conflict", { eventId, startTime: "2026-11-01T10:30:00Z", endTime: "2026-11-01T11:30:00Z" }, TOKEN);
  assert(r.status === 200 && r.json.conflicts?.length >= 1, `status=${r.status}`); return "conflict reported";
});

// --- speakers ---
await t("GET /speakers", async () => {
  const r = await req("GET", "/api/speakers", null, TOKEN);
  assert(r.status === 200 && r.json.length === 3, `count=${r.json?.length}`); return "3 speakers";
});

// --- sponsors ---
await t("GET /sponsors", async () => {
  const r = await req("GET", "/api/sponsors", null, TOKEN);
  assert(r.status === 200 && r.json.length === 3, `count=${r.json?.length}`); return "3 sponsors";
});

// --- tickets ---
let ticketId;
await t("POST /tickets create", async () => {
  const r = await req("POST", "/api/tickets", { eventId, name: "Verify Ticket", slug: "verify-ticket", price: 10, currency: "USD", totalQuantity: 50, salesStart: "2026-01-01T00:00:00Z", salesEnd: "2026-12-31T00:00:00Z", status: "active" }, TOKEN);
  assert((r.status === 201 || r.status === 200) && (r.json._id || r.json.id), `status=${r.status} ${JSON.stringify(r.json).slice(0,120)}`);
  ticketId = r.json._id || r.json.id; return "created";
});
await t("GET /tickets/event/:eventId", async () => {
  const r = await req("GET", `/api/tickets/event/${eventId}`, null, TOKEN);
  assert(r.status === 200 && r.json.length >= 1, `status=${r.status}`); return `${r.json.length} types`;
});

// --- attendees: register -> approve -> checkin ---
let qr; let attendeeId;
await t("POST /attendees/register", async () => {
  const r = await req("POST", "/api/attendees/register", { eventId, ticketTypeId: ticketId, firstName: "Verify", lastName: "User", email: "verify@ef.com" }, TOKEN);
  assert((r.status === 201 || r.status === 200) && r.json.qrCode, `status=${r.status} ${JSON.stringify(r.json).slice(0,120)}`);
  qr = r.json.qrCode; attendeeId = r.json._id || r.json.id; return `qr=${String(qr).slice(0, 8)}...`;
});
await t("duplicate register -> 409", async () => {
  const r = await req("POST", "/api/attendees/register", { eventId, ticketTypeId: ticketId, firstName: "Verify", lastName: "User", email: "verify@ef.com" }, TOKEN);
  assert(r.status === 409, `status=${r.status}`); return "rejected";
});
await t("GET /attendees/event/:eventId", async () => {
  const r = await req("GET", `/api/attendees/event/${eventId}`, null, TOKEN);
  assert(r.status === 200 && r.json.length >= 1, `count=${r.json?.length}`); return `${r.json.length} attendees`;
});
await t("checkin pending -> 403", async () => {
  const r = await req("POST", "/api/checkin/checkin", { qrCode: qr });
  assert(r.status === 403, `status=${r.status}`); return "correctly refused";
});

// --- packages ---
await t("GET /packages", async () => {
  const r = await req("GET", "/api/packages", null, TOKEN);
  assert(r.status === 200 && Array.isArray(r.json), `status=${r.status}`); return `${r.json.length} packages`;
});

// --- announcements ---
let annId;
await t("POST /announcements", async () => {
  const r = await req("POST", "/api/announcements", { title: "Verify", body: "hello", type: "info", target: "all" }, TOKEN);
  assert((r.status === 201 || r.status === 200) && (r.json._id || r.json.id), `status=${r.status} ${JSON.stringify(r.json).slice(0,120)}`);
  annId = r.json._id || r.json.id; return "created";
});
await t("GET /announcements", async () => {
  const r = await req("GET", "/api/announcements", null, TOKEN);
  assert(r.status === 200 && r.json.length >= 1, `status=${r.status}`); return `${r.json.length} announcements`;
});

// --- AI ---
for (const [path, body] of [
  ["/api/ai/generate", { action: "generate", prompt: "Draft an event description" }],
  ["/api/ai/recommend", { action: "recommend", prompt: "pick sessions", sessions: [{ title: "T1" }] }],
  ["/api/ai/generate-event-description", { title: "E", type: "C" }],
  ["/api/ai/generate-session-description", { title: "S" }],
  ["/api/ai/generate-speaker-bio", { name: "N" }],
  ["/api/ai/generate-email", { subject: "S" }],
  ["/api/ai/generate-social-post", { eventName: "E" }],
  ["/api/ai/generate-agenda", { eventName: "E", durationDays: 2 }],
]) {
  await t(`POST ${path}`, async () => {
    const r = await req("POST", path, body, TOKEN);
    assert(r.status === 200, `status=${r.status} ${JSON.stringify(r.json).slice(0,100)}`); return "draft ok";
  });
}

// --- users (admin) ---
await t("GET /users (admin)", async () => {
  const r = await req("GET", "/api/users", null, TOKEN);
  assert(r.status === 200, `status=${r.status}`); return `${r.json.length} users`;
});

// --- cleanup created fixtures ---
await t("cleanup DELETE attendee", async () => {
  const r = await req("DELETE", `/api/attendees/${attendeeId}`, null, TOKEN);
  assert(r.status === 200 || r.status === 204, `status=${r.status}`); return "gone";
});
await t("cleanup DELETE session", async () => {
  const r = await req("DELETE", `/api/sessions/${sessId}`, null, TOKEN);
  assert(r.status === 200 || r.status === 204, `status=${r.status}`); return "gone";
});
await t("cleanup DELETE ticket", async () => {
  const r = await req("DELETE", `/api/tickets/${ticketId}`, null, TOKEN);
  assert(r.status === 200 || r.status === 204, `status=${r.status}`); return "gone";
});
await t("cleanup DELETE announcement", async () => {
  const r = await req("DELETE", `/api/announcements/${annId}`, null, TOKEN);
  assert(r.status === 200 || r.status === 204, `status=${r.status}`); return "gone";
});
await t("cleanup DELETE event", async () => {
  const r = await req("DELETE", `/api/events/${eventId}`, null, TOKEN);
  assert(r.status === 200 || r.status === 204, `status=${r.status}`); return "gone";
});

console.log(results.join("\n"));
console.log(`\n==== ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
