# EventForge Knowledge Guide

This document is the static half of the EventForge AI knowledge base. It is
exported to `guide.pdf` (run `node backend/knowledge/build-pdf.mjs`). The
dynamic half is retrieved live from the database, scoped to the asking user —
organizers see their own events, attendees see published events plus their own
registrations, admins see everything.

## What is EventForge

EventForge is a corporate event and conference management platform. Companies
and event agencies plan conferences, workshops, exhibitions, and corporate
events: event creation, venues, speakers, sessions, sponsors, registrations,
tickets, staff assignments, and attendee communication. The app has three
main surfaces: the landing page (public event calendar), the organizer
workspace (`/organizer`, dashboard plus seven management tabs), and the
attendee space (`/attendee`, event discovery plus ticket wallet).

## Roles

- Platform Admin: manages organizations, subscription settings, users, and
  global policies. Sees all data across every organizer.
- Event Organizer: creates events and manages venues, sessions, speakers,
  sponsors, tickets, and event operations. Sees only their own events.
- Event Staff: handles check-in, session attendance, venue operations, and
  attendee support. Sees the events they are assigned to.
- Speaker: manages speaker profile, sessions, presentation material, and
  availability.
- Attendee: registers for events, selects sessions, manages tickets, and
  provides feedback. Sees published events.
- Sponsor: manages sponsorship packages, brand assets, and assigned
  deliverables.

## Accounts and sign-in

Open the Auth page from "Organizer sign in" (organizer role) or "My tickets"
(attendee role) in the landing nav. Pick the Attendee or Organizer tab, then
either create an account (Full name, Work email, Password with a show/hide
eye toggle) or sign in (email plus password). After sign-in, organizers,
admins, and staff land on `/organizer`, everyone else on `/attendee`. If you
started from a specific event ("Sign in to continue to <event>"), booking
continues after login. Pages are guarded by role: visiting a page your role
cannot use redirects you back. Signing out (sidebar Log out) clears the
session and returns to the landing page. The header and sidebar always show
the currently signed-in account — if you see another user's name, sign out
fully and sign back in.

## Landing page

The public home has a nav (logo back to top, "My tickets" to attendee
sign-in, "Organizer sign in" to organizer sign-in), a hero with the headline
"Ideas are better together" and two actions ("Explore events" scrolls to the
event calendar, "View my tickets" goes to attendee sign-in), then "The event
calendar" grid of published events. Each event card shows the date badge,
type pill, title, description, venue and city (or "Online experience"), and
topics; clicking a card asks you to sign in and then continues to booking.
Below are three value props (curated experiences, simple ticketing,
thoughtful recommendations). If events fail to load you see "We couldn't
load events" with a "Try again" button; with no published events the calendar
says "No events yet."

## Organizer sidebar and header

The organizer workspace has a left sidebar (hamburger drawer on mobile) with
three groups: Event management (Overview, Events with a count badge,
Attendees, Tickets), Operations (Sessions, Venues, Speakers, Sponsors), and
Intelligence (AI Copilot with a BETA pill, which opens the copilot panel).
Below are Help center (opens the help modal), Log out, and your user card
(initials, name, role). The top bar shows the EventForge › Overview
breadcrumb, a "Generate report" button (confirms with a toast), a "Search
EventForge" box that live-filters the Upcoming events list by title, a bell
that opens the Notifications panel with live data (items needing attention,
tickets sold this month with change, next event countdown), and a "New event"
button that jumps to the Events tab. On mobile the search icon opens a
command palette with quick actions (create event, open check-in, ask AI to
draft) and a backdrop click or the X closes it.

## Organizer overview dashboard

The greeting shows today's real date and a time-aware greeting (morning,
afternoon, evening) with your first name, plus an "All systems operational"
indicator. Four live sections follow. "Your next big thing" spotlights your
nearest upcoming event (title, countdown pill in days, date, registered
count, venue and city) with a circular arrow button that opens the Featured
event details modal (live title, date, venue, attendance versus capacity,
session count, first run-of-show entries, and an "Open session plan" button
to the Sessions tab). "Registration velocity" shows tickets sold this month,
an up/down percent pill versus the prior 30 days, and a 14-day daily bar
chart with first/last day labels. "Upcoming events" lists your events with a
total-count pill: each row shows day/month, title, status badge, location and
capacity, and a readiness bar; clicking a row selects it as copilot context
with a toast. The Filter button reveals sorting (All events, Highest
readiness, Soonest date, Reset sort); "View all" expands from 3 to 5 rows and
"Collapse" shrinks back. "Next on the run of show" lists upcoming sessions
with times, rooms, and types; clicking a session selects it with a toast.
Any section that fails shows its own error with a Retry button; zeros with
empty states mean genuinely no data yet.

## Events tab

Create events with the Add event button: name, start date, and venue. The
event is created immediately as a private draft — invisible to attendees.
Set status to published and visibility to public and the event
appears on the landing page and in the attendee space. Use the search box to
find events by name. Each event card shows status, attention items, and last
updated time, all computed live.

## Attendees tab: search, filter, approve

