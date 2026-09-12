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
  global policies. Sees all data.
- Event Organizer: creates events and manages venues, sessions, speakers,
  sponsors, tickets, and event operations. Sees only their own events.
- Event Staff: handles check-in, session attendance, venue operations, and
  attendee support.
- Speaker: manages speaker profile, sessions, presentation material, and
  availability.
- Attendee: registers for events, selects sessions, manages tickets, and
  provides feedback. Sees published events.
- Sponsor: manages sponsorship packages, brand assets, and deliverables.

## Organizer workflow

1. Create an event (Events tab, Add event): title, dates, venue, capacity.
2. Publish it (status draft → published) so attendees can discover it.
3. Add sessions (Sessions tab): title, room, start/end time. The system
   rejects overlapping sessions in the same room with a 409 conflict.
4. Add ticket types (Tickets tab): price, capacity, sales window.
5. Review registrations (Attendees tab): approve pending attendees, manage
   the waitlist, cancel with automatic ticket quantity restore.
6. Check in attendees on the day via QR code (Check-in).
7. Track sponsors and deliverables (Sponsors tab).

## Attendee workflow

1. Browse published events on the landing page or the attendee space.
2. Book a ticket: pick an event and a ticket type. If a ticket is sold out
   you join the waitlist and get a waitlist position.
3. Coupon codes starting with EVT give a 10 percent mock discount.
4. View your registrations any time; each carries a QR code for check-in.
5. Ask the AI copilot for session recommendations based on your interests.

## Registration states

pending (needs approval), approved, rejected, waitlisted (with position),
cancelled, completed, refunded. A duplicate registration for the same event
and email is rejected with a 409 error.

## Tickets

Ticket types have a total quantity and a remaining quantity that decrements
on every approved purchase and restores on cancellation. Selling out moves
new registrations to the waitlist automatically.

## Check-in

Check-in is QR based. Only approved or completed registrations can check in.
Scanning an already checked-in code returns a 409 conflict. Pending
registrations are refused with a 403 until approved.

## Session scheduling

Sessions belong to exactly one event and one room with a start and end time.
Creating or moving a session into an overlapping room/time slot fails with a
409 conflict listing the colliding sessions.

## AI Copilot

The copilot has three modes. Generate drafts event descriptions, speaker
bios, announcements, and session summaries. Recommend suggests sessions from
your interests. Ask answers questions about EventForge and your own data
(events, registrations, tickets, schedules) using retrieval over this guide
plus live database records scoped to you.

## Analytics

The organizer overview shows registration velocity (tickets sold this month
with change versus the prior 30 days and a 14-day daily chart), the next big
event with days remaining and venue, the run of show (upcoming sessions),
and organization health: status, items needing attention (pending approvals,
sessions missing speakers, waitlisted attendees), and last updated time.

## FAQ

- How do I create an event? Open Events from the sidebar and choose Add
  event, then publish it when ready.
- How do I manage ticket capacity? Open Tickets, select an event, and adjust
  its ticket type limits.
- Can attendees join a waitlist? Yes. When capacity is reached, new
  registrations are added to the event waitlist with a position number.
- Why can't an attendee see my event? Events are visible to attendees only
  when status is published and visibility is public.
- Why is check-in refused? The registration must be approved first; pending
  or waitlisted registrations cannot check in.
- What does 409 mean? A conflict: duplicate registration, overlapping
  session, or an already-used QR code.
