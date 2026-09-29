import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { getConfig } from "@/lib/spotlight";
import { renderRelease, CONSENT_LABEL } from "@/lib/spotlight-release";
import { discordNotify, GREEN } from "@/lib/discord";

export const runtime = "nodejs";

// A business's release form (/spotlight/release/<release_token>). PUBLIC in
// proxy.ts, guarded by the token: GET returns the business name and the release
// text; POST saves one person's signature under that business, with the exact
// text they agreed to. Rate-limited per business; a hidden field catches bots.

const MISSING = "Release forms aren't set up yet — run supabase/26_close_release_finder.sql in the Supabase SQL editor.";
const clip = (v: unknown, n: number) => String(v ?? "").trim().slice(0, n);

async function byToken(token: string) {
  const admin = getAdminClient();
  if (!admin || !/^[0-9a-f-]{36}$/i.test(token)) return null;
  const { data, error } = await admin.from("spotlight_prospects").select("id,user_id,business,stage").eq("release_token", token).maybeSingle();
  if (error) return { admin, error: /does not exist|schema cache|release_token/i.test(error.message) ? MISSING : error.message };
  if (!data || data.stage === "no") return null;
  return { admin, p: data };
}

export async function GET(req: Request) {
  const t = new URL(req.url).searchParams.get("t") || "";
  const r = await byToken(t);
  if (!r) return NextResponse.json({ ok: false }, { status: 404 });
  if ("error" in r) return NextResponse.json({ ok: false, error: r.error }, { status: 400 });
  const cfg = await getConfig(r.admin, r.p.user_id);
  const { text } = renderRelease((cfg as { releaseTemplate?: string }).releaseTemplate, r.p.business);
  return NextResponse.json({ ok: true, business: r.p.business, text, consent_label: CONSENT_LABEL });
}

export async function POST(req: Request) {
  let b: Record<string, unknown> = {};
  try { b = await req.json(); } catch { return NextResponse.json({ ok: false }, { status: 400 }); }
  if (clip(b.company_website, 200)) return NextResponse.json({ ok: true }); // the hidden field: a bot filled it
  const r = await byToken(clip(b.t, 64));
  if (!r) return NextResponse.json({ ok: false, error: "This link isn't active." }, { status: 404 });
  if ("error" in r) return NextResponse.json({ ok: false, error: r.error }, { status: 400 });
  const first = clip(b.first_name, 80), last = clip(b.last_name, 80), email = clip(b.email, 200).toLowerCase();
  if (!first || !last) return NextResponse.json({ ok: false, error: "Please enter your first and last name." }, { status: 400 });
  if (!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(email)) return NextResponse.json({ ok: false, error: "Please enter a valid email address." }, { status: 400 });
  if (b.consent !== true) return NextResponse.json({ ok: false, error: "Please tick the box to agree to the release." }, { status: 400 });

  const { admin, p } = r;
  const hourAgo = new Date(Date.now() - 3600e3).toISOString();
  const { count, error: cErr } = await admin.from("spotlight_releases").select("id", { count: "exact", head: true }).eq("prospect_id", p.id).gte("signed_at", hourAgo);
  if (cErr) return NextResponse.json({ ok: false, error: /does not exist|schema cache/i.test(cErr.message) ? MISSING : cErr.message }, { status: 400 });
  if ((count || 0) >= 80) return NextResponse.json({ ok: false, error: "Lots of signatures this hour — please try again shortly." }, { status: 429 });

  const cfg = await getConfig(admin, p.user_id);
  const { text, version } = renderRelease((cfg as { releaseTemplate?: string }).releaseTemplate, p.business);
  const { error } = await admin.from("spotlight_releases").insert({
    user_id: p.user_id, prospect_id: p.id, first_name: first, last_name: last, email, consent: true,
    consent_text: `${text}\n\n[x] ${CONSENT_LABEL}`, consent_version: version,
    source: b.in_person ? "in person" : "link",
    ip: (req.headers.get("x-forwarded-for") || "").split(",")[0].trim().slice(0, 64) || null,
    user_agent: clip(req.headers.get("user-agent"), 300) || null,
  });
  if (error) return NextResponse.json({ ok: false, error: "Couldn't save that — please try again." }, { status: 500 });
  const { count: total } = await admin.from("spotlight_releases").select("id", { count: "exact", head: true }).eq("prospect_id", p.id);
  await admin.from("log_entries").insert({ user_id: p.user_id, tag: "CS", color: "var(--good)", message: `spotlight · release signed · ${first} ${last} for ${p.business}`.slice(0, 200) });
  await discordNotify(admin, p.user_id, `✍️ ${first} ${last} signed the release for ${p.business}`, `${total || 1} on file for ${p.business}${b.in_person ? " · signed in person" : ""}.`, GREEN);
  return NextResponse.json({ ok: true });
}
