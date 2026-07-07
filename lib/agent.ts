// Agent drafting engine (server-only). Drafts an email in an agent persona's
// voice via the Claude API and queues it in email_log as draft_pending_approval.
// APPROVAL MODE is the default; specific automations may auto-send via
// sendQueuedEmail (currently: responses to a client's form submission).
import { getAdminClient } from "@/lib/supabase/admin";
import { sendEmail, emailShell, esc } from "@/lib/email";

const MODEL = process.env.AGENT_MODEL || "claude-sonnet-5";

export type DraftArgs = {
  userId: string;
  clientId: string;
  kind: string;            // onboarding_welcome | onboarding_confirmation | ...
  task: string;            // plain-english instruction for the agent
  context?: Record<string, string | undefined>; // merge facts (link, offer, etc.)
  agentName?: string;      // default Pennyworth
};

export async function draftAgentEmail(a: DraftArgs): Promise<{ ok: boolean; id?: string; subject?: string; body?: string; error?: string }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const admin = getAdminClient();
  if (!admin) return { ok: false, error: "not_configured" };

  const { data: agent } = await admin
    .from("agents").select("*")
    .eq("user_id", a.userId).eq("name", a.agentName || "Pennyworth")
    .maybeSingle();
  if (!agent) return { ok: false, error: "no_agent" };

  const { data: client } = await admin
    .from("clients").select("name, contact_name, email")
    .eq("id", a.clientId).maybeSingle();
  if (!client?.email) return { ok: false, error: "client_has_no_email" };

  let subject = "";
  let body = "";

  if (apiKey) {
    const facts = Object.entries(a.context || {})
      .filter(([, v]) => v)
      .map(([k, v]) => `- ${k}: ${v}`)
      .join("\n");
    const user = `Write an email for this task:\n${a.task}\n\nFacts you may use (do not invent others):\n- Business: ${client.name}\n- Contact first name: ${(client.contact_name || "").split(" ")[0] || "there"}\n${facts}\n\nReturn STRICT JSON only: {"subject": "...", "body": "..."} — body is plain text with blank lines between paragraphs, no signature (it is appended automatically).`;
    try {
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
        body: JSON.stringify({ model: MODEL, max_tokens: 700, system: agent.voice_prompt, messages: [{ role: "user", content: user }] }),
      });
      const j = await r.json();
      const text: string = j?.content?.[0]?.text || "";
      try {
        const parsed = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1));
        subject = String(parsed.subject || "").slice(0, 200);
        body = String(parsed.body || "");
      } catch {
        subject = text.split("\n")[0].slice(0, 200);
        body = text.split("\n").slice(1).join("\n").trim();
      }
    } catch (e) {
      console.error("agent draft failed", e);
    }
  }
  // Fallback template if the API is unavailable — still queues for approval.
  // Free-form ("manual") emails get no boilerplate: wrong words to a client are
  // worse than no draft, so fail loudly instead.
  if ((!subject || !body) && a.kind === "manual") return { ok: false, error: "draft_failed" };
  if (!subject || !body) {
    const first = (client.contact_name || "").split(" ")[0] || "there";
    const link = a.context?.link;
    if (a.kind === "onboarding_confirmation") {
      subject = `Got everything — here's what happens next`;
      body = `${first} — your intake is in and everything we need is accounted for.\n\nWe're already moving. You'll see the first work land on your board shortly, and I'll keep you posted at every stage.\n\nIf anything changes on your side, just reply to this email.`;
    } else if (a.kind === "onboarding_part2") {
      subject = `Part one received — one last step`;
      body = `${first} — part one is in. Good answers.\n\nOne more form and we're fully loaded. It's shorter than the first.${link ? `\n\nPart two: ${link}` : ""}\n\nOnce that's in, work starts.`;
    } else {
      subject = `Welcome aboard, ${client.name}`;
      body = `${first} — welcome aboard.\n\nOne thing before we start: your intake form. It takes about ten minutes and it's the difference between us guessing and us knowing.${link ? `\n\nYour link: ${link}` : ""}\n\nReply here if anything's unclear — I read everything.`;
    }
  }

  const { data: row, error } = await admin
    .from("email_log")
    .insert({ user_id: a.userId, client_id: a.clientId, agent_id: agent.id, kind: a.kind, to_email: client.email, subject, body })
    .select("id").single();
  if (error) return { ok: false, error: error.message };
  await admin.from("client_events").insert({ user_id: a.userId, client_id: a.clientId, kind: "email", message: `${agent.name} drafted: ${subject} (awaiting approval)` });
  return { ok: true, id: row?.id, subject, body };
}

// Send a queued email_log draft as its agent (signature, reply-to CRM), file it
// to the client's thread + activity feed, and mark it sent. Used by the
// approval inbox AND by auto-mode automations.
export async function sendQueuedEmail(
  logId: string,
  userId: string,
  edited?: { subject?: string; body?: string }
): Promise<{ ok: boolean; error?: string }> {
  const admin = getAdminClient();
  if (!admin) return { ok: false, error: "not_configured" };
  const { data: row } = await admin.from("email_log").select("*").eq("id", logId).eq("user_id", userId).maybeSingle();
  if (!row) return { ok: false, error: "not_found" };
  if (row.status !== "draft_pending_approval") return { ok: false, error: "already_" + row.status };

  let agent: { name?: string; from_email?: string; signature_html?: string } | null = null;
  if (row.agent_id) {
    const { data } = await admin.from("agents").select("name,from_email,signature_html").eq("id", row.agent_id).maybeSingle();
    agent = data;
  }
  const subject = (edited?.subject || row.subject || "").slice(0, 200);
  const bodyText = edited?.body || row.body || "";
  const fromName = agent?.name ? `${agent.name} — Churlish Media` : "Churlish Media";
  const fromAddr = agent?.from_email || "hello@churlishos.app";

  const res = await sendEmail({
    to: row.to_email,
    subject,
    from: `${fromName} <${fromAddr}>`,
    replyTo: process.env.EMAIL_REPLY_TO,
    html: emailShell(`<div style="font-size:13.5px;color:#c9c4bb;line-height:1.75;white-space:pre-wrap">${esc(bodyText)}</div>${agent?.signature_html || ""}`),
  });
  if (!res.ok) {
    await admin.from("email_log").update({ status: "failed" }).eq("id", logId);
    return { ok: false, error: res.skipped ? "email_not_configured" : "send_failed" };
  }
  await admin.from("email_log").update({ status: "sent", sent_at: new Date().toISOString(), subject, body: bodyText }).eq("id", logId);
  if (row.client_id) {
    await admin.from("client_events").insert({ user_id: userId, client_id: row.client_id, kind: "email", message: `${agent?.name || "Agent"} sent: ${subject}` });
    await admin.from("email_messages").insert({ user_id: userId, client_id: row.client_id, direction: "out", from_email: fromAddr, to_email: row.to_email, subject, body: bodyText });
  }
  return { ok: true };
}
