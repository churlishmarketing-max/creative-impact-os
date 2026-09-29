import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { sendEmail, emailShell, esc } from "@/lib/email";
import { getConfig } from "@/lib/spotlight";
import { getEdithConfig, edithEmit } from "@/lib/edith/server";
import { SCOPE, spotTier, floorLine } from "@/lib/spotlight-offer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// PUBLIC (proxy.ts): the Charlotte Spotlight board page's data + its interest
// form. GET returns only what the board shows publicly: the price board (ten
// positions, two tiers, paid in full), which positions are claimed (never who
// claimed them), what each tier includes, the floor, and the links. POST is the form: it becomes a Spotlight prospect and the
// lead.form_submitted event that starts EDITH's inbound sequence (SEQ2).
//
// Abuse guard: this form makes EDITH email the address typed into it, so it
// is rate-limited — one submission per email per day, a global hourly ceiling,
// a honeypot field, and a minimum time on the page.

async function owner() {
  const admin = getAdminClient();
  if (!admin) return null;
  const { data } = await admin.from("app_state").select("user_id").limit(1).maybeSingle();
  return data?.user_id ? { admin, uid: data.user_id as string } : null;
}

export async function GET() {
  const o = await owner();
  if (!o) return NextResponse.json({ ok: false }, { status: 400 });
  const [sp, ed, members] = await Promise.all([
    getConfig(o.admin, o.uid), getEdithConfig(o.admin, o.uid),
    o.admin.from("spotlight_prospects").select("spot_number").eq("user_id", o.uid).not("member_at", "is", null).neq("stage", "no"),
  ]);
  const taken = new Set<number>();
  let unplaced = 0;
  for (const m of members.data || []) { const n = Number(m.spot_number); if (n >= 1) taken.add(n); else unplaced++; }
  const spots = sp.prices.map((price, i) => ({ n: i + 1, tier: spotTier(i + 1, sp.featureSpots), price, claimed: taken.has(i + 1) }));
  const open = Math.max(0, spots.filter((x) => !x.claimed).length - unplaced);
  return NextResponse.json({
    ok: true, spots, open, total: spots.length, featureSpots: sp.featureSpots,
    scope: SCOPE, floorDate: sp.floorDate, floor: { Feature: floorLine("Feature", sp.floorDate), Community: floorLine("Community", sp.floorDate) },
    booking_link: ed.booking_link, episode_link: sp.episodeUrl || ed.episode_link,
  });
}

const clip = (v: unknown, n: number) => String(v ?? "").replace(/[\u0000-\u001f]/g, " ").trim().slice(0, n);

export async function POST(req: Request) {
  let b: Record<string, unknown> = {};
  try { b = await req.json(); } catch { return NextResponse.json({ ok: false }, { status: 400 }); }
  // Bots fill the hidden field and submit instantly; answer "ok" and do nothing.
  if (clip(b.company_website, 10) || Number(b.elapsed_ms) < 4000) return NextResponse.json({ ok: true });

  const name = clip(b.name, 120), business = clip(b.business, 160), email = clip(b.email, 200).toLowerCase();
  const phone = clip(b.phone, 40), neighborhood = clip(b.neighborhood, 120), q5 = clip(b.q5, 1000);
  const years = /^\d{1,3}$/.test(clip(b.years, 3)) ? Number(clip(b.years, 3)) : null;
  if (!name || !business || !/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(email) || !q5) return NextResponse.json({ ok: false, error: "Please fill in your name, business, email, and the last question." }, { status: 400 });
  if ((q5.match(/https?:\/\//g) || []).length > 2) return NextResponse.json({ ok: true });

  const o = await owner();
  if (!o) return NextResponse.json({ ok: false }, { status: 400 });
  const { admin, uid } = o;

  const hourAgo = new Date(Date.now() - 3600e3).toISOString();
  const { count: lastHour } = await admin.from("edith_events").select("id", { count: "exact", head: true }).eq("user_id", uid).eq("type", "lead.form_submitted").eq("source", "board").gte("at", hourAgo);
  if ((lastHour || 0) >= 25) return NextResponse.json({ ok: false, error: "We're getting a lot of these right now — please try again in an hour, or book a call instead." }, { status: 429 });

  let { data: p } = await admin.from("spotlight_prospects").select("id,tags").eq("user_id", uid).ilike("email", email).limit(1).maybeSingle();
  if (p) {
    const dayAgo = new Date(Date.now() - 86400e3).toISOString();
    const { data: recent } = await admin.from("edith_events").select("id").eq("prospect_id", p.id).eq("type", "lead.form_submitted").gte("at", dayAgo).limit(1);
    if (recent?.length) return NextResponse.json({ ok: true }); // already have it — no second sequence
    const tags = new Set<string>(p.tags || []); tags.add("inbound");
    await admin.from("spotlight_prospects").update({ tags: [...tags], q5_answer: q5 }).eq("id", p.id);
  } else {
    const ins = await admin.from("spotlight_prospects").insert({
      user_id: uid, business, owner_name: name, email, phone: phone || null, suburb: neighborhood || null, years,
      source: "board form", stage: "prospect", tags: ["inbound"], q5_answer: q5,
      notes: `Interest form on the Spotlight board, ${new Date().toISOString().slice(0, 10)}.`,
    }).select("id,tags").maybeSingle();
    if (ins.error || !ins.data) { console.error("board form insert failed", ins.error); return NextResponse.json({ ok: false, error: "Something went wrong — please book a call instead." }, { status: 500 }); }
    p = ins.data;
    await edithEmit(admin, uid, { prospect_id: p.id, type: "contact.created", source: "board" });
  }
  await edithEmit(admin, uid, { prospect_id: p!.id, type: "lead.form_submitted", payload: { q5_answer: q5, business_name: business, neighborhood: neighborhood || null, years_in_business: years, owner: true }, source: "board" });
  await admin.from("log_entries").insert({ user_id: uid, tag: "CS", color: "var(--gold)", message: `spotlight · board form · ${business}` });

  // Speed to lead: the manifest wants a call within the hour, so tell a human now.
  const row = (k: string, v?: string | number | null) => (v != null && v !== "" ? `<div style="font-size:13px;line-height:1.8"><span style="color:#5c7096;text-transform:uppercase;font-size:10px;letter-spacing:.12em">${k}</span> &nbsp;<span style="color:#b9c8e0">${esc(v)}</span></div>` : "");
  await sendEmail({
    to: process.env.EMAIL_BCC || "hello@creativeimpactmedia.co", bcc: null,
    subject: `⭐ SPOTLIGHT FORM · ${business} — call within the hour`,
    html: emailShell(`<div style="font-size:15px;color:#f4f7fc;margin-bottom:12px">New Spotlight interest form. EDITH has started the inbound sequence; the call is yours.</div>
      ${row("Name", name)}${row("Business", business)}${row("Phone", phone)}${row("Email", email)}${row("Neighborhood", neighborhood)}${row("Years", years)}${row("What Charlotte should understand", q5)}`),
  }).catch((e) => console.error("board form notify failed", e));

  return NextResponse.json({ ok: true });
}
