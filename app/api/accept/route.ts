import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendEmail, emailShell, esc } from "@/lib/email";
import { getAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

// Public: records a proposal acceptance + e-signature (name + captured IP), then
// the DB function creates a Signed deal. Uses the anon key against a SECURITY
// DEFINER function scoped to the one token-matched proposal.
export async function POST(req: Request) {
  let token = "";
  let signer = "";
  try {
    ({ token, signer } = await req.json());
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  if (!token || !signer || !signer.trim()) return NextResponse.json({ ok: false, error: "missing" }, { status: 400 });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return NextResponse.json({ ok: false, error: "not_configured" }, { status: 400 });

  const ip =
    (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    "";

  const sb = createClient(url, anon, { auth: { persistSession: false } });
  const { data, error } = await sb.rpc("accept_proposal", { p_token: token, p_signer: signer.trim().slice(0, 120), p_ip: ip });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  // Notify operator (+ client if we can find their email). Never block on email.
  try {
    if (data?.ok && !data?.already) {
      const { data: pr } = await sb.rpc("get_proposal_by_token", { p_token: token });
      const title = pr?.title || "Proposal";
      const amount = pr?.amount_cents ? "$" + Math.round(pr.amount_cents / 100).toLocaleString() : "";
      await sendEmail({
        to: process.env.EMAIL_BCC || "hello@creativeimpactmedia.co",
        bcc: null,
        subject: `✍️ Signed: ${title}${amount ? " · " + amount : ""} by ${signer}`,
        html: emailShell(`<div style="font-size:15px">Proposal accepted &amp; signed.</div>
          <div style="color:#8ea3c4;font-size:13px;line-height:1.7;margin-top:8px">${esc(title)}${amount ? " · <b style='color:#ffb81c'>" + esc(amount) + "</b>" : ""}<br>Signed by <b style="color:#f4f7fc">${esc(signer)}</b><br>A Signed deal was added to your pipeline.</div>`),
      });
      const admin = getAdminClient();
      if (admin) {
        const { data: prow } = await admin.from("proposals").select("client_id").eq("token", token).maybeSingle();
        if (prow?.client_id) {
          const { data: c } = await admin.from("clients").select("email").eq("id", prow.client_id).maybeSingle();
          if (c?.email) {
            await sendEmail({ to: c.email, subject: `Signed: ${title}`, html: emailShell(`<div style="font-size:15px">Thanks, ${esc(signer)} — you're all set.</div><div style="color:#8ea3c4;font-size:13px;line-height:1.7;margin-top:8px">We've received your signed agreement for <b style="color:#f4f7fc">${esc(title)}</b>. We'll be in touch with next steps.</div>`) });
          }
        }
      }
    }
  } catch (e) { console.error("accept email failed", e); }

  return NextResponse.json(data || { ok: true });
}
