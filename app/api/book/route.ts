import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendEmail, emailShell, esc } from "@/lib/email";

export const runtime = "nodejs";

// Public: create a booking (via the SECURITY DEFINER RPC) then email the client
// a confirmation (with a calendar invite) and BCC the operator.
export async function POST(req: Request) {
  let b: any = {};
  try { b = await req.json(); } catch { return NextResponse.json({ ok: false }, { status: 400 }); }
  const { token, name, email, phone, notes, start, end, whenText, title } = b;
  if (!token || !start || !end) return NextResponse.json({ ok: false, error: "missing" }, { status: 400 });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const sb = createClient(url, anon, { auth: { persistSession: false } });
  const { data, error } = await sb.rpc("create_booking", { p_token: token, p_name: name || "", p_email: email || "", p_phone: phone || "", p_notes: notes || "", p_start: start, p_end: end });
  if (error || !data?.ok) return NextResponse.json(data || { ok: false, error: error?.message }, { status: 200 });

  // Fire-and-forget notifications (never block the booking on email).
  const evTitle = title || "Call with Creative Impact";
  const fmt = (iso: string) => iso.replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//CreativeImpact//OS//EN", "BEGIN:VEVENT", "UID:" + start + "@creativeimpactos", "DTSTART:" + fmt(new Date(start).toISOString()), "DTEND:" + fmt(new Date(end).toISOString()), "SUMMARY:" + evTitle, "DESCRIPTION:" + (notes || ""), "END:VEVENT", "END:VCALENDAR"].join("\r\n");
  const when = whenText || new Date(start).toUTCString();
  if (email) {
    await sendEmail({
      to: email,
      subject: `Booked: ${evTitle} — ${when}`,
      html: emailShell(`<div style="font-size:15px;margin-bottom:10px">You're booked in.</div>
        <div style="color:#8ea3c4;font-size:13px;line-height:1.7">${esc(evTitle)}<br><b style="color:#f4f7fc">${esc(when)}</b>${notes ? `<br><br>Notes: ${esc(notes)}` : ""}</div>
        <div style="color:#8ea3c4;font-size:12px;margin-top:16px">The calendar invite is attached. Talk soon.</div>`),
      ics,
    });
  } else {
    // no client email — still notify the operator
    await sendEmail({ to: process.env.EMAIL_BCC || "hello@creativeimpactmedia.co", bcc: null, subject: `New booking — ${when}`, html: emailShell(`<div>New booking: <b>${esc(name || "Guest")}</b><br>${esc(when)}</div>`), ics });
  }
  return NextResponse.json({ ok: true });
}
