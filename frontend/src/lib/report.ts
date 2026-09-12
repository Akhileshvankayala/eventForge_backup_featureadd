import { api } from "@/lib/api";

type ReportEvent = {
  _id: string;
  title: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  capacity?: number;
};

type ReportAttendee = { registrationStatus: string };
type ReportSession = { title: string };

const csvCell = (value: string | number): string => {
  const s = String(value ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function buildReportCsv(input: {
  generatedAt: string;
  organizer: string;
  events: ReportEvent[];
  attendeesByEvent: Record<string, ReportAttendee[]>;
  sessionsByEvent: Record<string, ReportSession[]>;
}): string {
  const { generatedAt, organizer, events, attendeesByEvent, sessionsByEvent } = input;
  const lines: string[] = [];
  lines.push("EventForge organization report");
  lines.push(`Generated at,${csvCell(generatedAt)}`);
  lines.push(`Organizer,${csvCell(organizer)}`);
  lines.push(`Total events,${events.length}`);
  lines.push("");
  lines.push("Event,Status,Start,End,Capacity,Registered,Approved,Pending,Waitlisted,Sessions");
  for (const e of events) {
    const attendees = attendeesByEvent[e._id] ?? [];
    const count = (s: string) => attendees.filter((a) => a.registrationStatus === s).length;
    lines.push(
      [
        csvCell(e.title),
        csvCell(e.status ?? "draft"),
        csvCell(e.startDate ? e.startDate.slice(0, 10) : "TBA"),
        csvCell(e.endDate ? e.endDate.slice(0, 10) : "TBA"),
        e.capacity ?? 0,
        attendees.length,
        count("approved") + count("completed"),
        count("pending"),
        count("waitlisted"),
        (sessionsByEvent[e._id] ?? []).length,
      ].join(","),
    );
  }
  return lines.join("\n");
}

// Fetches live scoped data and downloads it as a CSV file. Returns the
// filename on success, throws with a message on failure.
export async function downloadReport(organizer: string): Promise<string> {
  const events = await api.get<ReportEvent[]>("/api/events");
  const list = Array.isArray(events) ? events : [];
  const attendeesByEvent: Record<string, ReportAttendee[]> = {};
  const sessionsByEvent: Record<string, ReportSession[]> = {};
  await Promise.all(
    list.map(async (e) => {
      const [attendees, sessions] = await Promise.all([
        api.get<ReportAttendee[]>(`/api/attendees/event/${e._id}`).catch(() => [] as ReportAttendee[]),
        api.get<ReportSession[]>(`/api/sessions?eventId=${e._id}`).catch(() => [] as ReportSession[]),
      ]);
      attendeesByEvent[e._id] = Array.isArray(attendees) ? attendees : [];
      sessionsByEvent[e._id] = Array.isArray(sessions) ? sessions : [];
    }),
  );
  const csv = buildReportCsv({
    generatedAt: new Date().toISOString(),
    organizer,
    events: list,
    attendeesByEvent,
    sessionsByEvent,
  });
  const filename = `eventforge-report-${new Date().toISOString().slice(0, 10)}.csv`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
  return filename;
}