Open the Attendees tab ("Attendee directory"), then first pick an event using
the Event pills — the directory is per event and lists nothing until an event
is chosen. Then you can type a name in the Search attendees box (matches
first or last name), filter by ticket type with the Ticket pills (All tickets
or one type), and toggle Earliest booking versus Latest booking sort order.
Each row shows name, email and organization, status pill, ticket type, and
booking date. Pending rows carry working Approve and Reject buttons:
approving confirms the seat (ticket quantity updates, check-in unlocks),
rejecting frees the request. A success banner confirms each action. If no
rows match you see "No attendees match these filters" — loosen the search or
pick All tickets; with no event picked you see "Choose an event above."
The plus button opens Add attendee (name, email, event, ticket type), which
registers them immediately.

## Approving registrations

New registrations arrive as pending. Approve or reject them with the row
buttons on the Attendees tab (organizer, staff, or admin) or review the
pending count on the Tickets tab Approvals card. Approving confirms the seat
and decrements remaining ticket quantity; rejecting frees the request without
consuming capacity. Pending and waitlisted registrations cannot check in
until approved.

## Tickets tab

Ticket operations are managed one event at a time: pick the event from the
dropdown. The top cards show Capacity (seats configured), Sold (tickets
issued), and Waitlist (people waiting), plus the percent full. Below, each
ticket type lists price and remaining quantity. Create types with Add ticket
type (name, price, total quantity, sales start and end dates). Three shortcut
cards show Approvals (pending count), Waitlist, and Capacity percent full.

## Sessions tab

"Sessions by event": pick the event from the dropdown to see its schedule —
every session with start time, title, room, and assigned speaker (or type /
"Speaker TBA"). "Add session" starts a new session draft for the event;
clicking a session row opens it for editing. Sessions carry title, room,
start/end time, type (Talk, Workshop, Keynote, Panel), capacity, and
speakers. Creating or moving a session into an overlapping slot of the same
event fails with a 409 conflict listing the colliding sessions. Sessions with
no speakers are flagged under Attention on your dashboard.

## Venues tab

"Venue by event": pick the event, then type or pick the assigned venue and
press "Save venue" — the saved venue shows under "Saved for this event."
Below is the venue directory (name, city/country or "Location TBA",
capacity, Virtual or On-site badge). Venues hold rooms and capacities; the
event's sessions reference its rooms.

## Speakers tab

"Speakers by session": pick the event to see each session with its time and
room plus a "Type speaker name" box — typing assigns that speaker to the
session (confirmed on blur with a toast). Each speaker record has name,
email, title, bio, and one event. A speaker in two overlapping sessions is
double-booked — ask the copilot to spot that. Use the tab search box to find
speakers by name.

## Sponsors tab

"Sponsors by event": pick the event to see the sponsor count, grid, and an
"Add sponsor" row (type the sponsor name, press Add). Each sponsor shows its
initial avatar and company name. Sponsors carry a package (tier, price,
benefits), brand assets, and deliverables; allocate a package when they sign
and mark each deliverable (logo placement, booth, mention) done as delivered.

## Announcements

Organizers and staff can post announcements per event (schedule changes, room
moves, welcome notes); attendees see them in the context of the events they
registered for. Announcements support create, edit, and delete.

## Check-in on event day

Check-in is QR based. Each approved registration carries a QR code (format
EF-XXX-N000) shown in the attendee wallet. Staff enter or scan the code at
the door: only approved or completed registrations succeed. Scanning an
already checked-in code returns a 409 conflict; pending or waitlisted codes
are refused with a 403 until approved. A validate-only lookup previews a
code without marking attendance.

## Attendee space

The attendee home ("Find your next yes") has a ticket-wallet summary card
("No tickets yet" or "N saved ticket(s)") with a "Book a ticket" button that
scrolls to the event grid, an "AI-powered picks" recommendations section
("Ask AI for more picks" opens the recommender; suggestion cards show title,
tag, location, dates, topics, and "Ticket saved" or "Open registration"),
and the event grid (one card per published event with date, type, location,
description, topics). Each card has a "Book <title>" button (single click
books the first available ticket type: shows "Booking…" then "✓ Booked" and
disables) and a "View details" link to that event's page. Booking without an
account asks you to sign in first (continuing afterward); sold-out events add
you to the waitlist with a position; duplicate bookings are blocked with
"You're already registered." Skeleton cards show while loading, "We couldn't
load events / Try again" on failure, and "No events found" when empty.

## Booking, tickets, wallet, coupons

Booking is one click per event and always uses the first available ticket
type with remaining quantity. Your registrations live in the ticket wallet
with their QR codes — show the code at the door for check-in. Coupon codes
beginning with EVT give a 10 percent mock discount; invalid or expired codes
are rejected with a 400 and no discount. Cancelling a registration restores
its ticket quantity automatically. If a ticket type is sold out you join the
waitlist and receive a position number.

## Registration states

pending (needs approval), approved, rejected, waitlisted (with position),
cancelled, completed, refunded. A duplicate registration for the same event
and email is rejected with a 409 error. Cancelling restores the ticket
quantity automatically.

## Session scheduling rules

