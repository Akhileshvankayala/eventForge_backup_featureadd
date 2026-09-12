import { connectDB, getDb, closeDB } from "./db.js";
import { ObjectId } from "mongodb";
import bcrypt from "bcryptjs";
import { createUser } from "./models/user.js";
import { createEvent } from "./models/event.js";
import { createVenue } from "./models/venue.js";
import { createSession } from "./models/session.js";
import { createSpeaker } from "./models/speaker.js";
import { createSponsor } from "./models/sponsor.js";
import { createTicketType } from "./models/ticketType.js";
import { createPackage } from "./models/package.js";
import { createAnnouncement } from "./models/announcement.js";
import { createAttendee } from "./models/attendee.js";
import { nanoid } from "nanoid";

const NOW = new Date();
const TODAY = new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate());

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

async function seed() {
  console.log("🌱 Seeding eventForge database...\n");

  await connectDB();
  const db = getDb();

  // Drop existing collections for clean seed
  const collections = await db.listCollections().toArray();
  for (const col of collections) {
    await db.dropCollection(col.name);
  }
  console.log("✓ Cleared existing data\n");

  // ─── Users ─────────────────────────────────────────────────────────────────
  const adminHash = await bcrypt.hash("admin123", 12);
  const orgHash = await bcrypt.hash("organizer123", 12);
  const speakerHash = await bcrypt.hash("speaker123", 12);
  const attendeeHash = await bcrypt.hash("attendee123", 12);

  const admin = await createUser({
    email: "admin@eventforge.dev",
    passwordHash: adminHash,
    name: "Admin User",
    role: "admin",
    phone: "+1-555-0001",
    organization: "EventForge Inc.",
    bio: "System administrator with full access to all features.",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=admin",
  });

  const organizer = await createUser({
    email: "organizer@eventforge.dev",
    passwordHash: orgHash,
    name: "Sarah Mitchell",
    role: "organizer",
    phone: "+1-555-0002",
    organization: "TechSummit Collective",
    bio: "Event organizer with 8 years of experience in tech conferences.",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=sarah",
  });

  const staff = await createUser({
    email: "staff@eventforge.dev",
    passwordHash: orgHash,
    name: "James Okafor",
    role: "staff",
    phone: "+1-555-0003",
    organization: "TechSummit Collective",
    bio: "Operations staff, handles logistics and check-in.",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=james",
  });

  const speaker = await createUser({
    email: "speaker@eventforge.dev",
    passwordHash: speakerHash,
    name: "Dr. Priya Sharma",
    role: "speaker",
    phone: "+1-555-0004",
    organization: "MIT CSAIL",
    bio: "AI researcher specializing in NLP and large language models.",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=priya",
  });

  const attendee = await createUser({
    email: "attendee@eventforge.dev",
    passwordHash: attendeeHash,
    name: "Alex Chen",
    role: "attendee",
    phone: "+1-555-0005",
    organization: "Acme Corp",
    bio: "Software engineer interested in cloud architecture.",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=alex",
  });

  const sponsorUser = await createUser({
    email: "sponsor@eventforge.dev",
    passwordHash: orgHash,
    name: "Maria Santos",
    role: "sponsor",
    phone: "+1-555-0006",
    organization: "CloudNative Inc.",
    bio: "Sponsorship manager at CloudNative, a platinum-tier sponsor.",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=maria",
  });

  console.log("✓ Users created:", {
    admin: admin._id,
    organizer: organizer._id,
    staff: staff._id,
    speaker: speaker._id,
    attendee: attendee._id,
    sponsor: sponsorUser._id,
  });

  // ─── Venues ────────────────────────────────────────────────────────────────
  const venue1 = await createVenue({
    name: "Convention Center Grand Hall",
    slug: "convention-grand-hall",
    description: "The largest indoor venue in the city with state-of-the-art AV equipment.",
    address: "100 Convention Way",
    city: "San Francisco",
    state: "CA",
    country: "USA",
    postalCode: "94102",
    latitude: 37.7793,
    longitude: -122.4193,
    capacity: 5000,
    contactName: "Venue Manager",
    contactEmail: "venues@conventioncenter.com",
    contactPhone: "+1-415-555-0100",
    amenities: ["WiFi 6E", "LED Wall", "Dolby Sound", "Green Room", "Catering Kitchen", "Loading Dock"],
    amenitiesDetailed: {
      wifi: "WiFi 6E, 500+ concurrent devices",
      audio: "Dolby Atmos sound system, 20 m main screen",
      catering: "Full-service kitchen, 5000-person capacity",
      parking: "2000-space underground parking",
      accessibility: "Wheelchair accessible, 12 accessible stalls",
    },
    images: [
      "https://images.unsplash.com/photo-1540575467063-175a8f6196c6?w=800",
      "https://images.unsplash.com/photo-1505373869828-5e56b2cb1c1f?w=800",
    ],
    isVirtual: false,
  });

  const venue2 = await createVenue({
    name: "Innovation Hub Room A",
    slug: "innovation-hub-a",
    description: "A flexible breakout room perfect for workshops and small sessions.",
    address: "100 Convention Way",
    city: "San Francisco",
    state: "CA",
    country: "USA",
    postalCode: "94102",
    capacity: 150,
    amenities: ["Whiteboards", "Projector", "HDMI", "WiFi", "Sound System"],
    amenitiesDetailed: { audio: "Built-in ceiling speakers", seating: "Configurable seating for 150" },
    images: ["https://images.unsplash.com/photo-1497366216548-37526070297c?w=800"],
    isVirtual: false,
  });

  const virtualVenue = await createVenue({
    name: "EventForge Virtual Platform",
    slug: "eventforge-virtual",
    description: "Fully virtual event experience with live streaming and virtual networking.",
    address: "Online",
    city: "Virtual",
    country: "Global",
    capacity: 100000,
    amenities: ["Live Streaming", "Chat", "Virtual Booths", "Q&A", "Polls"],
    amenitiesDetailed: { streaming: "HLS streaming, up to 100k viewers", chat: "Real-time moderated chat" },
    images: ["https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800"],
    isVirtual: true,
    virtualUrl: "https://virtual.eventforge.dev",
  });

  console.log("✓ Venues created:", { venue1: venue1._id, venue2: venue2._id, virtual: virtualVenue._id });

  // ─── Events ────────────────────────────────────────────────────────────────
  const event1 = await createEvent({
    title: "TechSummit 2026",
    slug: "techsummit-2026",
    description: `TechSummit 2026 is the premier technology conference bringing together the brightest minds in software engineering, AI, cloud computing, and product design. With over 5,000 attendees, 80+ speakers, and 40+ sessions across two days, this is the event of the year for tech professionals.

From deep-dive workshops to inspirational keynotes, hands-on labs to panel discussions, TechSummit 2026 offers something for every level of expertise. Network with peers, discover emerging technologies, and leave with actionable insights you can apply immediately.`,
    shortDescription: "The premier technology conference — 2 days, 80+ speakers, 5000+ attendees.",
    status: "published",
    type: "Conference",
    startDate: new Date(TODAY.getTime() + 60 * 24 * 60 * 60 * 1000),
    endDate: new Date(TODAY.getTime() + 61 * 24 * 60 * 60 * 1000),
    startTime: "09:00",
    endTime: "18:00",
    timezone: "America/Los_Angeles",
    organizerId: organizer._id!,
    venueId: venue1._id!,
    coverImage: "https://images.unsplash.com/photo-1540575467063-175a8f6196c6?w=1200",
    bannerImage: "https://images.unsplash.com/photo-1505373869828-5e56b2cb1c1f?w=1600",
    location: "San Francisco Convention Center",
    address: "100 Convention Way, San Francisco, CA 94102",
    city: "San Francisco",
    country: "USA",
    isOnline: false,
    capacity: 5000,
    price: 599,
    currency: "USD",
    tagIds: ["technology", "conference", "ai", "cloud", "engineering"],
    categoryIds: ["tech-conference", "annual"],
    visibility: "public",
    features: ["Keynotes", "Workshops", "Hands-on Labs", "Networking Sessions", "Expo Hall", "Career Fair"],
    notes: "Badge pickup starts at 8:00 AM. Breakfast and lunch included.",
  });

  const event2 = await createEvent({
    title: "AI Frontiers Summit",
    slug: "ai-frontiers-2026",
    description: `The AI Frontiers Summit explores the cutting edge of artificial intelligence — from large language models and computer vision to reinforcement learning and AI ethics. Designed for researchers, engineers, and decision-makers who want to understand where AI is heading.

This virtual event connects you with leading AI labs, startups, and open-source communities worldwide.`,
    shortDescription: "Virtual summit on the future of AI — LLMs, vision, RL, ethics.",
    status: "published",
    type: "Summit",
    startDate: new Date(TODAY.getTime() + 120 * 24 * 60 * 60 * 1000),
    endDate: new Date(TODAY.getTime() + 120 * 24 * 60 * 60 * 1000),
    startTime: "10:00",
    endTime: "17:00",
    timezone: "UTC",
    organizerId: organizer._id!,
    venueId: virtualVenue._id!,
    coverImage: "https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=1200",
    isOnline: true,
    onlineUrl: "https://virtual.eventforge.dev/ai-frontiers",
    capacity: 100000,
    price: 299,
    currency: "USD",
    tagIds: ["ai", "machine-learning", "llms", "virtual"],
    categoryIds: ["ai-summit", "virtual-event"],
    visibility: "public",
    features: ["Live Keynotes", "Virtual Networking", "Sponsor Booths", "Q&A Sessions"],
    notes: "All sessions streamed live with on-demand access for 30 days post-event.",
  });

  const event3 = await createEvent({
    title: "DevOps Days: Local Edition",
    slug: "devops-days-local-2026",
    description: `A community-driven one-day event for DevOps practitioners. Share your experiences, learn from peers, and discover practical techniques for building, deploying, and operating modern software systems.

Lightning talks, hallway track, and great food — the hallmarks of a classic DevOps Days event.`,
    shortDescription: "One-day community DevOps event with lightning talks and networking.",
    status: "draft",
    type: "Workshop",
    startDate: new Date(TODAY.getTime() + 45 * 24 * 60 * 60 * 1000),
    endDate: new Date(TODAY.getTime() + 45 * 24 * 60 * 60 * 1000),
    startTime: "09:00",
    endTime: "17:00",
    timezone: "America/Los_Angeles",
    organizerId: organizer._id!,
    venueId: venue2._id!,
    coverImage: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1200",
    city: "San Francisco",
    country: "USA",
    isOnline: false,
    capacity: 150,
    price: 99,
    currency: "USD",
    tagIds: ["devops", "community", "workshop"],
    categoryIds: ["workshop", "community"],
    visibility: "public",
    features: ["Lightning Talks", "Hallway Track", "Sponsor Tabls"],
  });

  console.log("✓ Events created:", { event1: event1._id, event2: event2._id, event3: event3._id });

  // ─── Speakers ──────────────────────────────────────────────────────────────
  const sp1 = await createSpeaker({
    name: "Dr. Priya Sharma",
    slug: "dr-priya-sharma",
    email: "priya.sharma@mit.edu",
    bio: `Dr. Priya Sharma is a research scientist at MIT CSAIL, where she leads the Natural Language Understanding group. Her work focuses on making large language models more reliable, interpretable, and aligned with human values. She holds a Ph.D. in Computer Science from Stanford and has published over 40 papers in top-tier conferences including NeurIPS, ACL, and ICML.

Before MIT, she spent three years at Google Research working on the Gemini project. She is a recipient of the MIT Technology Review "35 Under 35" award and frequently speaks at international AI conferences.`,
    shortBio: "AI researcher at MIT CSAIL, specializing in NLP and LLMs. MIT Technology Review 35 Under 35.",
    title: "Research Scientist",
    company: "MIT CSAIL",
    website: "https://priyasharma.dev",
    linkedin: "https://linkedin.com/in/priya-sharma-ai",
    twitter: "https://twitter.com/priyasharma_ai",
    topics: ["Large Language Models", "NLP", "AI Safety", "Machine Learning", "Interpretability"],
    sessionIds: [],
    isVirtual: false,
    contactEmail: "priya@mit.edu",
  });

  const sp2 = await createSpeaker({
    name: "Marcus Johnson",
    slug: "marcus-johnson",
    email: "marcus@cloudnative.io",
    bio: `Marcus Johnson is the CTO and co-founder of CloudNative Inc., a platform that helps teams deploy and monitor distributed systems at scale. He has spent the last decade working on infrastructure engineering, site reliability, and platform design at companies ranging from early-stage startups to Fortune 100 enterprises.

He is the author of "Operating Kubernetes in Production" and a regular contributor to the CNCF community. Marcus holds a B.S. in Computer Engineering from UC Berkeley and is a certified Kubernetes Administrator (CKA).`,
    shortBio: "CTO of CloudNative Inc., author of 'Operating Kubernetes in Production', CNCF contributor.",
    title: "CTO & Co-founder",
    company: "CloudNative Inc.",
    website: "https://cloudnative.io",
    linkedin: "https://linkedin.com/in/marcus-johnson",
    github: "https://github.com/marcusj",
    topics: ["Kubernetes", "DevOps", "Platform Engineering", "Observability", "Cloud Architecture"],
    sessionIds: [],
    isVirtual: false,
    contactEmail: "marcus@cloudnative.io",
  });

  const sp3 = await createSpeaker({
    name: "Elena Rodriguez",
    slug: "elena-rodriguez",
    email: "elena@designlab.co",
    bio: `Elena Rodriguez is a design leader and principal designer at DesignLab, where she leads UX strategy for enterprise SaaS products. She has spent 12 years bridging the gap between design, engineering, and product management, and is known for her work on inclusive design systems and accessibility-first interfaces.

Elena is a frequent speaker at UX conferences and a teaching fellow at the Nielsen Norman Group. She holds an MFA in Interaction Design from the California College of the Arts.`,
    shortBio: "Principal Designer at DesignLab, UX strategy and inclusive design specialist.",
    title: "Principal Designer",
    company: "DesignLab",
    website: "https://elenarodriguez.design",
    linkedin: "https://linkedin.com/in/elena-rodriguez-ux",
    topics: ["UX Design", "Design Systems", "Accessibility", "Product Strategy", "Inclusive Design"],
    sessionIds: [],
    isVirtual: false,
    contactEmail: "elena@designlab.co",
  });

  console.log("✓ Speakers created:", { sp1: sp1._id, sp2: sp2._id, sp3: sp3._id });

  // ─── Sessions ──────────────────────────────────────────────────────────────
  const s1 = await createSession({
    eventId: event1._id!,
    title: "The Future of Large Language Models",
    slug: "future-of-llms-keynote",
    description: `In this keynote, Dr. Priya Sharma explores where large language models are headed over the next 3-5 years. From multi-modal architectures to reasoning capabilities and alignment challenges, this session will give you a grounded view of what's coming next in AI.

Expect a mix of technical depth and strategic perspective — suitable for both ML engineers and tech leaders.`,
    shortDescription: "Keynote exploring where LLMs are headed: multi-modal, reasoning, alignment.",
    type: "Keynote",
    status: "scheduled",
    startTime: new Date(TODAY.getTime() + 60 * 24 * 60 * 60 * 1000 + 9 * 60 * 60 * 1000),
    endTime: new Date(TODAY.getTime() + 60 * 24 * 60 * 60 * 1000 + 10 * 60 * 60 * 1000),
    duration: 60,
    timezone: "America/Los_Angeles",
    speakerIds: [sp1._id!],
    venueId: venue1._id!,
    roomName: "Grand Hall",
    capacity: 5000,
    currentAttendees: 2300,
    isFree: false,
    price: 0,
    currency: "USD",
    coverImage: "https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=400",
    tags: ["AI", "LLM", "Keynote", "Future"],
    resources: [],
    livestreamUrl: undefined,
  });

  const s2 = await createSession({
    eventId: event1._id!,
    title: "Kubernetes at Scale: Lessons from 10 Million Pods",
    slug: "kubernetes-at-scale-10m-pods",
    description: `Marcus Johnson shares hard-won lessons from operating one of the world's largest Kubernetes deployments. This session covers cluster design, resource management, observability strategies, and the operational patterns that kept the platform stable through hypergrowth.

Attendees will walk away with concrete recommendations for running Kubernetes at scale, regardless of their cluster size.`,
    shortDescription: "Real-world lessons from running Kubernetes at 10-million-pod scale.",
    type: "Technical Session",
    status: "scheduled",
    startTime: new Date(TODAY.getTime() + 60 * 24 * 60 * 60 * 1000 + 11 * 60 * 60 * 1000),
    endTime: new Date(TODAY.getTime() + 60 * 24 * 60 * 60 * 1000 + 12 * 60 * 60 * 1000),
    duration: 60,
    timezone: "America/Los_Angeles",
    speakerIds: [sp2._id!],
    venueId: venue2._id!,
    roomName: "Innovation Hub A",
    capacity: 150,
    currentAttendees: 142,
    isFree: false,
    price: 0,
    currency: "USD",
    coverImage: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=400",
    tags: ["Kubernetes", "DevOps", "Scale", "Infrastructure"],
    resources: ["https://slides.example.com/k8s-scale"],
    livestreamUrl: undefined,
  });

  const s3 = await createSession({
    eventId: event1._id!,
    title: "Designing for Everyone: Inclusive UX in Practice",
    slug: "inclusive-ux-design-practice",
    description: `Elena Rodriguez walks through practical techniques for building inclusive, accessible products that work for everyone. From color contrast and keyboard navigation to screen reader testing and inclusive research methods, this workshop will change how you think about design.

Bring your laptop — there will be hands-on exercises.`,
    shortDescription: "Hands-on workshop on building inclusive, accessible UX.",
    type: "Workshop",
    status: "scheduled",
    startTime: new Date(TODAY.getTime() + 60 * 24 * 60 * 60 * 1000 + 14 * 60 * 60 * 1000),
    endTime: new Date(TODAY.getTime() + 60 * 24 * 60 * 60 * 1000 + 16 * 60 * 60 * 1000),
    duration: 120,
    timezone: "America/Los_Angeles",
    speakerIds: [sp3._id!],
    venueId: venue2._id!,
    roomName: "Innovation Hub A",
    capacity: 40,
    currentAttendees: 38,
    isFree: false,
    price: 0,
    currency: "USD",
    coverImage: "https://images.unsplash.com/photo-1581291518633-83b4ebd1d83e?w=400",
    tags: ["UX", "Accessibility", "Workshop", "Inclusive Design"],
    resources: [],
    livestreamUrl: undefined,
  });

  const s4 = await createSession({
    eventId: event2._id!,
    title: "Alignment in the Age of LLMs",
    slug: "alignment-age-of-llms",
    description: `A deep dive into AI alignment challenges as models become more capable. Dr. Sharma discusses RLHF, constitutional AI, interpretability tools, and the open research problems that will define the next few years of AI safety work.`,
    shortDescription: "Exploring RLHF, constitutional AI, and open problems in AI safety.",
    type: "Keynote",
    status: "scheduled",
    startTime: new Date(TODAY.getTime() + 120 * 24 * 60 * 60 * 1000 + 10 * 60 * 60 * 1000),
    endTime: new Date(TODAY.getTime() + 120 * 24 * 60 * 60 * 1000 + 11 * 60 * 60 * 1000),
    duration: 60,
    timezone: "UTC",
    speakerIds: [sp1._id!],
    venueId: virtualVenue._id!,
    roomName: "Main Stage",
    capacity: 100000,
    currentAttendees: 12400,
    isFree: false,
    price: 0,
    currency: "USD",
    coverImage: "https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=400",
    tags: ["AI Safety", "Alignment", "RLHF", "Keynote"],
    livestreamUrl: "https://virtual.eventforge.dev/ai-frontiers/main-stage",
  });

  console.log("✓ Sessions created:", { s1: s1._id, s2: s2._id, s3: s3._id, s4: s4._id });

  // Update speakers with session IDs
  await (await import("./models/speaker.js")).updateSpeaker(sp1._id!, { sessionIds: [s1._id!, s4._id!] });
  await (await import("./models/speaker.js")).updateSpeaker(sp2._id!, { sessionIds: [s2._id!] });
  await (await import("./models/speaker.js")).updateSpeaker(sp3._id!, { sessionIds: [s3._id!] });

  // ─── Ticket Types ──────────────────────────────────────────────────────────
  const earlyBird = await createTicketType({
    eventId: event1._id!,
    name: "Early Bird Pass",
    slug: "early-bird-pass",
    description: "Limited-time early bird pricing — offer ends soon.",
    price: 399,
    currency: "USD",
    status: "active",
    totalQuantity: 500,
    remainingQuantity: 500,
    soldQuantity: 0,
    minQuantity: 1,
    maxQuantity: 4,
    salesStart: TODAY,
    salesEnd: new Date(TODAY.getTime() + 30 * 24 * 60 * 60 * 1000),
    whatsIncluded: ["2-day conference pass", "All keynotes", "All technical sessions", "Workshop access", "Lunch both days", "Coffee breaks", "Expo hall access", "Conference swag bag", "Networking reception"],
    refundPolicy: "Full refund up to 30 days before the event. 50% refund up to 14 days before. No refunds within 14 days.",
    earlyBird: true,
    groupDiscount: true,
  });

  const standard = await createTicketType({
    eventId: event1._id!,
    name: "Standard Pass",
    slug: "standard-pass",
    description: "Full two-day conference access at regular pricing.",
    price: 599,
    currency: "USD",
    status: "active",
    totalQuantity: 4000,
    remainingQuantity: 4000,
    soldQuantity: 0,
    minQuantity: 1,
    maxQuantity: 10,
    salesStart: TODAY,
    salesEnd: new Date(TODAY.getTime() + 58 * 24 * 60 * 60 * 1000),
    whatsIncluded: ["2-day conference pass", "All keynotes", "All technical sessions", "Workshop access", "Lunch both days", "Coffee breaks", "Expo hall access", "Conference swag bag", "Networking reception"],
    refundPolicy: "Full refund up to 30 days before the event. 50% refund up to 14 days before. No refunds within 14 days.",
    earlyBird: false,
    groupDiscount: true,
  });

  const vip = await createTicketType({
    eventId: event1._id!,
    name: "VIP Experience",
    slug: "vip-experience",
    description: "Premium access including VIP lounge, speaker meet-and-greet, and exclusive dinner.",
    price: 1499,
    currency: "USD",
    status: "active",
    totalQuantity: 100,
    remainingQuantity: 100,
    soldQuantity: 0,
    minQuantity: 1,
    maxQuantity: 2,
    salesStart: TODAY,
    salesEnd: new Date(TODAY.getTime() + 58 * 24 * 60 * 60 * 1000),
    whatsIncluded: ["Everything in Standard Pass", "VIP lounge access", "Speaker meet-and-greet", "Exclusive VIP dinner", "Reserved seating at keynotes", "Priority workshop registration", "Dedicated concierge", "Macaron & champagne breakfast"],
    refundPolicy: "Full refund up to 45 days before the event. No refunds within 45 days.",
    earlyBird: false,
    groupDiscount: false,
  });

  const student = await createTicketType({
    eventId: event1._id!,
    name: "Student Pass",
    slug: "student-pass",
    description: "Verified students get discounted access. Bring your student ID.",
    price: 149,
    currency: "USD",
    status: "active",
    totalQuantity: 200,
    remainingQuantity: 200,
    soldQuantity: 0,
    minQuantity: 1,
    maxQuantity: 1,
    salesStart: TODAY,
    salesEnd: new Date(TODAY.getTime() + 58 * 24 * 60 * 60 * 1000),
    whatsIncluded: ["2-day conference pass", "All keynotes", "All technical sessions", "Lunch both days", "Coffee breaks", "Expo hall access"],
    refundPolicy: "Full refund up to 14 days before the event.",
    earlyBird: false,
    groupDiscount: false,
  });

  const aiTicket = await createTicketType({
    eventId: event2._id!,
    name: "AI Frontiers Pass",
    slug: "ai-frontiers-pass",
    description: "Full access to all AI Frontiers Summit sessions and recordings.",
    price: 299,
    currency: "USD",
    status: "active",
    totalQuantity: 50000,
    remainingQuantity: 50000,
    soldQuantity: 0,
    minQuantity: 1,
    maxQuantity: 5,
    salesStart: TODAY,
    salesEnd: new Date(TODAY.getTime() + 118 * 24 * 60 * 60 * 1000),
    whatsIncluded: ["All keynotes", "All technical sessions", "Virtual networking", "30-day on-demand access", "Session recordings", "Sponsor booth access"],
    refundPolicy: "Full refund up to 14 days before the event.",
    earlyBird: true,
    groupDiscount: true,
  });

  console.log("✓ Ticket types created:", { earlyBird: earlyBird._id, standard: standard._id, vip: vip._id, student: student._id, ai: aiTicket._id });

  // ─── Sponsors ──────────────────────────────────────────────────────────────
  const sponsor1 = await createSponsor({
    eventId: event1._id!,
    name: "CloudNative Inc.",
    slug: "cloudnative-inc",
    company: "CloudNative Inc.",
    tier: "platinum",
    description: `CloudNative Inc. is the leading platform for running distributed systems at scale. Trusted by thousands of engineering teams worldwide, CloudNative helps organizations build, deploy, and operate Kubernetes-native applications with confidence.

As the platinum sponsor of TechSummit 2026, CloudNative is bringing their full team to connect with the community. Visit their booth to see live demos, talk to engineers, and learn about the latest platform features.`,
    logo: "https://images.unsplash.com/photo-1667372393119-3d451f77c728?w=400",
    website: "https://cloudnative.io",
    contactName: "Maria Santos",
    contactEmail: "sponsors@cloudnative.io",
    contactPhone: "+1-555-1001",
    boothNumber: "A-01",
    boothSize: "3x3",
    socialLinks: { linkedin: "https://linkedin.com/company/cloudnative", twitter: "https://twitter.com/cloudnative" },
  });

  const sponsor2 = await createSponsor({
    eventId: event1._id!,
    name: "DataStream Technologies",
    slug: "datastream-tech",
    company: "DataStream Technologies",
    tier: "gold",
    description: `DataStream provides real-time data infrastructure for modern applications. Their streaming platform processes billions of events daily for customers in fintech, gaming, and e-commerce. At TechSummit, DataStream will showcase their latest features for event-driven architectures.`,
    logo: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400",
    website: "https://datastream.dev",
    contactName: "Raj Patel",
    contactEmail: "sponsors@datastream.dev",
    contactPhone: "+1-555-1002",
    boothNumber: "B-04",
    boothSize: "2x2",
    socialLinks: { linkedin: "https://linkedin.com/company/datastream" },
  });

  const sponsor3 = await createSponsor({
    eventId: event1._id!,
    name: "Design Systems Co.",
    slug: "design-systems-co",
    company: "Design Systems Co.",
    tier: "silver",
    description: `Design Systems Co. helps teams build and maintain consistent, scalable design systems. Their open-source toolkit is used by over 500 product teams globally. Stop by their booth to see their latest component library and design token management tools.`,
    logo: "https://images.unsplash.com/photo-1561070791-2526d30994b5?w=400",
    website: "https://designsystems.co",
    contactName: "Elena Rodriguez",
    contactEmail: "sponsors@designsystems.co",
    boothNumber: "C-12",
    boothSize: "1x1",
    socialLinks: { github: "https://github.com/designsystems-co" },
  });

  const sponsor4 = await createSponsor({
    eventId: event2._id!,
    name: "AI Research Labs",
    slug: "ai-research-labs",
    company: "AI Research Labs",
    tier: "gold",
    description: `AI Research Labs is an independent research organization focused on advancing the frontier of machine learning. They publish open-source models, datasets, and research papers, and are committed to making AI research accessible to everyone.`,
    logo: "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=400",
    website: "https://airlabs.research",
    contactName: "Dr. Kenji Watanabe",
    contactEmail: "sponsors@airlabs.research",
    boothNumber: "Virtual-Booth-01",
    socialLinks: { twitter: "https://twitter.com/airlabs_research", github: "https://github.com/airlabs" },
  });

  console.log("✓ Sponsors created:", { s1: sponsor1._id, s2: sponsor2._id, s3: sponsor3._id, s4: sponsor4._id });

  // ─── Packages ──────────────────────────────────────────────────────────────
  const sponsorshipPackage = await createPackage({
    eventId: event1._id!,
    name: "Platinum Sponsorship",
    slug: "platinum-sponsorship",
    description: "Maximum visibility at TechSummit 2026 — the premier tech conference.",
    price: 25000,
    currency: "USD",
    status: "active",
    features: ["Keynote speaking slot (15 min)", "Sponsor logo on all materials", "Virtual & physical booth", "10 conference passes", "VIP dinner access", "Social media mentions", "Lead retrieval system", "Post-event attendee list"],
    inclusions: ["Main stage presence", "Expo hall prime location", "Full conference access for 10 attendees", "2-page ad in conference program"],
    exclusions: ["Workshop speaking slots", "One-on-one meeting with keynote speakers"],
    terms: "Sponsorship fees are non-refundable after June 1, 2026. Additional conference passes available at standard rates.",
  });

  const goldPackage = await createPackage({
    eventId: event1._id!,
    name: "Gold Sponsorship",
    slug: "gold-sponsorship",
    description: "High-visibility sponsorship package for maximum impact.",
    price: 12000,
    currency: "USD",
    status: "active",
    features: ["Panel participation (1 session)", "Sponsor logo on website", "Physical booth", "6 conference passes", "Social media mention", "Lead retrieval system"],
    inclusions: ["Expo hall location", "Full conference access for 6 attendees", "Logo placement on event app"],
    exclusions: ["Keynote speaking slot", "VIP dinner access"],
  });

  const silverPackage = await createPackage({
    eventId: event1._id!,
    name: "Silver Sponsorship",
    slug: "silver-sponsorship",
    description: "Great visibility for emerging sponsors.",
    price: 5000,
    currency: "USD",
    status: "active",
    features: ["Sponsor logo on website", "Booth space", "4 conference passes", "Digital brochure inclusion"],
    inclusions: ["Standard booth location", "Conference access for 4 attendees", "Logo on event website"],
    exclusions: ["Speaking opportunities", "Social media features", "VIP areas"],
  });

  console.log("✓ Packages created:", { platinum: sponsorshipPackage._id, gold: goldPackage._id, silver: silverPackage._id });

  // ─── Announcements ─────────────────────────────────────────────────────────
  const announce1 = await createAnnouncement({
    eventId: event1._id!,
    title: "Early Bird Pricing Ending Soon",
    body: "Don't miss out! Early bird passes at $399 are available for just 2 more weeks. After that, prices go up to $599. Register now to secure your spot at the best price.",
    type: "promo",
    target: "all",
    isActive: true,
    priority: 5,
    authorId: organizer._id!,
  });

  const announce2 = await createAnnouncement({
    eventId: event1._id!,
    title: "Call for Workshop Proposals",
    body: "We're now accepting workshop proposals for TechSummit 2026. Workshops are 90-120 minute hands-on sessions. Submit your proposal by March 31 for consideration. Selected workshop leaders receive a free conference pass.",
    type: "info",
    target: "all",
    isActive: true,
    priority: 3,
    authorId: organizer._id!,
  });

  const announce3 = await createAnnouncement({
    eventId: event1._id!,
    title: "⚠️ Venue Change Notification",
    body: "Please note: The main keynote will now be held in the Grand Hall (Level 2) instead of the West Wing Auditorium. All other sessions remain at their originally scheduled locations. Please update your event app.",
    type: "warning",
    target: "attendees",
    isActive: true,
    priority: 7,
    authorId: staff._id!,
  });

  const announce4 = await createAnnouncement({
    eventId: event3._id!,
    title: "DevOps Days Agenda Published",
    body: "The full agenda for DevOps Days Local Edition is now available. Check out the speaker lineup, session descriptions, and schedule. We've also released the attendee guide with venue info, parking instructions, and Wi-Fi details.",
    type: "info",
    target: "all",
    isActive: true,
    priority: 3,
    authorId: organizer._id!,
  });

  console.log("✓ Announcements created:", { a1: announce1._id, a2: announce2._id, a3: announce3._id, a4: announce4._id });

  // ─── Attendees (sample registrations) ──────────────────────────────────────
  const attendee1 = await createAttendee({
    eventId: event1._id!,
    userId: attendee._id!,
    firstName: "Alex",
    lastName: "Chen",
    email: "alex@acme.com",
    phone: "+1-555-2001",
    organization: "Acme Corp",
    jobTitle: "Senior Software Engineer",
    dietaryRequirements: ["vegetarian"],
    accessibilityRequirements: [],
    registrationStatus: "approved",
    ticketTypeId: earlyBird._id!,
    ticketTypePrice: 399,
    checkedIn: false,
    qrCode: nanoid(21),
  });

  const attendee2 = await createAttendee({
    eventId: event1._id!,
    userId: attendee._id!,
    firstName: "Jordan",
    lastName: "Lee",
    email: "jordan@startup.io",
    phone: "+1-555-2002",
    organization: "StartupIO",
    jobTitle: "Product Manager",
    dietaryRequirements: ["vegan", "gluten-free"],
    accessibilityRequirements: ["wheelchair accessible seating"],
    emergencyContactName: "Sam Lee",
    emergencyContactPhone: "+1-555-9001",
    registrationStatus: "approved",
    ticketTypeId: vip._id!,
    ticketTypePrice: 1499,
    checkedIn: false,
    qrCode: nanoid(21),
  });

  const attendee3 = await createAttendee({
    eventId: event1._id!,
    firstName: "Taylor",
    lastName: "Kim",
    email: "taylor@designlab.co",
    phone: "+1-555-2003",
    organization: "DesignLab",
    jobTitle: "UX Designer",
    registrationStatus: "pending",
    ticketTypeId: standard._id!,
    ticketTypePrice: 599,
    checkedIn: false,
    qrCode: nanoid(21),
  });

  const attendee4 = await createAttendee({
    eventId: event1._id!,
    firstName: "Morgan",
    lastName: "Davis",
    email: "morgan@example.com",
    phone: "+1-555-2004",
    organization: "Freelance",
    jobTitle: "Independent Consultant",
    registrationStatus: "waitlisted",
    ticketTypeId: standard._id!,
    ticketTypePrice: 599,
    checkedIn: false,
    qrCode: nanoid(21),
    waitlistPosition: 3,
  });

  console.log("✓ Attendees created:", { a1: attendee1._id, a2: attendee2._id, a3: attendee3._id, a4: attendee4._id });

  console.log("\n✅ Seed complete!");
  console.log("\n📋 Sample credentials:");
  console.log(`   Admin:    admin@eventforge.dev / admin123`);
  console.log(`   Organizer: organizer@eventforge.dev / organizer123`);
  console.log(`   Speaker:  speaker@eventforge.dev / speaker123`);
  console.log(`   Attendee: attendee@eventforge.dev / attendee123`);
  console.log(`   Sponsor:  sponsor@eventforge.dev / organizer123`);
  console.log("\n📡 API available at: http://localhost:3000/api");
}

seed()
  .then(() => {
    console.log("\n✨ Done. You can now start the server with: npm run dev");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  })
  .finally(() => closeDB());
