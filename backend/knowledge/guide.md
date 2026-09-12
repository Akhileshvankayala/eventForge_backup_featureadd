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
tickets, staff assignments, and attendee communication.

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

Anyone can create an account from the Auth page by choosing the Attendee,
Organizer, Speaker, or Sponsor role. Admin and Staff accounts are created by
an existing admin (users cannot grant themselves those roles). Sign in with
email and password; the app remembers the session. Pages are guarded by role:
visiting a page your role cannot use redirects you back. If you see another
user's name after logging in as someone else, sign out fully and sign back
in — the header always shows the currently signed-in account.

## Organizer overview dashboard

The organizer home shows live data, never samples: registration velocity
(tickets sold this month with change versus the prior 30 days and a 14-day
daily bar chart), your next big event (name, venue, days remaining, capacity
and registered counts), the run of show (sessions on your next event day with
times and rooms), and three health cards — Status (overall state), Attention
(items needing action), and Updated (how recently anything changed). Numbers
of 0 with empty states mean there is genuinely no data yet, not an error.

## Events tab

Create events with the Add event button: name, start and end date, venue,
capacity, price, and currency. New events start as drafts — invisible to
attendees. Set status to published and visibility to public and the event
appears on the landing page and in the attendee space. Use the search box to
find events by name. Each event card shows status, attention items, and last
updated time, all computed live.

## Attendees tab and searching or filtering registrations

Open the Attendees tab, then first pick an event using the Event pills (the
directory is per event — nothing lists until an event is chosen). Then you
can: type a name in the Search attendees box (matches first or last name),
filter by ticket type with the Ticket pills (e.g. General plus VIP, or All
tickets), and toggle Earliest booking versus Latest booking to change sort
order. Each row shows the attendee name, status (pending, approved,
waitlisted, and so on), ticket type, and booking date. If no rows match, the
tab says "No attendees match these filters" — loosen the search or pick All
tickets. Organizers can also add an attendee manually with the plus button
(name, event, ticket type).

## Approving registrations

New registrations arrive as pending. Approve or reject them from the
Attendees tab (organizer or staff) or review the pending count on the Tickets
tab Approvals card. Approving confirms the seat and decrements remaining
ticket quantity; rejecting frees the request without consuming capacity.
Pending and waitlisted registrations cannot check in until approved.

## Tickets tab

Ticket operations are managed one event at a time: pick the event from the
dropdown. The top cards show Capacity (seats configured), Sold (tickets
issued), and Waitlist (people waiting), plus the percent full. Below, each
ticket type lists price and remaining quantity. Create types with Add ticket
type (name, price, total quantity, sales start and end dates). Three shortcut
cards jump to Approvals (pending count), Waitlist, and Capacity editing.

## Sessions tab

Sessions belong to exactly one event and carry a title, room, start and end
time, type (Talk, Workshop, Keynote, Panel), capacity, and assigned speakers.
Use the search box to find sessions by name. Creating or moving a session
into a time slot that overlaps another session of the same event fails with
a 409 conflict listing the colliding sessions — pick a different time or
room. Sessions with no speakers are flagged under Attention on your
dashboard; assign speakers from the session editor.

## Venues tab

Venues hold rooms, capacities, floor plans, and on-site notes. Create a venue
per location, then reference its rooms when scheduling sessions. Search venues
by name with the search box.

## Speakers tab

Each speaker has a name, email, title, bio, and one event. Assign speakers to
sessions so attendees know who is on stage; a speaker in two overlapping
sessions is double-booked, and the AI copilot can spot that for you. Search
speakers by name.

## Sponsors tab

Track sponsors per event with their package (tier, price, benefits), brand
assets, and deliverables with completion state. Allocate a package to a
sponsor when they sign, then mark each deliverable (logo placement, booth,
mention) done as it is delivered.

## Announcements

Organizers and staff can post announcements per event (schedule changes, room
moves, welcome notes) from the announcements section; attendees see them in
the context of the events they registered for. Announcements support create,
edit, and delete.

## Check-in on event day

Check-in is QR based. Each approved registration carries a QR code (format
EF-XXX-N000) shown in the attendee wallet. Staff enter or scan the code at
the door: only approved or completed registrations succeed. Scanning an
already checked-in code returns a 409 conflict; pending or waitlisted codes
are refused with a 403 until approved. A validate-only lookup exists to
preview a code without marking attendance.

## Attendee guide

Browse published events on the landing page or the attendee space and use the
search box to filter events by title. Open an event to see its sessions,
speakers, venue, and ticket types, then Book a ticket. If a ticket type is
sold out you join the waitlist and receive a waitlist position; if a coupon
code starting with EVT is available it applies a 10 percent mock discount at
booking. Your registrations live in the wallet with their QR codes — show the
code at the door. Ask the AI copilot for session recommendations based on
your interests (Recommend mode).