Sessions belong to exactly one event with a start and end time. Creating or
moving a session into an overlapping slot of the same event fails with a 409
conflict listing the colliding sessions. Keep every session assigned to a
named room and at least one speaker to stay off the Attention list.

## Error messages explained

- 400: invalid input — a required field is missing or malformed (date, email,
  quantity). Fix the highlighted field and retry.
- 401: not signed in — sign in again; your session may have expired.
- 403: not allowed — your role cannot do this (checking in a pending
  registration, editing another organizer's event, self-registering as
  admin).
- 404: not found — the event, session, ticket, or attendee does not exist or
  is outside your scope.
- 409: conflict — duplicate registration, overlapping session, sold-out
  ticket moved to waitlist, or an already-used QR code.
- "Could not load data / Retry" (and per-card variants like "Could not load
  analytics", "We couldn't load events"): the server could not be reached.
  Check the app is running and press Retry.

## AI Copilot

The floating copilot panel (bottom-right, expandable, closable, remembers
your conversation) has three tabs. "Ask EventForge" answers questions about
the product and your own live data — events, registrations, tickets,
sessions, check-in, analytics — using retrieval over this guide plus live
records scoped to you, composed into a direct answer with named sources.
"Draft content" (Generate) writes event descriptions, speaker bios,
announcements, and session summaries. "Recommendations" (attendee mode)
suggests sessions from your interests. Quick-action chips per tab send
instantly ("How do I publish?", "Draft event description", "Beginner-friendly
picks", and more); or type anything and press Enter. Organizers open it from
the sidebar AI Copilot entry (it receives the currently selected event as
context); attendees via "Ask AI for more picks". If the AI service is slow or
unreachable it falls back to on-device drafts with a notice. It knows every
workflow in this guide and your current records — including events you just
created. If it cannot find an answer, it says so and suggests what to ask.

## Help center

The sidebar Help center opens a support modal: email support
(support@eventforge.app), phone (+1 (800) 555-0184), and three expandable
FAQs (creating an event, managing ticket capacity, waitlists). Close with the
X or backdrop click.

## Analytics

The organizer overview shows registration velocity (tickets sold this month
with change versus the prior 30 days and a 14-day daily chart), the next big
event with days remaining and venue, the run of show (upcoming sessions),
and organization health: status, items needing attention (pending approvals,
sessions missing speakers, waitlisted attendees), and last updated time.

## FAQ

- How do I create an event? Sidebar Events (or top-bar New event), Add event
  (name, start date, venue) — it saves as a private draft, then publish it.
- How do I add an attendee manually? Attendees tab, plus button: name,
  email, event, ticket type.
- How do I publish my event so attendees can find it? Set status to
  published and visibility to public. Draft or private events stay hidden.
- How do I search or filter attendee registrations? Attendees tab, pick the
  event first, then Search attendees, Ticket pills, or Earliest/Latest order.
- How do I filter or sort my upcoming events? On the overview, press Filter:
  All events, Highest readiness, Soonest date, or Reset sort. "View all"
  shows 5 instead of 3; Collapse shrinks back. Top-bar search filters by
  title too.
- How do I see full details of my next event? Press the circular arrow on
  "Your next big thing" for the Featured event modal (attendance, sessions,
  session-plan link).
- Why is the attendee list empty? No event selected, or no registrations —
  pick an event with the Event pills first.
- How do I approve a registration? Use the Approve button on its pending row
  in the Attendees tab (Reject to decline).
- How do I add a session? Sessions tab, pick the event, Add session (title,
  room, times, type, speakers).
- Why did my session fail with 409? Its time overlaps another session of the
  same event. Change the time.
- How do I assign a speaker? Speakers tab, pick the event, type the name in
  the session's box.
- How do I add a sponsor? Sponsors tab, pick the event, type the name, Add
  sponsor.
- How do I set my event's venue? Venues tab, pick the event, type or pick
  the venue, Save venue.
- How do I check in attendees? Enter or scan each registration's QR code at
  the door; only approved registrations succeed.
- Why is check-in refused? Must be approved first; pending/waitlisted codes
  get 403, reused codes 409.
- How do attendees join a waitlist? Automatically when a ticket type sells
  out, with a position number.
- How do I book as an attendee? Attendee space, press "Book <event>" (first
  available ticket type); "✓ Booked" confirms. Sign in first if asked.
- How do coupon codes work? Codes starting with EVT apply a 10 percent mock
  discount at booking time.
- How do I manage ticket capacity? Tickets tab, select the event, adjust
  ticket type limits; counts update live.
- Is a speaker double-booked? Ask the copilot — it compares session times per
  speaker and reports overlaps.
- How do I post an announcement? The announcements section of your event;
  its attendees will see it.
- What do the notifications show? Live attention items, this month's ticket
  count with change, and your next-event countdown.
- Can attendees see my event? Only when published and public.
- What does 409 mean? Conflict: duplicate registration, overlapping session,
  or reused QR code.
- What does 403 mean? Your role is not allowed to do that action.
- Why do I see someone else's name? You are signed in as them — sign out and
  sign back in.
- What can the AI copilot answer? Anything in this guide plus your live data:
  events, registrations, tickets, sessions, check-in, analytics.
