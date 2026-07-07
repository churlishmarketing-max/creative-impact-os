import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { sendEmail, emailShell, esc } from "@/lib/email";
import { getAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

// Operator-only: send an email to a client from the OS and log it to their thread.
// Auth is enforced twice: the proxy gates this route, and we re-verify the
// Supabase session here before sending anything.
export async function POST(req: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return NextResponse.json({ ok: false, error: "not_configured" }, { status: 400 });

  const cookieStore = await cookies();
  const sb = createServerClient(url, anon, {
    cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} },
  });
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  if (!process.env.RESEND_API_KEY) return NextResponse.json({ ok: false, error: "email_not_configured" }, { status: 400 });

  let b: any = {};
  try { b = await req.json(); } catch { return NextResponse.json({ ok: false }, { status: 400 }); }
  const { clientId, to, subject, body } = b;
  if (!to || !subject || !body) return NextResponse.json({ ok: false, error: "missing" }, { status: 400 });

  const replyTo = process.env.EMAIL_REPLY_TO; // inbound address -> replies land back in the CRM
  const res = await sendEmail({
    to,
    subject,
    html: emailShell(`<div style="font-size:13.5px;color:#c9c4bb;line-height:1.7;white-space:pre-wrap">${esc(body)}</div>`),
    bcc: null, // operator wrote it; no self-BCC needed — it's logged in the thread
    replyTo,
  });
  if (!res.ok) return NextResponse.json({ ok: false, error: "send_failed" }, { status: 502 });

  const admin = getAdminClient();
  if (admin) {
    await admin.from("email_messages").insert({
      user_id: user.id,
      client_id: clientId || null,
      direction: "out",
      from_email: process.env.EMAIL_FROM || "hello@churlishos.app",
      to_email: to,
      subject,
      body,
    });
  }
  return NextResponse.json({ ok: true });
}