## Coupon codes

Coupon codes beginning with EVT give a 10 percent mock discount when booking.
Enter the code during booking; invalid or expired codes are rejected with a
400 error and no discount is applied.

## Registration states

pending (needs approval), approved, rejected, waitlisted (with position),
cancelled, completed, refunded. A duplicate registration for the same event
and email is rejected with a 409 error. Cancelling restores the ticket
quantity automatically.

## Tickets and capacity

Ticket types have a total quantity and a remaining quantity that decrements
on every approved purchase and restores on cancellation. Selling out moves
new registrations to the waitlist automatically. Capacity, sold, and waitlist
counts on the Tickets tab are computed live per selected event.

## Session scheduling rules

Sessions belong to exactly one event with a start and end time. Creating or
moving a session into an overlapping slot of the same event fails with a 409
conflict listing the colliding sessions. Keep every session assigned to a
named room and at least one speaker to stay off the Attention list.

## Error messages explained

- 400: invalid input — a required field is missing or malformed (date, email,
  quantity). Fix the highlighted field and retry.
- 401: not signed in — sign in again; your session may have expired.
- 403: not allowed — your role cannot do this (e.g. checking in a pending
  registration, editing another organizer's event, self-registering as
  admin).
- 404: not found — the event, session, ticket, or attendee does not exist or
  is outside your scope.
- 409: conflict — duplicate registration, overlapping session, sold-out
  ticket moved to waitlist, or an already-used QR code.
- "Could not load data / Retry": the server could not be reached. Check the
  app is running and press Retry.

## AI Copilot

The copilot has three modes. Generate drafts event descriptions, speaker
bios, announcements, and session summaries. Recommend suggests sessions from
your interests. Ask answers questions about EventForge and your own data
(events, registrations, tickets, schedules) using retrieval over this guide
plus live database records scoped to you, composed into a direct answer with
named sources. It knows every workflow in this guide and your current
records — including events you just created. If it cannot find an answer, it
says so and suggests what to ask instead.

## Analytics

The organizer overview shows registration velocity (tickets sold this month
with change versus the prior 30 days and a 14-day daily chart), the next big
event with days remaining and venue, the run of show (upcoming sessions),
and organization health: status, items needing attention (pending approvals,
sessions missing speakers, waitlisted attendees), and last updated time.

## FAQ

- How do I create an event? Open Events from the sidebar and choose Add
  event (name, dates, venue, capacity, price), then publish it when ready.
- How do I publish my event so attendees can find it? Set status to
  published and visibility to public. Draft or private events stay hidden.
- How do I search or filter attendee registrations? Open the Attendees tab,
  pick the event first, then type in Search attendees, filter with the Ticket
  pills, or toggle Earliest versus Latest booking order.
- Why is the attendee list empty? No event is selected yet, or no one has
  registered — pick an event with the Event pills first.
- How do I approve a registration? Open the Attendees tab for that event and
  approve the pending row, or use the Approvals card on the Tickets tab.
- How do I add a session? Open Sessions, Add session, set title, room, start
  and end time, type, and speakers.
- Why did my session fail with 409? Its time overlaps another session of the
  same event. Change the time or room.
- How do I check in attendees? Enter or scan each registration's QR code at
  the door; only approved registrations succeed.
- Why is check-in refused? The registration must be approved first; pending
  or waitlisted registrations cannot check in (403). Already-used codes
  return 409.
- How do attendees join a waitlist? Automatically: when a ticket type sells
  out, new registrations queue with a position number.
- How do coupon codes work? Codes starting with EVT apply a 10 percent mock
  discount at booking time.
- How do I manage ticket capacity? Open Tickets, select the event, and adjust
  its ticket type limits; sold and remaining counts update live.
- How do I assign a speaker? Edit the session and add the speaker; sessions
  without speakers appear under Attention.
- Is a speaker double-booked? Ask the copilot — it compares session times per
  speaker and reports overlaps.
- How do I post an announcement? Use the announcements section of your event;
  attendees of that event will see it.
- Can attendees see my event? Only when status is published and visibility is
  public.
- What does 409 mean? A conflict: duplicate registration, overlapping
  session, or an already-used QR code.
- What does 403 mean? Your role is not allowed to do that action.
- Why do I see someone else's name? You are signed in as them — sign out and
  sign in with your own account.
- What can the AI copilot answer? Anything in this guide plus your live data:
  your events, registrations, tickets, sessions, check-in, and analytics.
