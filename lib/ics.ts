// Pure, isomorphic calendar-invite builder — safe to import from both client
// components and server routes (no Node-only or browser-only deps).
//
// DTSTART/DTEND are emitted in UTC (the trailing "Z"). Every calendar app that
// imports the file renders the event in the SAVER's own local timezone: a slot
// the Charlotte (Eastern) scheduler offers lands as Central on an operator's
// calendar in Omaha with no extra work. UTC in, local-time out, everywhere.

export type IcsEvent = {
  start: string | number; // ISO string or epoch ms
  end: string | number; // ISO string or epoch ms
  title: string;
  description?: string;
  location?: string;
  uid?: string;
  organizer?: { name?: string; email?: string };
  alarmMinutes?: number; // display reminder this many minutes before start
};

// ISO/epoch -> "20260723T150000Z" (UTC basic format).
function toUtcStamp(v: string | number): string {
  return new Date(v).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

// RFC 5545 escaping for TEXT values (SUMMARY/DESCRIPTION/LOCATION).
function escText(s: unknown): string {
  return String(s ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

// Fold content lines longer than 75 octets (RFC 5545 §3.1). Our content is
// ASCII, so a character-based fold is equivalent to an octet-based one.
function foldLine(line: string): string {
  if (line.length <= 75) return line;
  let out = line.slice(0, 75);
  let rest = line.slice(75);
  while (rest.length) {
    out += "\r\n " + rest.slice(0, 74);
    rest = rest.slice(74);
  }
  return out;
}

export function buildIcs(ev: IcsEvent): string {
  const uid = ev.uid || `${toUtcStamp(ev.start)}-${Math.random().toString(36).slice(2)}@creativeimpactos`;
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Creative Impact//OS//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    "UID:" + uid,
    "DTSTAMP:" + toUtcStamp(Date.now()), // required by RFC 5545; Outlook/iOS reject without it
    "DTSTART:" + toUtcStamp(ev.start),
    "DTEND:" + toUtcStamp(ev.end),
    "SUMMARY:" + escText(ev.title),
  ];
  if (ev.description) lines.push("DESCRIPTION:" + escText(ev.description));
  if (ev.location) lines.push("LOCATION:" + escText(ev.location));
  if (ev.organizer?.email) {
    lines.push(`ORGANIZER;CN=${escText(ev.organizer.name || "Creative Impact")}:mailto:${ev.organizer.email}`);
  }
  if (ev.alarmMinutes && ev.alarmMinutes > 0) {
    lines.push("BEGIN:VALARM", "ACTION:DISPLAY", "DESCRIPTION:Reminder", `TRIGGER:-PT${Math.round(ev.alarmMinutes)}M`, "END:VALARM");
  }
  lines.push("END:VEVENT", "END:VCALENDAR");
  return lines.map(foldLine).join("\r\n");
}

// A data: URI for the .ics — the "add to Apple / Outlook / phone calendar" link.
// On iOS and Android, opening this hands the event to the native calendar, which
// stores it in the device's local timezone.
export function icsDataUri(ev: IcsEvent): string {
  return "data:text/calendar;charset=utf-8," + encodeURIComponent(buildIcs(ev));
}

// A Google Calendar "add event" URL. dates are UTC, so Google shows the event
// in the signed-in user's own timezone.
export function googleCalUrl(ev: IcsEvent): string {
  // Keep the dates range's "/" literal — the canonical, universally-accepted
  // form — while URL-encoding the free-text fields.
  const parts = [
    "action=TEMPLATE",
    "text=" + encodeURIComponent(ev.title),
    `dates=${toUtcStamp(ev.start)}/${toUtcStamp(ev.end)}`,
  ];
  if (ev.description) parts.push("details=" + encodeURIComponent(ev.description));
  if (ev.location) parts.push("location=" + encodeURIComponent(ev.location));
  return "https://calendar.google.com/calendar/render?" + parts.join("&");
}
