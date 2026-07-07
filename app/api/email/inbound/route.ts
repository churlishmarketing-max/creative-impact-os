import { NextResponse } from "next/server";
import crypto from "crypto";
import { getAdminClient } from "@/lib/supabase/admin";
import { sendEmail, emailShell, esc } from "@/lib/email";

export const runtime = "nodejs";

// Resend Inbound webhook: a client replies to a CRM email -> lands here ->
// filed into that client's thread (matched by sender address).
// Signature: svix scheme (svix-id.svix-timestamp.payload, HMAC-SHA256 with the
// base64 secret after the "whsec_" prefix). Env: RESEND_WEBHOOK_SECRET.

function verifySvix(raw: string, headers: Headers, secret: string): boolean {
  const id = headers.get("svix-id");
  const ts = headers.get("svix-timestamp");
  const sigHeader = headers.get("svix-signature");
  if (!id || !ts || !sigHeader) return false;
  // reject stale timestamps (>5 min) to block replays
  if (Math.abs(Date.now() / 1000 - Number(ts)) > 300) return false;
  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const expected = crypto.createHmac("sha256", key).update(`${id}.${ts}.${raw}`).digest("base64");
  return sigHeader.split(" ").some((part) => {
    const sig = part.includes(",") ? part.split(",")[1] : part;
    try {
      const a = Buffer.from(sig);
      const e = Buffer.from(expected);
      return a.length === e.length && crypto.timingSafeEqual(a, e);
    } catch { return false; }
  });
}

const addr = (v: unknown): string => {
  const s = Array.isArray(v) ? String((v as unknown[])[0] ?? "") : typeof v === "object" && v !== null ? String((v as { email?: string }).email ?? "") : String(v ?? "");
  const m = s.match(/<([^>]+)>/);
  return (m ? m[1] : s).trim().toLowerCase();
};

// The email.received webhook is METADATA ONLY (from/to/subject/attachment
// names) — the body must be fetched from the Received Emails API by id.
async function fetchInboundEmail(emailId: string): Promise<{ text?: string | null; html?: string | null; from?: unknown; to?: unknown; subject?: string } | null> {
  const key = process.env.RESEND_API_KEY;
  if (!key || !emailId) return null;
  try {
    const r = await fetch(`https://api.resend.com/emails/receiving/${encodeURIComponent(emailId)}`, {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (!r.ok) { console.error("inbound body fetch failed", r.status, await r.text()); return null; }
    return await r.json();
  } catch (e) { console.error("inbound body fetch error", e); return null; }
}

// Fallback when the reply only has an HTML part: flatten it to readable text.
function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|tr|li|h[1-6]|blockquote)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function POST(req: Request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) return new Response("not configured", { status: 400 });

  const raw = await req.text();
  if (!verifySvix(raw, req.headers, secret)) return new Response("bad signature", { status: 403 });

  let evt: any;
  try { evt = JSON.parse(raw); } catch { return NextResponse.json({ ok: true }); }
  if (evt.type && evt.type !== "email.received") return NextResponse.json({ ok: true });

  const d = evt.data || {};
  let from = addr(d.from);
  let to = addr(d.to);
  let subject = String(d.subject || "").slice(0, 500);

  // Body: never in the webhook — fetch the full email by id. Keep the old
  // payload fields as a first try in case Resend ever inlines them.
  let text = String(d.text || "").trim();
  let html = String(d.html || "").trim();
  if (!text && !html) {
    const full = await fetchInboundEmail(String(d.email_id || d.id || ""));
    if (full) {
      text = String(full.text || "").trim();
      html = String(full.html || "").trim();
      if (!from) from = addr(full.from);
      if (!to) to = addr(full.to);
      if (!subject) subject = String(full.subject || "").slice(0, 500);
    }
  }
  const body = (text || (html ? htmlToText(html) : "")).slice(0, 20000);
  if (!body) console.error("inbound: body still empty", { email_id: d.email_id, keys: Object.keys(d) });

  const admin = getAdminClient();
  if (!admin || !from) return NextResponse.json({ ok: true });

  // Single-user app: resolve the owner, then match the sender to a client.
  let ownerId: string | null = null;
  const { data: st } = await admin.from("app_state").select("user_id").limit(1).maybeSingle();
  ownerId = st?.user_id || null;
  if (!ownerId) return NextResponse.json({ ok: true });

  const { data: client } = await admin
    .from("clients")
    .select("id, name")
    .eq("user_id", ownerId)
    .ilike("email", from)
    .limit(1)
    .maybeSingle();

  await admin.from("email_messages").insert({
    user_id: ownerId,
    client_id: client?.id || null, // null = unmatched sender; still kept
    direction: "in",
    from_email: from,
    to_email: to,
    subject,
    body,
  });

  // Forward a copy to the operator's real inbox (Gmail) so nothing lives only
  // in the CRM. FYI copy only — reply from the OS thread, not from Gmail
  // (a Gmail reply to this copy would not reach the client).
  const inbox = process.env.EMAIL_BCC;
  if (inbox) {
    await sendEmail({
      to: inbox,
      bcc: null,
      subject: `↩ ${client?.name || from}: ${subject || "(no subject)"}`,
      html: emailShell(
        `<div style="font-size:11px;letter-spacing:.14em;color:#56524b;text-transform:uppercase;margin-bottom:8px">Client reply · filed to ${esc(client?.name || "unmatched")} in the CRM</div>
         <div style="font-size:13.5px;color:#c9c4bb;line-height:1.7;white-space:pre-wrap">${esc(body)}</div>
         <div style="font-size:11px;color:#56524b;margin-top:16px">Reply from the client's thread in the OS — replying to this copy won't reach them.</div>`
      ),
    });
  }

  return NextResponse.json({ ok: true });
}
