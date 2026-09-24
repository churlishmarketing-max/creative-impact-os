// Email via Resend (https://resend.com) — direct REST call, no SDK.
// Server-only. No-ops gracefully if RESEND_API_KEY isn't set.
// Env: RESEND_API_KEY, EMAIL_FROM, EMAIL_BCC (the operator's copy).
//
// ⚠️ EMAIL_FROM must be on a domain that is VERIFIED in Resend. Resend rejects
// (403) any send from an unverified domain, and because sends here are
// fire-and-forget the rejection is invisible from the UI — the booking still
// succeeds and no email ever arrives. The verified domain is currently the
// apex `creativeimpactmedia.co`. If you change the domain in Resend, change
// EMAIL_FROM in the same sitting or email silently stops.

type SendArgs = {
  to: string | string[];
  subject: string;
  html?: string; // branded HTML (emailShell). Provide html, text, or both.
  text?: string; // plain text — for person-to-person mail (the Spotlight sequence)
  bcc?: string | string[] | null;
  replyTo?: string;
  from?: string; // override sender (e.g. an agent persona address on the verified domain)
  ics?: string; // raw .ics text, attached as invite.ics
  headers?: Record<string, string>; // extra MIME headers (e.g. List-Unsubscribe)
  idempotencyKey?: string; // Resend dedupes retries carrying the same key
};

export async function sendEmail(a: SendArgs) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { ok: false, skipped: true };
  // Fallback matches the domain actually verified in Resend (the apex). Keep
  // these in sync — a stale fallback is exactly how sending broke before.
  const from = a.from || process.env.EMAIL_FROM || "Creative Impact <hello@creativeimpactmedia.co>";
  const bcc = a.bcc === undefined ? process.env.EMAIL_BCC || "hello@creativeimpactmedia.co" : a.bcc;

  const body: Record<string, unknown> = {
    from,
    to: Array.isArray(a.to) ? a.to : [a.to],
    subject: a.subject,
  };
  if (a.html) body.html = a.html;
  if (a.text) body.text = a.text;
  if (!a.html && !a.text) return { ok: false, error: "empty" };
  if (bcc) body.bcc = Array.isArray(bcc) ? bcc : [bcc];
  if (a.replyTo) body.reply_to = a.replyTo;
  if (a.ics) body.attachments = [{ filename: "invite.ics", content: Buffer.from(a.ics).toString("base64") }];
  if (a.headers && Object.keys(a.headers).length) body.headers = a.headers;

  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: "Bearer " + key, "Content-Type": "application/json", ...(a.idempotencyKey ? { "Idempotency-Key": a.idempotencyKey } : {}) },
      body: JSON.stringify(body),
    });
    if (!r.ok) { const t = await r.text(); console.error("resend error", r.status, t); return { ok: false, error: `resend ${r.status}: ${t.slice(0, 200)}` }; }
    const j = (await r.json().catch(() => ({}))) as { id?: string };
    return { ok: true, id: j.id };
  } catch (e) {
    console.error("email send failed", e);
    return { ok: false };
  }
}

// A person's name on the verified sending address, e.g. "Emmanuel · Creative
// Impact <hello@creativeimpactmedia.co>". Reuses EMAIL_FROM's address so the
// domain can never drift from the one verified in Resend.
export function personaFrom(name: string) {
  const configured = process.env.EMAIL_FROM || "Creative Impact <hello@creativeimpactmedia.co>";
  const addr = (configured.match(/<([^>]+)>/) || [])[1] || configured.trim();
  const clean = String(name || "").replace(/[<>"\r\n]/g, "").trim();
  return clean ? `${clean} · Creative Impact <${addr}>` : configured;
}

// Escape user-supplied text before interpolating it into email HTML.
export function esc(s: unknown) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Minimal branded wrapper so emails match the cockpit.
export function emailShell(inner: string) {
  return `<div style="background:#101d33;color:#f4f7fc;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;padding:28px;border-top:3px solid #ffb81c;max-width:520px;margin:0 auto">
    <div style="font-family:Arial Narrow,Arial,sans-serif;font-weight:900;font-size:20px;letter-spacing:.01em">CI<span style="color:#ffb81c">/</span>OS</div>
    <div style="height:1px;background:linear-gradient(90deg,#ffb81c,transparent 60%);margin:14px 0 18px"></div>
    ${inner}
    <div style="color:#5c7096;font-size:11px;margin-top:22px">Creative Impact · creativeimpactmedia.co</div>
  </div>`;
}
