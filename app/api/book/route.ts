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
    // Welcome-and-set-expectations email, in the founders' voice. Copy is
    // Brandon's; the confirmed slot and the invite ride along with it so the
    // booker has the time in writing as well as on their calendar.
    const firstName = String(name || "").trim().split(/\s+/)[0] || "there";
    const p = 'style="font-size:14px;line-height:1.75;color:#d7e0ee;margin:0 0 14px"';
    await sendEmail({
      to: email,
      bcc: null, // the operator gets the full-detail notification below instead
      subject: `You're booked in, ${firstName} — here's what happens next`,
      html: emailShell(`
        <div ${p}>Hey ${esc(firstName)},</div>
        <div ${p}>Congratulations on taking the first step.</div>
        <div ${p}>Most businesses know they need better marketing—but very few actually do something about it. The fact that you're here tells us you're serious about growing, and that's exactly the kind of business we love working with.</div>
        <div style="border-left:2px solid #ffb81c;padding:10px 14px;margin:0 0 16px;background:#0b1526">
          <div style="font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:#5c7096;margin-bottom:4px">Your call is confirmed</div>
          <div style="font-size:14px;color:#f4f7fc;font-weight:700">${esc(when)}</div>
          <div style="font-size:12px;color:#8ea3c4;margin-top:4px">${esc(evTitle)} · calendar invite attached</div>
        </div>
        <div ${p}><b style="color:#f4f7fc">Here's what happens next:</b></div>
        <div ${p}>One of our team members will be reaching out to you within the next 24 hours. We'll hop on a quick call—10 to 15 minutes—to learn more about your business, where you're at right now, and where you're trying to go.</div>
        <div ${p}>This isn't a sales pitch. We use this conversation to make sure your business is the right fit for our system. What we do isn't for everyone—and we'd rather be upfront about that now than waste your time later.</div>
        <div ${p}>In the meantime, keep an eye on your phone. We'll be in touch soon.</div>
        <div ${p}>Talk soon,</div>
        <div style="font-size:13px;line-height:1.7;color:#8ea3c4;margin-top:18px;border-top:1px solid #24385c;padding-top:14px">
          <b style="color:#f4f7fc">Brandon King &amp; Emmanuel Bibbs</b><br>
          Founders &amp; Creative Director<br>
          Creative Impact Media<br>
          402-819-8168 &nbsp;|&nbsp; <a href="https://www.creativeimpactmedia.co" style="color:#ffb81c;text-decoration:none">www.creativeimpactmedia.co</a>
        </div>`),
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
