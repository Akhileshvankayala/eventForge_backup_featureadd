import { MongoClient } from "mongodb";

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017";
const DB_NAME = "eventForge";

interface User {
  _id: { toString(): string };
  email: string;
  name: string;
  role: "admin" | "organizer";
  password: string;
  organization: string;
  avatar: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface Organizer {
  _id: { toString(): string };
  name: string;
  email: string;
  logo?: string;
  website?: string;
  industry?: string;
  description?: string;
  contactName: string;
  contactEmail: string;
  contactPhone?: string;
  address?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface Venue {
  _id: { toString(): string };
  name: string;
  address?: string;
  city: string;
  country: string;
  capacity: number;
  rooms: number;
  type: "physical" | "virtual";
  notes?: string;
  floorPlans?: string[];
  createdAt: Date;
  updatedAt: Date;
}

interface Event {
  _id: { toString(): string };
  title: string;
  slug: string;
  description: string;
  type: "Conference" | "Workshop" | "Webinar" | "Meetup";
  startDate: Date;
  endDate: Date;
  venueId: { toString(): string } | null;
  organizerId: { toString(): string };
  status: "draft" | "live" | "registration_open" | "completed" | "cancelled";
  coverImage?: string;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

interface Session {
  _id: { toString(): string };
  eventId: { toString(): string };
  title: string;
  time: string;
  room: string;
  format: string;
  speakerIds?: string[];
  description?: string;
  status: string;
  createdAt: Date;
}

interface Speaker {
  _id: { toString(): string };
  name: string;
  email: string;
  bio: string;
  avatar?: string;
  title: string;
  expertise: string[];
  status: string;
  social?: Record<string, string>;
  createdAt: Date;
}

interface Sponsor {
  _id: { toString(): string };
  name: string;
  tier: string;
  logo?: string;
  website?: string;
  description?: string;
  deliverables?: string[];
  deliverablesCompleted: number;
  contact: { name: string; email: string };
  status: string;
  createdAt: Date;
}

interface TicketType {
  _id: { toString(): string };
  eventId: { toString(): string };
  name: string;
  description: string;
  price: number;
  currency: string;
  capacity: number;
  sold: number;
  waitlist: number;
  status: string;
  includes?: string[];
  createdAt: Date;
}

interface Attendee {
  _id: { toString(): string };
  eventId: { toString(): string };
  name: string;
  email: string;
  company?: string;
  title?: string;
  ticketType: string;
  status: string;
  bookedAt: Date;
  notes?: string;
  createdAt: Date;
}

async function main() {
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  console.log("Connected to MongoDB");

  const db = client.db(DB_NAME);

  // ── Drop & recreate collections (idempotent) ──
  const collections = [
    "users",
    "organizers",
    "venues",
    "events",
    "sessions",
    "speakers",
    "sponsors",
    "ticketTypes",
    "attendees",
  ];

  for (const name of collections) {
    try {
      await db.dropCollection(name);
    } catch {
      // collection may not exist — fine
    }
    await db.createCollection(name);
  }

  // ── Create indexes ──
  const users = db.collection<User>("users");
  const organizers = db.collection<Organizer>("organizers");
  const venues = db.collection<Venue>("venues");
  const events = db.collection<Event>("events");
  const sessions = db.collection<Session>("sessions");
  const speakers = db.collection<Speaker>("speakers");
  const sponsors = db.collection<Sponsor>("sponsors");
  const ticketTypes = db.collection<TicketType>("ticketTypes");
  const attendees = db.collection<Attendee>("attendees");

  await users.createIndex({ email: 1 }, { unique: true, name: "email_unique" });
  await users.createIndex({ email: 1, role: 1 }, { name: "email_role_idx" });
  await users.createIndex({ role: 1 }, { name: "role_idx" });

  await organizers.createIndex({ email: 1 }, { unique: true, name: "email_unique" });
  await organizers.createIndex({ name: 1 }, { name: "name_idx" });
  await organizers.createIndex({ createdAt: -1 }, { name: "createdAt_idx" });

  await venues.createIndex({ name: 1 }, { unique: true, name: "name_unique" });
  await venues.createIndex({ city: 1 }, { name: "city_idx" });
  await venues.createIndex({ type: 1 }, { name: "type_idx" });
  await venues.createIndex({ capacity: 1 }, { name: "capacity_idx" });

  await events.createIndex({ slug: 1 }, { unique: true, name: "slug_unique" });
  await events.createIndex({ title: 1 }, { name: "title_idx" });
  await events.createIndex({ startDate: 1 }, { name: "startDate_idx" });
  await events.createIndex({ endDate: 1 }, { name: "endDate_idx" });
  await events.createIndex({ status: 1 }, { name: "status_idx" });
  await events.createIndex({ organizerId: 1 }, { name: "organizerId_idx" });
  await events.createIndex({ venueId: 1 }, { name: "venueId_idx" });

  await sessions.createIndex({ eventId: 1, time: 1 }, { name: "event_time_idx" });
  await sessions.createIndex({ eventId: 1, room: 1 }, { name: "event_room_idx" });
  await sessions.createIndex({ status: 1 }, { name: "session_status_idx" });

  await speakers.createIndex({ email: 1 }, { unique: true, name: "email_unique" });
  await speakers.createIndex({ name: 1 }, { name: "name_idx" });
  await speakers.createIndex({ status: 1 }, { name: "status_idx" });

  await sponsors.createIndex({ name: 1 }, { unique: true, name: "name_unique" });
  await sponsors.createIndex({ tier: 1 }, { name: "tier_idx" });
  await sponsors.createIndex({ status: 1 }, { name: "status_idx" });

  await ticketTypes.createIndex({ eventId: 1, name: 1 }, { unique: true, name: "event_name_unique" });
  await ticketTypes.createIndex({ status: 1 }, { name: "ticket_status_idx" });
  await ticketTypes.createIndex({ eventId: 1 }, { name: "eventId_idx" });

  await attendees.createIndex({ email: 1 }, { unique: true, name: "email_unique" });
  await attendees.createIndex({ eventId: 1, email: 1 }, { unique: true, name: "event_email_unique" });
  await attendees.createIndex({ eventId: 1, ticketType: 1 }, { name: "event_ticketType_idx" });
  await attendees.createIndex({ status: 1 }, { name: "status_idx" });
  await attendees.createIndex({ createdAt: -1 }, { name: "createdAt_idx" });

  console.log("Indexes created");

  // ── Seed data ──

  // Organizers
  const orgIds = await organizers.insertMany([
    {
      _id: new (db.Client!.constructor as any).ObjectId(),
      name: "EventForge",
      email: "hello@eventforge.io",
      logo: "https://picsum.photos/seed/eventforge/200/60",
      website: "https://eventforge.io",
      industry: "Event Management",
      description: "Beautiful corporate events, brilliantly orchestrated.",
      contactName: "Jordan Ellis",
      contactEmail: "jordan@eventforge.io",
      contactPhone: "+1 (212) 555-0142",
      address: "350 5th Avenue, Suite 301, New York, NY 10118",
      createdAt: new Date("2026-01-15T00:00:00Z"),
      updatedAt: new Date("2026-01-15T00:00:00Z"),
    },
  ]);
  const eventForgeOrgId = orgIds.insertedIds[0];

  // Users: admin + 2 org users
  const passwordHash = "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl72PCf7QC6KFFwF3G3y8VzPy"; // bcrypt hash of "password123"

  const userIds = await users.insertMany([
    {
      _id: new (db.Client!.constructor as any).ObjectId(),
      email: "admin@eventforge.io",
      name: "EventForge Admin",
      role: "admin",
      password: passwordHash,
      organization: "EventForge",
      avatar: null,
      createdAt: new Date("2026-01-15T00:00:00Z"),
      updatedAt: new Date("2026-01-15T00:00:00Z"),
    },
    {
      _id: new (db.Client!.constructor as any).ObjectId(),
      email: "jordan@eventforge.io",
      name: "Jordan Ellis",
      role: "organizer",
      password: passwordHash,
      organization: "EventForge",
      avatar: "https://i.pravatar.cc/150?u=jordan",
      createdAt: new Date("2026-01-15T00:00:00Z"),
      updatedAt: new Date("2026-01-15T00:00:00Z"),
    },
    {
      _id: new (db.Client!.constructor as any).ObjectId(),
      email: "sam@eventforge.io",
      name: "Sam Rivera",
      role: "organizer",
      password: passwordHash,
      organization: "EventForge",
      avatar: "https://i.pravatar.cc/150?u=sam",
      createdAt: new Date("2026-01-15T00:00:00Z"),
      updatedAt: new Date("2026-01-15T00:00:00Z"),
    },
  ]);
  const adminUserId = userIds.insertedIds[0];
  const jordanUserId = userIds.insertedIds[1];
  const samUserId = userIds.insertedIds[2];

  // Venues
  const venueIds = await venues.insertMany([
    {
      _id: new (db.Client!.constructor as any).ObjectId(),
      name: "The Glasshouse",
      address: "425 5th Avenue, New York, NY 10016",
      city: "New York",
      country: "USA",
      capacity: 1500,
      rooms: 9,
      type: "physical",
      notes: "Modern event space with floor-to-ceiling windows overlooking Bryant Park. Main stage, 4 breakout rooms, 2 VIP lounges.",
      floorPlans: ["main-stage.png", "breakout-a.png", "breakout-b.png", "vip-lounge.png"],
      createdAt: new Date("2026-03-01T00:00:00Z"),
      updatedAt: new Date("2026-03-01T00:00:00Z"),
    },
    {
      _id: new (db.Client!.constructor as any).ObjectId(),
      name: "Convene Chicago",
      address: "500 W Madison St, Chicago, IL 60661",
      city: "Chicago",
      country: "USA",
      capacity: 640,
      rooms: 5,
      type: "physical",
      notes: "State-of-the-art event space in the heart of Fulton Market. 3 conference rooms, 1 workshop room, 1 executive boardroom.",
      floorPlans: ["fulton-a.png", "fulton-b.png", "fulton-c.png"],
      createdAt: new Date("2026-03-15T00:00:00Z"),
      updatedAt: new Date("2026-03-15T00:00:00Z"),
    },
    {
      _id: new (db.Client!.constructor as any).ObjectId(),
      name: "Online experience",
      city: "Online",
      country: "Global",
      capacity: 2000,
      rooms: 1,
      type: "virtual",
      notes: "Streaming platform with live chat, breakout rooms, and on-demand replay.",
      createdAt: new Date("2026-06-01T00:00:00Z"),
      updatedAt: new Date("2026-06-01T00:00:00Z"),
    },
  ]);
  const glasshouseId = venueIds.insertedIds[0];
  const conveenId = venueIds.insertedIds[1];
  const onlineId = venueIds.insertedIds[2];

  // Events
  const eventIds = await events.insertMany([
    {
      _id: new (db.Client!.constructor as any).ObjectId(),
      title: "Future of Work Summit",
      slug: "future-of-work-summit",
      description:
        "A two-day gathering for leaders shaping the next chapter of work. Explore AI, hybrid teams, and the future of leadership.",
      type: "Conference",
      startDate: new Date("2026-09-18T09:00:00Z"),
      endDate: new Date("2026-09-20T17:00:00Z"),
      venueId: glasshouseId,
      organizerId: jordanUserId,
      status: "live",
      coverImage:
        "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&q=80",
      tags: ["AI", "leadership", "hybrid-work", "future-of-work"],
      createdAt: new Date("2026-05-01T00:00:00Z"),
      updatedAt: new Date("2026-05-01T00:00:00Z"),
    },
    {
      _id: new (db.Client!.constructor as any).ObjectId(),
      title: "Northstar Leadership Lab",
      slug: "northstar-leadership-lab",
      description:
        "Small rooms, big questions, and practical tools for modern leadership. An immersive one-day workshop for senior leaders.",
      type: "Workshop",
      startDate: new Date("2026-10-02T09:00:00Z"),
      endDate: new Date("2026-10-02T17:00:00Z"),
      venueId: conveenId,
      organizerId: samUserId,
      status: "draft",
      coverImage:
        "https://images.unsplash.com/photo-1552664730-d307ca884978?w=1200&q=80",
      tags: ["leadership", "workshop", "senior-leaders"],
      createdAt: new Date("2026-06-15T00:00:00Z"),
      updatedAt: new Date("2026-06-15T00:00:00Z"),
    },
    {
      _id: new (db.Client!.constructor as any).ObjectId(),
      title: "Design Systems Workshop",
      slug: "design-systems-workshop",
      description:
        "A hands-on day for teams creating clearer, more human digital products. Learn to build and scale design systems.",
      type: "Workshop",
      startDate: new Date("2026-10-21T10:00:00Z"),
      endDate: new Date("2026-10-21T18:00:00Z"),
      venueId: onlineId,
      organizerId: jordanUserId,
      status: "registration_open",
      coverImage:
        "https://images.unsplash.com/photo-1581291518633-83b4ebd1d83e?w=1200&q=80",
      tags: ["design-systems", "UX", "component-libraries", "design-ops"],
      createdAt: new Date("2026-07-01T00:00:00Z"),
      updatedAt: new Date("2026-07-01T00:00:00Z"),
    },
  ]);
  const futureOfWorkId = eventIds.insertedIds[0];
  const northstarId = eventIds.insertedIds[1];
  const designSystemsId = eventIds.insertedIds[2];

  // Speakers
  const speakerIds = await speakers.insertMany([
    {
      _id: new (db.Client!.constructor as any).ObjectId(),
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
      _id: new (db.Client!.constructor as any).ObjectId(),
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
      _id: new (db.Client!.constructor as any).ObjectId(),
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
  const mayaSpeakerId = speakerIds.insertedIds[0];
  const theoSpeakerId = speakerIds.insertedIds[1];
  const noraSpeakerId = speakerIds.insertedIds[2];

  // Sessions
  const sessionIds = await sessions.insertMany([
    {
      _id: new (db.Client!.constructor as any).ObjectId(),
      eventId: futureOfWorkId,
      title: "Opening keynote: The human edge",
      time: "09:30",
      room: "Main stage",
      format: "Keynote",
      speakerIds: [mayaSpeakerId],
      description: "Dr. Maya Patel explores what makes us irreplaceable in an age of intelligent machines.",
      status: "Published",
      createdAt: new Date("2026-05-01T00:00:00Z"),
      updatedAt: new Date("2026-05-01T00:00:00Z"),
    },
    {
      _id: new (db.Client!.constructor as any).ObjectId(),
      eventId: futureOfWorkId,
      title: "Building with responsible AI",
      time: "11:00",
      room: "Atlas room",
      format: "Workshop",
      speakerIds: [theoSpeakerId],
      description: "Hands-on workshop on implementing responsible AI practices in product development.",
      status: "Speaker confirmed",
      createdAt: new Date("2026-05-01T00:00:00Z"),
      updatedAt: new Date("2026-05-01T00:00:00Z"),
    },
    {
      _id: new (db.Client!.constructor as any).ObjectId(),
      eventId: futureOfWorkId,
      title: "Culture as a growth engine",
      time: "13:15",
      room: "Forum room",
      format: "Panel",
      speakerIds: [],
      description: "Panel discussion on how culture drives organizational growth and resilience.",
      status: "Needs host",
      createdAt: new Date("2026-05-01T00:00:00Z"),
      updatedAt: new Date("2026-05-01T00:00:00Z"),
    },
    {
      _id: new (db.Client!.constructor as any).ObjectId(),
      eventId: northstarId,
      title: "Leading with clarity",
      time: "09:00",
      room: "Room A",
      format: "Workshop",
      speakerIds: [theoSpeakerId],
      description: "An interactive workshop on clear communication and decisive leadership.",
      status: "Draft",
      createdAt: new Date("2026-06-15T00:00:00Z"),
      updatedAt: new Date("2026-06-15T00:00:00Z"),
    },
    {
      _id: new (db.Client!.constructor as any).ObjectId(),
      eventId: northstarId,
      title: "The feedback loop",
      time: "11:30",
      room: "Room B",
      format: "Workshop",
      speakerIds: [],
      description: "Building feedback-rich cultures that drive continuous improvement.",
      status: "Draft",
      createdAt: new Date("2026-06-15T00:00:00Z"),
      updatedAt: new Date("2026-06-15T00:00:00Z"),
    },
    {
      _id: new (db.Client!.constructor as any).ObjectId(),
      eventId: designSystemsId,
      title: "Systems thinking for designers",
      time: "10:00",
      room: "Main hall",
      format: "Workshop",
      speakerIds: [noraSpeakerId],
      description: "How to think in systems and build design infrastructure that scales.",
      status: "Published",
      createdAt: new Date("2026-07-01T00:00:00Z"),
      updatedAt: new Date("2026-07-01T00:00:00Z"),
    },
    {
      _id: new (db.Client!.constructor as any).ObjectId(),
      eventId: designSystemsId,
      title: "From tokens to components",
      time: "14:00",
      room: "Track 1",
      format: "Workshop",
      speakerIds: [noraSpeakerId],
      description: "Hands-on session building a token-based design system from scratch.",
      status: "Published",
      createdAt: new Date("2026-07-01T00:00:00Z"),
      updatedAt: new Date("2026-07-01T00:00:00Z"),
    },
  ]);

  // Sponsors
  const sponsorIds = await sponsors.insertMany([
    {
      _id: new (db.Client!.constructor as any).ObjectId(),
      name: "Frame.io",
      tier: "Premier",
      logo: "https://i.pravatar.cc/300?u=frameio",
      website: "https://frame.io",
      description: "Video collaboration platform for creative teams.",
      deliverables: ["Logo on all materials", "Keynote sponsorship", "VIP lounge activation", "Social media featuring", "Attendee email mention", "Custom swag bag"],
      deliverablesCompleted: 4,
      contact: { name: "Alex Turner", email: "alex@frame.io" },
      status: "On track",
      createdAt: new Date("2026-05-01T00:00:00Z"),
      updatedAt: new Date("2026-08-01T00:00:00Z"),
    },
    {
      _id: new (db.Client!.constructor as any).ObjectId(),
      name: "Loom",
      tier: "Session",
      logo: "https://i.pravatar.cc/300?u=loom",
      website: "https://loom.com",
      description: "Async video messaging for modern teams.",
      deliverables: ["Session sponsorship", "Demo booth", "Social media mention"],
      deliverablesCompleted: 3,
      contact: { name: "Jamie Park", email: "jamie@loom.com" },
      status: "On track",
      createdAt: new Date("2026-05-15T00:00:00Z"),
      updatedAt: new Date("2026-08-15T00:00:00Z"),
    },
    {
      _id: new (db.Client!.constructor as any).ObjectId(),
      name: "Linear",
      tier: "Community",
      logo: "https://i.pravatar.cc/300?u=linear",
      website: "https://linear.app",
      description: "Streamlined issue tracking for ambitious teams.",
      deliverables: ["Community partner badge", "Job board listing", "Networking reception sponsorship"],
      deliverablesCompleted: 1,
      contact: { name: "Taylor Kim", email: "taylor@linear.app" },
      status: "Asset review",
      createdAt: new Date("2026-06-01T00:00:00Z"),
      updatedAt: new Date("2026-08-20T00:00:00Z"),
    },
  ]);

  // Ticket types
  const ticketTypeIds = await ticketTypes.insertMany([
    {
      _id: new (db.Client!.constructor as any).ObjectId(),
      eventId: futureOfWorkId,
      name: "General admission",
      description: "Full access to all conference sessions, workshops, and networking events.",
      price: 499,
      currency: "USD",
      capacity: 1000,
      sold: 842,
      waitlist: 42,
      status: "Active",
      includes: ["All keynotes", "All workshops", "Lunch both days", "Networking reception", "Digital materials"],
      createdAt: new Date("2026-05-01T00:00:00Z"),
      updatedAt: new Date("2026-05-01T00:00:00Z"),
    },
    {
      _id: new (db.Client!.constructor as any).ObjectId(),
      eventId: futureOfWorkId,
      name: "VIP admission",
      description: "Premium experience with VIP lounge access, speaker dinner, and priority seating.",
      price: 1299,
      currency: "USD",
      capacity: 250,
      sold: 196,
      waitlist: 0,
      status: "Active",
      includes: ["All general admission benefits", "VIP lounge access", "Speaker dinner", "Priority seating", "Signed photo with keynote speaker"],
      createdAt: new Date("2026-05-01T00:00:00Z"),
      updatedAt: new Date("2026-05-01T00:00:00Z"),
    },
    {
      _id: new (db.Client!.constructor as any).ObjectId(),
      eventId: designSystemsId,
      name: "Workshop add-on",
      description: "Optional deep-dive session on advanced design system patterns.",
      price: 99,
      currency: "USD",
      capacity: 120,
      sold: 0,
      waitlist: 0,
      status: "Waitlist",
      includes: ["4-hour deep-dive workshop", "Hands-on coding session", "Take-home code repository"],
      createdAt: new Date("2026-07-01T00:00:00Z"),
      updatedAt: new Date("2026-07-01T00:00:00Z"),
    },
  ]);

  // Attendees
  const attendeeIds = await attendees.insertMany([
    {
      _id: new (db.Client!.constructor as any).ObjectId(),
      eventId: futureOfWorkId,
      name: "Maya Patel",
      email: "maya.patel@example.com",
      company: "FutureTech Solutions",
      title: "Executive",
      ticketType: "VIP admission",
      status: "Confirmed",
      bookedAt: new Date("2026-08-12T00:00:00Z"),
      notes: "Dietary restrictions: vegetarian",
      createdAt: new Date("2026-08-12T00:00:00Z"),
      updatedAt: new Date("2026-08-12T00:00:00Z"),
    },
    {
      _id: new (db.Client!.constructor as any).ObjectId(),
      eventId: futureOfWorkId,
      name: "Theo Brooks",
      email: "theo.brooks@example.com",
      company: "Leadership First",
      title: "Workshop pass",
      ticketType: "General admission",
      status: "Needs approval",
      bookedAt: new Date("2026-08-21T00:00:00Z"),
      notes: "",
      createdAt: new Date("2026-08-21T00:00:00Z"),
      updatedAt: new Date("2026-08-21T00:00:00Z"),
    },
    {
      _id: new (db.Client!.constructor as any).ObjectId(),
      eventId: northstarId,
      name: "Priya Shah",
      email: "priya.shah@example.com",
      company: "Northstar Consulting",
      title: "Leadership pass",
      ticketType: "VIP admission",
      status: "Confirmed",
      bookedAt: new Date("2026-08-18T00:00:00Z"),
      notes: "Bringing a colleague — will update ticket count",
      createdAt: new Date("2026-08-18T00:00:00Z"),
      updatedAt: new Date("2026-08-18T00:00:00Z"),
    },
    {
      _id: new (db.Client!.constructor as any).ObjectId(),
      eventId: northstarId,
      name: "Marcus Lee",
      email: "marcus.lee@example.com",
      company: "Design Co",
      title: "General admission",
      ticketType: "General admission",
      status: "Waitlist",
      bookedAt: new Date("2026-08-30T00:00:00Z"),
      notes: "Moved from waitlist — pending payment",
      createdAt: new Date("2026-08-30T00:00:00Z"),
      updatedAt: new Date("2026-08-30T00:00:00Z"),
    },
    {
      _id: new (db.Client!.constructor as any).ObjectId(),
      eventId: designSystemsId,
      name: "Nora Chen",
      email: "nora.chen@example.com",
      company: "Design Systems Inc",
      title: "Speaker guest",
      ticketType: "VIP admission",
      status: "Confirmed",
      bookedAt: new Date("2026-08-09T00:00:00Z"),
      notes: "Complementary ticket as workshop facilitator",
      createdAt: new Date("2026-08-09T00:00:00Z"),
      updatedAt: new Date("2026-08-09T00:00:00Z"),
    },
    {
      _id: new (db.Client!.constructor as any).ObjectId(),
      eventId: designSystemsId,
      name: "Jules Carter",
      email: "jules.carter@example.com",
      company: "Product Lab",
      title: "Workshop pass",
      ticketType: "General admission",
      status: "Confirmed",
      bookedAt: new Date("2026-08-27T00:00:00Z"),
      notes: "",
      createdAt: new Date("2026-08-27T00:00:00Z"),
      updatedAt: new Date("2026-08-27T00:00:00Z"),
    },
  ]);

  console.log("Seed data inserted");

  // ── Verify ──
  console.log("\n=== VERIFICATION ===");

  const dbCheck = client.db(DB_NAME);
  console.log(`Database name: ${dbCheck.databaseName}`);

  const counts = {
    users: await users.countDocuments(),
    organizers: await organizers.countDocuments(),
    venues: await venues.countDocuments(),
    events: await events.countDocuments(),
    sessions: await sessions.countDocuments(),
    speakers: await speakers.countDocuments(),
    sponsors: await sponsors.countDocuments(),
    ticketTypes: await ticketTypes.countDocuments(),
    attendees: await attendees.countDocuments(),
  };
  console.log("Document counts:", counts);

  // Show events with venue names
  const eventDocs = await events.find({}).toArray();
  console.log("\nEvents:");
  for (const e of eventDocs) {
    const venue = await dbCheck.collection("venues").findOne({ _id: e.venueId });
    console.log(`  - ${e.title} (${e.type}) @ ${venue?.name || "unknown"} · ${e.status}`);
  }

  // Show attendees grouped by event
  console.log("\nAttendees:");
  const attendeeDocs = await attendees.find({}).toArray();
  for (const a of attendeeDocs) {
    const event = await dbCheck.collection("events").findOne({ _id: a.eventId });
    console.log(`  - ${a.name} · ${event?.title || "unknown"} · ${a.ticketType} · ${a.status}`);
  }

  // Show indexes
  console.log("\nIndexes:");
  const collNames = ["users", "organizers", "venues", "events", "sessions", "speakers", "sponsors", "ticketTypes", "attendees"];
  for (const name of collNames) {
    const indexes = await dbCheck.collection(name).listIndexes().toArray();
    const idxNames = indexes.map((i: any) => i.name);
    console.log(`  ${name}: ${idxNames.join(", ")}`);
  }

  await client.close();
  console.log("\nDone. Connection closed.");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
