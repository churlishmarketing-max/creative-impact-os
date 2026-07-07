import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { draftAgentEmail, sendQueuedEmail } from "@/lib/agent";

export const runtime = "nodejs";

// Public: client submits their onboarding form. Answers are mapped into the
// client record + brand kit via each field's maps_to; unmapped answers stay in
// responses and render in the dashboard's "Client answers" panel.

type Field = { key: string; label?: string; maps_to?: string; type?: string };

export async function POST(req: Request) {
  let token = "";
  try { ({ token } = await req.json()); } catch { return NextResponse.json({ ok: false }, { status: 400 }); }
  if (!token) return NextResponse.json({ ok: false, error: "missing" }, { status: 400 });

  const admin = getAdminClient();
  if (!admin) return NextResponse.json({ ok: false, error: "not_configured" }, { status: 400 });

  const { data: run } = await admin.from("onboarding_runs").select("*").eq("magic_token", token).maybeSingle();
  if (!run) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  if (run.status === "processed") return NextResponse.json({ ok: true, already: true });

  const { data: tpl } = await admin.from("onboarding_templates").select("sections, next_template_id, name").eq("id", run.template_id).maybeSingle();
  const sections: { fields?: Field[] }[] = (tpl?.sections as never) || [];
  const responses: Record<string, string> = run.responses || {};

  const clientPatch: Record<string, unknown> = { onboarded_at: new Date().toISOString() };
  const colors: { name: string; hex: string; usage: string }[] = [];
  const fonts: { role: string; family: string; weight: number; source: string }[] = [];
  const assets: { label: string; url: string }[] = [];
  const kit: Record<string, unknown> = {};

  const CLIENT_COLS: Record<string, string> = { contact: "contact_name", phone: "phone", email: "email", industry: "industry" };

  for (const sec of sections) {
    for (const f of sec.fields || []) {
      const val = (responses[f.key] || "").trim();
      if (!val || !f.maps_to || f.maps_to === "custom") continue;
      const m = f.maps_to;
      if (m.startsWith("client.")) {
        const col = CLIENT_COLS[m.slice(7)];
        if (col) clientPatch[col] = val;
      } else if (m === "kit.logo_url") kit.logo_url = val;
      else if (m === "kit.voice") kit.voice_notes = val;
      else if (m === "kit.do_not") kit.do_not = val.split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
      else if (m.startsWith("kit.color.")) {
        const usage = m.slice(10);
        colors.push({ name: usage.charAt(0).toUpperCase() + usage.slice(1), hex: val, usage });
      } else if (m.startsWith("kit.font.")) {
        const role = m.slice(9);
        fonts.push({ role, family: val, weight: role === "headline" ? 900 : 400, source: "google" });
      } else if (m.startsWith("kit.asset.")) {
        assets.push({ label: m.slice(10), url: val });
      }
    }
  }
  if (colors.length) kit.colors = colors;
  if (fonts.length) kit.fonts = fonts;
  if (assets.length) kit.assets = assets;

  await admin.from("clients").update(clientPatch).eq("id", run.client_id);
  if (Object.keys(kit).length) {
    await admin.from("brand_kits").upsert({ user_id: run.user_id, client_id: run.client_id, ...kit }, { onConflict: "client_id" });
  }
  await admin.from("onboarding_runs").update({ status: "processed", submitted_at: new Date().toISOString() }).eq("id", run.id);
  await admin.from("client_events").insert({ user_id: run.user_id, client_id: run.client_id, kind: "onboarding", message: "Onboarding form submitted — record + brand kit updated" });

  // onboarding.submitted -> Pennyworth responds AUTOMATICALLY (auto mode per
  // operator's standing instruction — no approval wait on submission replies).
  // If this template chains to a Part 2, the response delivers the next form.
  try {
    let kind = "onboarding_confirmation";
    let task = "Confirm we received their completed intake, thank them briefly, and tell them what happens next (work starts, they'll see it land, we stay in touch each stage).";
    const context: Record<string, string> = {};

    if (tpl?.next_template_id) {
      const { data: run2 } = await admin
        .from("onboarding_runs")
        .insert({ user_id: run.user_id, client_id: run.client_id, template_id: tpl.next_template_id })
        .select("magic_token").single();
      if (run2) {
        const origin = new URL(req.url).origin;
        context.link = `${origin}/onboard/${run2.magic_token}`;
        kind = "onboarding_part2";
        task = "Confirm part one of their onboarding is received, then ask them to complete part two at the link provided — frame it as the last step before work starts. Keep it short.";
        await admin.from("client_events").insert({ user_id: run.user_id, client_id: run.client_id, kind: "onboarding", message: "Part 2 form created (" + (tpl.name || "next step") + " chain)" });
      }
    }

    const draft = await draftAgentEmail({ userId: run.user_id, clientId: run.client_id, kind, task, context });
    if (draft.ok && draft.id) {
      const sent = await sendQueuedEmail(draft.id, run.user_id);
      if (!sent.ok) console.error("auto-send failed:", sent.error); // stays queued in COMMS for manual approval
    }
  } catch (e) { console.error("submission response failed", e); }

  return NextResponse.json({ ok: true });
}
