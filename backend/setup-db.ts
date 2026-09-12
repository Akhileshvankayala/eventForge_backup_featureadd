import { MongoClient, ObjectId } from "mongodb";
import bcrypt from "bcryptjs";

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017";
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

  await sessions.createIndex({ eventId: 1, time: 1 }, { name: "sessions_event_time" });
  await sessions.createIndex(
    { eventId: 1, room: 1, time: 1 },
    { unique: true, name: "sessions_event_room_time_unique" }
  );
  await sessions.createIndex({ eventId: 1, format: 1 }, { name: "sessions_event_format" });

  await speakers.createIndex({ email: 1 }, { unique: true, name: "speakers_email_unique" });
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

  await attendees.createIndex({ email: 1 }, { unique: true, name: "attendees_email_unique" });
  await attendees.createIndex(
    { eventId: 1, email: 1 },
    { unique: true, name: "attendees_event_email_unique" }
  );
  await attendees.createIndex({ eventId: 1, status: 1 }, { name: "attendees_event_status" });
  await attendees.createIndex({ eventId: 1, ticketType: 1 }, { name: "attendees_event_ticketType" });
  await attendees.createIndex({ ticketType: 1 }, { name: "attendees_ticketType" });

  console.log("Indexes created.");

  // ── 4. Seed data ──

  // Organizers
  const orgInsert = await organizers.insertMany([
    {
      _id: oid(),
      name: "EventForge",
      slug: "eventforge",
      email: "hello@eventforge.io",
      logo: "https://images.unsplash.com/photo-1556761175-b413da4baf72?w=200&q=80",
      website: "https://eventforge.io",
      industry: "Event Management",
      description: "Beautiful corporate events, brilliantly orchestrated.",
      plan: "Enterprise",
      contactName: "Jordan Ellis",
      contactEmail: "jordan@eventforge.io",
      contactPhone: "+1 (212) 555-0142",
      address: "350 5th Avenue, Suite 301, New York, NY 10118",
      createdAt: new Date("2026-01-15T00:00:00Z"),
      updatedAt: new Date("2026-01-15T00:00:00Z"),
    },
  ]);
  const eventForgeOrgId = orgInsert.insertedIds[0];

  // Users: admin + 2 organizers
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
      avatar: "https://i.pravatar.cc/150?u=jordan",
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
      avatar: "https://i.pravatar.cc/150?u=sam",
      isActive: true,
      createdAt: new Date("2026-01-15T00:00:00Z"),
      updatedAt: new Date("2026-01-15T00:00:00Z"),
    },
  ]);
  const adminUserId  = userInsert.insertedIds[0];
  const jordanUserId = userInsert.insertedIds[1];
  const samUserId    = userInsert.insertedIds[2];

  // Venues
  const venueInsert = await venues.insertMany([
    {
      _id: oid(),
      name: "The Glasshouse",
      slug: "the-glasshouse",
      address: "425 5th Avenue, New York, NY 10016",
      city: "New York",
      country: "USA",
      capacity: 1500,
      rooms: 9,
      type: "physical",
      floorPlans: ["main-stage.png", "breakout-a.png", "breakout-b.png", "vip-lounge.png"],
      notes: "Modern event space with floor-to-ceiling windows overlooking Bryant Park. Main stage, 4 breakout rooms, 2 VIP lounges.",
      status: "ready",
      createdAt: new Date("2026-03-01T00:00:00Z"),
      updatedAt: new Date("2026-03-01T00:00:00Z"),
    },
    {
      _id: oid(),
      name: "Convene Chicago",
      slug: "convene-chicago",
      address: "500 W Madison St, Chicago, IL 60661",
      city: "Chicago",
      country: "USA",
      capacity: 640,
      rooms: 5,
      type: "physical",
      floorPlans: ["fulton-a.png", "fulton-b.png", "fulton-c.png"],
      notes: "State-of-the-art event space in the heart of Fulton Market. 3 conference rooms, 1 workshop room, 1 executive boardroom.",
      status: "site_visit",
      createdAt: new Date("2026-03-15T00:00:00Z"),
      updatedAt: new Date("2026-03-15T00:00:00Z"),
    },
    {
      _id: oid(),
      name: "Online experience",
      slug: "online-experience",
      address: null,
      city: "Online",
      country: "Global",
      capacity: 2000,
      rooms: 1,
      type: "virtual",
      floorPlans: [],
      notes: "Streaming platform with live chat, breakout rooms, and on-demand replay. Supports up to 2,000 concurrent attendees.",
      status: "connected",
      createdAt: new Date("2026-06-01T00:00:00Z"),
      updatedAt: new Date("2026-06-01T00:00:00Z"),
    },
  ]);
  const glasshouseId = venueInsert.insertedIds[0];
  const conveenId    = venueInsert.insertedIds[1];
  const onlineId     = venueInsert.insertedIds[2];

  // Events
  const eventInsert = await events.insertMany([
    {
      _id: oid(),
      title: "Future of Work Summit",
      slug: "future-of-work-summit",
      description: "A two-day gathering for leaders shaping the next chapter of work. Explore AI, hybrid teams, and the future of leadership.",
      type: "Conference",
      startDate: new Date("2026-09-18T09:00:00Z"),
      endDate:   new Date("2026-09-20T17:00:00Z"),
      venueId: glasshouseId,
      organizerId: jordanUserId,
      status: "live",
      coverImage: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&q=80",
      tags: ["AI", "leadership", "hybrid-work", "future-of-work"],
      createdAt: new Date("2026-05-01T00:00:00Z"),
      updatedAt: new Date("2026-05-01T00:00:00Z"),
    },
    {
      _id: oid(),
      title: "Northstar Leadership Lab",
      slug: "northstar-leadership-lab",
      description: "Small rooms, big questions, and practical tools for modern leadership. An immersive one-day workshop for senior leaders.",
      type: "Workshop",
      startDate: new Date("2026-10-02T09:00:00Z"),
      endDate:   new Date("2026-10-02T17:00:00Z"),
      venueId: conveenId,
      organizerId: samUserId,
      status: "draft",
      coverImage: "https://images.unsplash.com/photo-1552664730-d307ca884978?w=1200&q=80",
      tags: ["leadership", "workshop", "senior-leaders"],
      createdAt: new Date("2026-06-15T00:00:00Z"),
      updatedAt: new Date("2026-06-15T00:00:00Z"),
    },
    {
      _id: oid(),
      title: "Design Systems Workshop",
      slug: "design-systems-workshop",
      description: "A hands-on day for teams creating clearer, more human digital products. Learn to build and scale design systems.",
      type: "Workshop",
      startDate: new Date("2026-10-21T10:00:00Z"),
      endDate:   new Date("2026-10-21T18:00:00Z"),
      venueId: onlineId,
      organizerId: jordanUserId,
      status: "registration_open",
      coverImage: "https://images.unsplash.com/photo-1581291518633-83b4ebd1d83e?w=1200&q=80",
      tags: ["design-systems", "UX", "component-libraries", "design-ops"],
      createdAt: new Date("2026-07-01T00:00:00Z"),
      updatedAt: new Date("2026-07-01T00:00:00Z"),
    },
  ]);
  const futureOfWorkId    = eventInsert.insertedIds[0];
  const northstarId       = eventInsert.insertedIds[1];
  const designSystemsId   = eventInsert.insertedIds[2];

  // Speakers
  const speakerInsert = await speakers.insertMany([
    {
      _id: oid(),
      name: "Dr. Maya Patel",
      email: "maya.patel@futureofwork.org",
      bio: "Organizational psychologist and author of 'The Human Edge'. Dr. Patel studies how AI and automation reshape team dynamics and leadership.",
      avatar: "https://i.pravatar.cc/300?u=maya",
      title: "Keynote · Responsible AI & culture",
      expertise: ["AI ethics", "organizational psychology", "leadership", "future of work"],
      status: "profile_complete",
      social: { twitter: "@mayapatel", linkedin: "mayapatel" },
      createdAt: new Date("2026-05-01T00:00:00Z"),
      updatedAt: new Date("2026-05-01T00:00:00Z"),
    },
    {
      _id: oid(),
      name: "Theo Brooks",
      email: "theo.brooks@leadershiplab.com",
      bio: "Former VP of People at a Fortune 500 tech company. Now an independent leadership consultant helping organizations build resilient cultures.",
      avatar: "https://i.pravatar.cc/300?u=theo",
      title: "Panel · Future of leadership",
      expertise: ["leadership development", "organizational design", "talent strategy"],
      status: "bio_requested",
      social: { linkedin: "theobrooks" },
      createdAt: new Date("2026-06-15T00:00:00Z"),
      updatedAt: new Date("2026-06-15T00:00:00Z"),
    },
    {
      _id: oid(),
      name: "Nora Chen",
      email: "nora.chen@designsystems.io",
      bio: "Design systems lead at a major tech company. Built and scaled a design system serving 12 product teams across 3 time zones.",
      avatar: "https://i.pravatar.cc/300?u=nora",
      title: "Workshop · Systems thinking",
      expertise: ["design systems", "component libraries", "design ops", "token-based design"],
      status: "materials_uploaded",
      social: { twitter: "@norachen", linkedin: "norachen" },
      createdAt: new Date("2026-07-01T00:00:00Z"),
      updatedAt: new Date("2026-07-01T00:00:00Z"),
    },
  ]);
  const mayaSpeakerId = speakerInsert.insertedIds[0];
  const theoSpeakerId = speakerInsert.insertedIds[1];
  const noraSpeakerId = speakerInsert.insertedIds[2];

  // Sessions
  const sessionInsert = await sessions.insertMany([
    // Future of Work Summit
    {
      _id: oid(),
      eventId: futureOfWorkId,
      title: "Opening keynote: The human edge",
      time: "09:30",
      duration: 60,
      room: "Main stage",
      format: "Keynote",
      speakerIds: [mayaSpeakerId],
      description: "Dr. Maya Patel explores what makes us irreplaceable in an age of intelligent machines.",
      status: "published",
      createdAt: new Date("2026-05-01T00:00:00Z"),
      updatedAt: new Date("2026-05-01T00:00:00Z"),
    },
    {
      _id: oid(),
      eventId: futureOfWorkId,
      title: "Building with responsible AI",
      time: "11:00",
      duration: 90,
      room: "Atlas room",
      format: "Workshop",
      speakerIds: [theoSpeakerId],
      description: "Hands-on workshop on implementing responsible AI practices in product development.",
      status: "speaker_confirmed",
      createdAt: new Date("2026-05-01T00:00:00Z"),
      updatedAt: new Date("2026-05-01T00:00:00Z"),
    },
    {
      _id: oid(),
      eventId: futureOfWorkId,
      title: "Culture as a growth engine",
      time: "13:15",
      duration: 60,
      room: "Forum room",
      format: "Panel",
      speakerIds: [],
      description: "Panel discussion on how culture drives organizational growth and resilience.",
      status: "needs_host",
      createdAt: new Date("2026-05-01T00:00:00Z"),
      updatedAt: new Date("2026-05-01T00:00:00Z"),
    },
    // Northstar Leadership Lab
    {
      _id: oid(),
      eventId: northstarId,
      title: "Leading with clarity",
      time: "09:00",
      duration: 120,
      room: "Room A",
      format: "Workshop",
      speakerIds: [theoSpeakerId],
      description: "An interactive workshop on clear communication and decisive leadership.",
      status: "draft",
      createdAt: new Date("2026-06-15T00:00:00Z"),
      updatedAt: new Date("2026-06-15T00:00:00Z"),
    },
    {
      _id: oid(),
      eventId: northstarId,
      title: "The feedback loop",
      time: "11:30",
      duration: 90,
      room: "Room B",
      format: "Workshop",
      speakerIds: [],
      description: "Building feedback-rich cultures that drive continuous improvement.",
      status: "draft",
      createdAt: new Date("2026-06-15T00:00:00Z"),
      updatedAt: new Date("2026-06-15T00:00:00Z"),
    },
    // Design Systems Workshop
    {
      _id: oid(),
      eventId: designSystemsId,
      title: "Systems thinking for designers",
      time: "10:00",
      duration: 120,
      room: "Main hall",
      format: "Workshop",
      speakerIds: [noraSpeakerId],
      description: "How to think in systems and build design infrastructure that scales.",
      status: "published",
      createdAt: new Date("2026-07-01T00:00:00Z"),
      updatedAt: new Date("2026-07-01T00:00:00Z"),
    },
    {
      _id: oid(),
      eventId: designSystemsId,
      title: "From tokens to components",
      time: "14:00",
      duration: 90,
      room: "Track 1",
      format: "Workshop",
      speakerIds: [noraSpeakerId],
      description: "Hands-on session building a token-based design system from scratch.",
      status: "published",
      createdAt: new Date("2026-07-01T00:00:00Z"),
      updatedAt: new Date("2026-07-01T00:00:00Z"),
    },
  ]);

  // Sponsors
  const sponsorInsert = await sponsors.insertMany([
    {
      _id: oid(),
      name: "Frame.io",
      slug: "frame-io",
      tier: "Premier",
      logo: "https://i.pravatar.cc/300?u=frameio",
      website: "https://frame.io",
      description: "Video collaboration platform for creative teams.",
      deliverables: [
        "Logo on all materials",
        "Keynote sponsorship",
        "VIP lounge activation",
        "Social media featuring",
        "Attendee email mention",
        "Custom swag bag",
      ],
      deliverablesCompleted: 4,
      contactName: "Alex Turner",
      contactEmail: "alex@frame.io",
      status: "active",
      createdAt: new Date("2026-05-01T00:00:00Z"),
      updatedAt: new Date("2026-08-01T00:00:00Z"),
    },
    {
      _id: oid(),
      name: "Loom",
      slug: "loom",
      tier: "Session",
      logo: "https://i.pravatar.cc/300?u=loom",
      website: "https://loom.com",
      description: "Async video messaging for modern teams.",
      deliverables: [
        "Session sponsorship",
        "Demo booth",
        "Social media mention",
      ],
      deliverablesCompleted: 3,
      contactName: "Jamie Park",
      contactEmail: "jamie@loom.com",
      status: "active",
      createdAt: new Date("2026-05-15T00:00:00Z"),
      updatedAt: new Date("2026-08-15T00:00:00Z"),
    },
    {
      _id: oid(),
      name: "Linear",
      slug: "linear",
      tier: "Community",
      logo: "https://i.pravatar.cc/300?u=linear",
      website: "https://linear.app",
      description: "Streamlined issue tracking for ambitious teams.",
      deliverables: [
        "Community partner badge",
        "Job board listing",
        "Networking reception sponsorship",
      ],
      deliverablesCompleted: 1,
      contactName: "Taylor Kim",
      contactEmail: "taylor@linear.app",
      status: "pending_assets",
      createdAt: new Date("2026-06-01T00:00:00Z"),
      updatedAt: new Date("2026-08-20T00:00:00Z"),
    },
  ]);

  // Ticket Types
  const ticketInsert = await ticketTypes.insertMany([
    {
      _id: oid(),
      eventId: futureOfWorkId,
      name: "General admission",
      description: "Full access to all conference sessions, workshops, and networking events.",
      price: 499,
      currency: "USD",
      capacity: 1000,
      sold: 842,
      waitlist: 42,
      status: "active",
      includes: [
        "All keynotes",
        "All workshops",
        "Lunch both days",
        "Networking reception",
        "Digital materials",
      ],
      createdAt: new Date("2026-05-01T00:00:00Z"),
      updatedAt: new Date("2026-05-01T00:00:00Z"),
    },
    {
      _id: oid(),
      eventId: futureOfWorkId,
      name: "VIP admission",
      description: "Premium experience with VIP lounge access, speaker dinner, and priority seating.",
      price: 1299,
      currency: "USD",
      capacity: 250,
      sold: 196,
      waitlist: 0,
      status: "active",
      includes: [
        "All general admission benefits",
        "VIP lounge access",
        "Speaker dinner",
        "Priority seating",
        "Signed photo with keynote speaker",
      ],
      createdAt: new Date("2026-05-01T00:00:00Z"),
      updatedAt: new Date("2026-05-01T00:00:00Z"),
    },
    {
      _id: oid(),
      eventId: designSystemsId,
      name: "Workshop add-on",
      description: "Optional deep-dive session on advanced design system patterns.",
      price: 99,
      currency: "USD",
      capacity: 120,
      sold: 0,
      waitlist: 18,
      status: "waitlist",
      includes: [
        "4-hour deep-dive workshop",
        "Hands-on coding session",
        "Take-home code repository",
      ],
      createdAt: new Date("2026-07-01T00:00:00Z"),
      updatedAt: new Date("2026-07-01T00:00:00Z"),
    },
  ]);

  // Attendees
  const attendeeInsert = await attendees.insertMany([
    // Future of Work Summit
    {
      _id: oid(),
      eventId: futureOfWorkId,
      name: "Maya Patel",
      email: "maya.patel@example.com",
      company: "FutureTech Solutions",
      title: "Executive",
      ticketType: "VIP admission",
      status: "confirmed",
      bookedAt: new Date("2026-08-12T00:00:00Z"),
      notes: "Dietary restrictions: vegetarian",
      createdAt: new Date("2026-08-12T00:00:00Z"),
      updatedAt: new Date("2026-08-12T00:00:00Z"),
    },
    {
      _id: oid(),
      eventId: futureOfWorkId,
      name: "Theo Brooks",
      email: "theo.brooks@example.com",
      company: "Leadership First",
      title: "Workshop pass",
      ticketType: "General admission",
      status: "needs_approval",
      bookedAt: new Date("2026-08-21T00:00:00Z"),
      notes: "",
      createdAt: new Date("2026-08-21T00:00:00Z"),
      updatedAt: new Date("2026-08-21T00:00:00Z"),
    },
    // Northstar Leadership Lab
    {
      _id: oid(),
      eventId: northstarId,
      name: "Priya Shah",
      email: "priya.shah@example.com",
      company: "Northstar Consulting",
      title: "Leadership pass",
      ticketType: "VIP admission",
      status: "confirmed",
      bookedAt: new Date("2026-08-18T00:00:00Z"),
      notes: "Bringing a colleague — will update ticket count",
      createdAt: new Date("2026-08-18T00:00:00Z"),
      updatedAt: new Date("2026-08-18T00:00:00Z"),
    },
    {
      _id: oid(),
      eventId: northstarId,
      name: "Marcus Lee",
      email: "marcus.lee@example.com",
      company: "Design Co",
      title: "General admission",
      ticketType: "General admission",
      status: "waitlist",
      bookedAt: new Date("2026-08-30T00:00:00Z"),
      notes: "Moved from waitlist — pending payment",
      createdAt: new Date("2026-08-30T00:00:00Z"),
      updatedAt: new Date("2026-08-30T00:00:00Z"),
    },
    // Design Systems Workshop
    {
      _id: oid(),
      eventId: designSystemsId,
      name: "Nora Chen",
      email: "nora.chen@example.com",
      company: "Design Systems Inc",
      title: "Speaker guest",
      ticketType: "VIP admission",
      status: "confirmed",
      bookedAt: new Date("2026-08-09T00:00:00Z"),
      notes: "Complementary ticket as workshop facilitator",
      createdAt: new Date("2026-08-09T00:00:00Z"),
      updatedAt: new Date("2026-08-09T00:00:00Z"),
    },
    {
      _id: oid(),
      eventId: designSystemsId,
      name: "Jules Carter",
      email: "jules.carter@example.com",
      company: "Product Lab",
      title: "Workshop pass",
      ticketType: "General admission",
      status: "confirmed",
      bookedAt: new Date("2026-08-27T00:00:00Z"),
      notes: "",
      createdAt: new Date("2026-08-27T00:00:00Z"),
      updatedAt: new Date("2026-08-27T00:00:00Z"),
    },
  ]);

  console.log("\nSeed data inserted:");
  console.log("  organizers:    1");
  console.log("  users:         3 (1 admin + 2 organizers)");
  console.log("  venues:        3");
  console.log("  events:        3");
  console.log("  speakers:      3");
  console.log("  sessions:      7");
  console.log("  sponsors:      3");
  console.log("  ticketTypes:   3");
  console.log("  attendees:     6");

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

  // ── 6. Verify seed data ──
  console.log("\n=== SEED DATA VERIFICATION ===");

  // Events with venue names
  console.log("\nEvents:");
  const eventDocs = await events
    .aggregate([
      { $lookup: { from: "venues", localField: "venueId", foreignField: "_id", as: "venue" } },
      { $unwind: "$venue" },
      { $sort: { startDate: 1 } },
    ])
    .toArray() as any[];
  for (const e of eventDocs) {
    console.log(
      `  ${e.title} (${e.type})\n    Venue: ${e.venue.name} · ${e.venue.city}\n    Status: ${e.status}\n    Dates: ${e.startDate.toISOString().slice(0,10)} → ${e.endDate.toISOString().slice(0,10)}`
    );
  }

  // Attendees
  console.log("\nAttendees:");
  const attendeeDocs = await attendees
    .aggregate([
      { $lookup: { from: "events", localField: "eventId", foreignField: "_id", as: "event" } },
      { $unwind: "$event" },
      { $sort: { "event.startDate": 1, bookedAt: 1 } },
    ])
    .toArray() as any[];
  for (const a of attendeeDocs) {
    console.log(
      `  ${a.name}\n    Event: ${a.event.title}\n    Ticket: ${a.ticketType} · Status: ${a.status}\n    Booked: ${a.bookedAt.toISOString().slice(0,10)}`
    );
  }

  // Ticket types with event titles
  console.log("\nTicket Types:");
  const ticketDocs = await ticketTypes
    .aggregate([
      { $lookup: { from: "events", localField: "eventId", foreignField: "_id", as: "event" } },
      { $unwind: "$event" },
      { $sort: { "event.startDate": 1, name: 1 } },
    ])
    .toArray() as any[];
  for (const t of ticketDocs) {
    console.log(
      `  ${t.name} — ${t.event.title}\n    ${t.sold} sold / ${t.capacity} capacity · Waitlist: ${t.waitlist}\n    Status: ${t.status} · Price: ${t.currency} ${t.price}`
    );
  }

  // Sessions by event
  console.log("\nSessions:");
  const sessionDocs = await sessions
    .aggregate([
      { $lookup: { from: "events", localField: "eventId", foreignField: "_id", as: "event" } },
      { $unwind: "$event" },
      { $sort: { "event.startDate": 1, time: 1 } },
    ])
    .toArray() as any[];
  for (const s of sessionDocs) {
    const speakerNames =
      s.speakerIds?.length > 0
        ? await speakers
            .find({ _id: { $in: s.speakerIds } })
            .project({ name: 1 })
            .toArray()
            .then((ss) => ss.map((x: any) => x.name).join(", "))
        : "—";
    console.log(
      `  ${s.time} — ${s.title} (${s.format})\n    Room: ${s.room} · Speaker: ${speakerNames}\n    Event: ${s.event.title} · Status: ${s.status}`
    );
  }

  // Speakers
  console.log("\nSpeakers:");
  const speakerDocs = await speakers.find({}).sort({ name: 1 }).toArray() as any[];
  for (const s of speakerDocs) {
    console.log(
      `  ${s.name}\n    Title: ${s.title}\n    Status: ${s.status}\n    Expertise: ${s.expertise.join(", ")}`
    );
  }

  // Sponsors
  console.log("\nSponsors:");
  const sponsorDocs = await sponsors.find({}).sort({ tier: 1, name: 1 }).toArray() as any[];
  for (const s of sponsorDocs) {
    console.log(
      `  ${s.name} — Tier: ${s.tier}\n    Deliverables: ${s.deliverablesCompleted}/${s.deliverables?.length || 0} complete\n    Status: ${s.status}`
    );
  }

  // Users
  console.log("\nUsers:");
  const userDocs = await users.find({}).sort({ role: 1, email: 1 }).toArray() as any[];
  for (const u of userDocs) {
    console.log(
      `  ${u.email} — ${u.name} (${u.role})\n    Organization: ${u.organizationName}`
    );
  }

  // Venues
  console.log("\nVenues:");
  const venueDocs = await venues.find({}).sort({ city: 1, name: 1 }).toArray() as any[];
  for (const v of venueDocs) {
    console.log(
      `  ${v.name} — ${v.city}\n    Capacity: ${v.capacity} · Rooms: ${v.rooms} · Type: ${v.type}\n    Status: ${v.status}`
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
