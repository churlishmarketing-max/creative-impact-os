// Email via Resend (https://resend.com) — direct REST call, no SDK.
// Server-only. No-ops gracefully if RESEND_API_KEY isn't set.
// Env: RESEND_API_KEY, EMAIL_FROM (default hello@churlishos.app), EMAIL_BCC (your copy).

type SendArgs = {
  to: string | string[];
  subject: string;
  html: string;
  bcc?: string | string[] | null;
  replyTo?: string;
  from?: string; // override sender (e.g. an agent persona address on the verified domain)
  ics?: string; // raw .ics text, attached as invite.ics
};

export async function sendEmail(a: SendArgs) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { ok: false, skipped: true };
  const from = a.from || process.env.EMAIL_FROM || "Churlish Media <hello@churlishos.app>";
  const bcc = a.bcc === undefined ? process.env.EMAIL_BCC || "hello@churlishmedia.com" : a.bcc;

  const body: Record<string, unknown> = {
    from,
    to: Array.isArray(a.to) ? a.to : [a.to],
    subject: a.subject,
    html: a.html,
  };
  if (bcc) body.bcc = Array.isArray(bcc) ? bcc : [bcc];
  if (a.replyTo) body.reply_to = a.replyTo;
  if (a.ics) body.attachments = [{ filename: "invite.ics", content: Buffer.from(a.ics).toString("base64") }];

  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!r.ok) { console.error("resend error", r.status, await r.text()); return { ok: false }; }
    return { ok: true };
  } catch (e) {
    console.error("email send failed", e);
    return { ok: false };
  }
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
  return `<div style="background:#0e0e11;color:#ece8e1;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;padding:28px;border-top:3px solid #e6322b;max-width:520px;margin:0 auto">
    <div style="font-family:Arial Narrow,Arial,sans-serif;font-weight:900;font-size:20px;letter-spacing:.01em">CHURLISH<span style="color:#e6322b">/</span>OS</div>
    <div style="height:1px;background:linear-gradient(90deg,#e6322b,transparent 60%);margin:14px 0 18px"></div>
    ${inner}
    <div style="color:#56524b;font-size:11px;margin-top:22px">Churlish Media · churlishmedia.com</div>
  </div>`;
}
