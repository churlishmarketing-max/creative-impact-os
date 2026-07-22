import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendEmail, emailShell, esc } from "@/lib/email";
import { buildIcs } from "@/lib/ics";

export const runtime = "nodejs";

// Public: create a booking (via the SECURITY DEFINER RPC) then email the client
// a confirmation (with a calendar invite) and BCC the operator.
export async function POST(req: Request) {
  let b: any = {};
  try { b = await req.json(); } catch { return NextResponse.json({ ok: false }, { status: 400 }); }
  const { token, name, email, phone, notes, details, start, end, whenText, title } = b;
  if (!token || !start || !end) return NextResponse.json({ ok: false, error: "missing" }, { status: 400 });
  const det: Record<string, string> = { business: "", website: "", socials: "", reason: "", ...(details || {}) };

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const sb = createClient(url, anon, { auth: { persistSession: false } });
  let { data, error } = await sb.rpc("create_booking", { p_token: token, p_name: name || "", p_email: email || "", p_phone: phone || "", p_notes: notes || "", p_start: start, p_end: end, p_details: det });
  if (error && /p_details|function/i.test(error.message || "")) {
    // 17_booking_details.sql not run yet — book anyway with the legacy shape
    ({ data, error } = await sb.rpc("create_booking", { p_token: token, p_name: name || "", p_email: email || "", p_phone: phone || "", p_notes: notes || "", p_start: start, p_end: end }));
  }
  if (error || !data?.ok) return NextResponse.json(data || { ok: false, error: error?.message }, { status: 200 });

  // Fire-and-forget notifications (never block the booking on email).
  // The invite is UTC-anchored, so it saves into each recipient's own local
  // timezone — an operator in Omaha sees Central for an Eastern-scheduled slot.
  const evTitle = title || "Call with Creative Impact";
  const ics = buildIcs({
    start,
    end,
    title: evTitle,
    description: notes || undefined,
    uid: start + "@creativeimpactos",
    organizer: { name: "Creative Impact", email: process.env.EMAIL_BCC || "hello@creativeimpactmedia.co" },
    alarmMinutes: 60,
  });
  const when = whenText || new Date(start).toUTCString();
  if (email) {
    await sendEmail({
      to: email,
      bcc: null, // the operator gets the full-detail notification below instead
      subject: `Booked: ${evTitle} — ${when}`,
      html: emailShell(`<div style="font-size:15px;margin-bottom:10px">You're booked in.</div>
        <div style="color:#8ea3c4;font-size:13px;line-height:1.7">${esc(evTitle)}<br><b style="color:#f4f7fc">${esc(when)}</b>${notes ? `<br><br>Notes: ${esc(notes)}` : ""}</div>
        <div style="color:#8ea3c4;font-size:12px;margin-top:16px">The calendar invite is attached. Talk soon.</div>`),
      ics,
    });
  }
  // Operator notification with the whole lead picture, every time.
  const row = (k: string, v?: string) => (v ? `<div style="font-size:13px;line-height:1.8"><span style="color:#5c7096;text-transform:uppercase;font-size:10px;letter-spacing:.12em">${k}</span> &nbsp;<span style="color:#b9c8e0">${esc(v)}</span></div>` : "");
  await sendEmail({
    to: process.env.EMAIL_BCC || "hello@creativeimpactmedia.co",
    bcc: null,
    subject: `📅 Booked: ${det.business || name || "Guest"} — ${when}${det.reason ? " · " + det.reason : ""}`,
    html: emailShell(`<div style="font-size:15px;color:#f4f7fc;margin-bottom:12px">New call on the calendar.</div>
      ${row("When", when)}${row("Reaching out for", det.reason)}${row("Business", det.business)}${row("Name", name)}${row("Email", email)}${row("Phone", phone)}${row("Website", det.website)}${row("Socials", det.socials)}${row("Notes", notes)}
      <div style="color:#5c7096;font-size:11px;margin-top:14px">They're on the Clients tab as a Lead (source: Booking).</div>`),
    ics,
  });
  return NextResponse.json({ ok: true });
}
