import { MongoClient, ObjectId } from "mongodb";
import bcrypt from "bcryptjs";

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || "mongodb://127.0.0.1:27017";
const DB_NAME   = "eventForge";

function oid(): ObjectId {
  return new ObjectId();
}

async function main() {
  console.log("Connecting to MongoDB...");
  const client = new MongoClient(MONGO_URI);
  await client.connect();

  // Generate password hash at runtime to avoid bcrypt version incompatibility
  const DEMO_PASSWORD_HASH = await bcrypt.hash("password123", 10);
  console.log("Using runtime-generated password hash for demo users");
  console.log("Connected.");

  const db = client.db(DB_NAME);
  console.log(`Using database: ${DB_NAME}`);

  // Drop the test collection that may have been created by a prior connection check
  try { await db.dropCollection("___connection_test"); } catch {}

  // ── 1. Drop all collections (idempotent) ──
  const existing = await db.listCollections().toArray();
  for (const coll of existing) {
    await db.dropCollection(coll.name);
    console.log(`Dropped: ${coll.name}`);
  }

  // ── 2. Collections are auto-created on first insert ──
  console.log("Collections ready (auto-created on first insert).");

  // Get collection handles
  const organizers  = db.collection("organizers");
  const users       = db.collection("users");
  const venues      = db.collection("venues");
  const events      = db.collection("events");
  const sessions    = db.collection("sessions");
  const speakers    = db.collection("speakers");
  const sponsors    = db.collection("sponsors");
  const ticketTypes = db.collection("ticketTypes");
  const attendees   = db.collection("attendees");

  // ── 3. Create indexes ──
  console.log("Creating indexes...");

  await users.createIndex({ email: 1 }, { unique: true, name: "users_email_unique" });
  await users.createIndex({ email: 1, role: 1 }, { name: "users_email_role" });
  await users.createIndex({ role: 1 }, { name: "users_role" });

  await organizers.createIndex({ email: 1 }, { unique: true, name: "organizers_email_unique" });

  await venues.createIndex({ name: 1 }, { unique: true, name: "venues_name_unique" });
  await venues.createIndex({ city: 1 }, { name: "venues_city" });

  await events.createIndex({ slug: 1 }, { unique: true, name: "events_slug_unique" });
  await events.createIndex({ title: "text", description: "text" }, { name: "events_text" });
  await events.createIndex({ startDate: 1, endDate: 1 }, { name: "events_date_range" });
  await events.createIndex({ organizerId: 1 }, { name: "events_organizer" });
  await events.createIndex({ venueId: 1 }, { name: "events_venue" });
  await events.createIndex({ status: 1 }, { name: "events_status" });

  await sessions.createIndex({ eventId: 1, startTime: 1 }, { name: "sessions_event_time" });
  await sessions.createIndex(
    { eventId: 1, roomName: 1, startTime: 1 },
    { unique: true, name: "sessions_event_room_time_unique" }
  );
  await sessions.createIndex({ eventId: 1, type: 1 }, { name: "sessions_event_format" });

  await speakers.createIndex({ email: 1 }, { sparse: true, unique: true, name: "speakers_email_unique" });
  await speakers.createIndex({ name: 1 }, { name: "speakers_name" });
  await speakers.createIndex({ status: 1 }, { name: "speakers_status" });

  await sponsors.createIndex({ name: 1 }, { unique: true, name: "sponsors_name_unique" });
  await sponsors.createIndex({ tier: 1 }, { name: "sponsors_tier" });
  await sponsors.createIndex({ status: 1 }, { name: "sponsors_status" });

  await ticketTypes.createIndex(
    { eventId: 1, name: 1 },
    { unique: true, name: "ticketTypes_event_name_unique" }
  );
  await ticketTypes.createIndex({ eventId: 1 }, { name: "ticketTypes_event" });
  await ticketTypes.createIndex({ status: 1 }, { name: "ticketTypes_status" });

  await attendees.createIndex({ email: 1 }, { name: "attendees_email" });
  await attendees.createIndex(
    { eventId: 1, email: 1 },
    { unique: true, name: "attendees_event_email_unique" }
  );
  await attendees.createIndex({ eventId: 1, status: 1 }, { name: "attendees_event_status" });
  await attendees.createIndex({ eventId: 1, ticketType: 1 }, { name: "attendees_event_ticketType" });
  await attendees.createIndex({ ticketType: 1 }, { name: "attendees_ticketType" });

  console.log("Indexes created.");

  // ── 4. Seed data ──
  // Production database starts CLEAN: no demo events, sessions, attendees, or
  // other business records. Only the platform organization and login accounts
  // are created — everything else is built through the app itself.

  // Organizers
  const orgInsert = await organizers.insertMany([
    {
      _id: oid(),
      name: "EventForge",
      slug: "eventforge",
      email: "hello@eventforge.io",
      logo: null,
      website: "https://eventforge.io",
      industry: "Event Management",
      description: "Beautiful corporate events, brilliantly orchestrated.",
      plan: "Enterprise",
      contactName: "EventForge Admin",
      contactEmail: "admin@eventforge.io",
      address: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]);
  const eventForgeOrgId = orgInsert.insertedIds[0];

  // Users: admin + 2 organizers (password for all: password123)
  const userInsert = await users.insertMany([
    {
      _id: oid(),
      email: "admin@eventforge.io",
      name: "EventForge Admin",
      role: "admin",
      passwordHash: DEMO_PASSWORD_HASH,
      organizationId: eventForgeOrgId,
      organizationName: "EventForge",
      avatar: null,
      isActive: true,
      createdAt: new Date("2026-01-15T00:00:00Z"),
      updatedAt: new Date("2026-01-15T00:00:00Z"),
    },
    {
      _id: oid(),
      email: "jordan@eventforge.io",
      name: "Jordan Ellis",
      role: "organizer",
      passwordHash: DEMO_PASSWORD_HASH,
      organizationId: eventForgeOrgId,
      organizationName: "EventForge",
      avatar: null,
      isActive: true,
      createdAt: new Date("2026-01-15T00:00:00Z"),
      updatedAt: new Date("2026-01-15T00:00:00Z"),
    },
    {
      _id: oid(),
      email: "sam@eventforge.io",
      name: "Sam Rivera",
      role: "organizer",
      passwordHash: DEMO_PASSWORD_HASH,
      organizationId: eventForgeOrgId,
      organizationName: "EventForge",
      avatar: null,
      isActive: true,
      createdAt: new Date("2026-01-15T00:00:00Z"),
      updatedAt: new Date("2026-01-15T00:00:00Z"),
    },
  ]);
  void userInsert;

  console.log("\nSeed data inserted:");
  console.log("  organizers:    1");
  console.log("  users:         3 (1 admin + 2 organizers, password: password123)");
  console.log("  venues/events/sessions/speakers/sponsors/ticketTypes/attendees: 0 (clean start)");

  // ── 5. Verify indexes ──
  console.log("\n=== INDEX VERIFICATION ===");
  const collList = [
    "organizers", "users", "venues", "events",
    "sessions", "speakers", "sponsors", "ticketTypes", "attendees",
  ];
  for (const name of collList) {
    const indexes = await db.collection(name).listIndexes().toArray();
    const names = indexes.map((i: any) => i.name);
    console.log(`  ${name.padEnd(14)} → ${names.join(", ")}`);
  }

  // ── 6. Verify seed data (counts) ──
  console.log("\n=== SEED DATA VERIFICATION ===");
  for (const name of collList) {
    const count = await db.collection(name).countDocuments();
    console.log(`  ${name.padEnd(14)} ${count} document(s)`);
  }

  // Users
  console.log("\nUsers:");
  const userDocs = await users.find({}).sort({ role: 1, email: 1 }).toArray() as any[];
  for (const u of userDocs) {
    console.log(
      `  ${u.email} — ${u.name} (${u.role})\n    Organization: ${u.organizationName}`
    );
  }

  // ── 7. Confirm database name ──
  const dbInfo = await client.db(DB_NAME).command({ listCollections: 1, nameOnly: true });
  console.log(`\nDatabase name: ${DB_NAME}`);
  console.log(`Collections:   ${dbInfo.collections?.map((c: any) => c.name).join(", ") || "none"}`);

  await client.close();
  console.log("\nDone. Connection closed.");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
