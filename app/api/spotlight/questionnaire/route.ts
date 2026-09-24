import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { sendEmail, emailShell, esc } from "@/lib/email";

export const runtime = "nodejs";

// PUBLIC (listed in proxy.ts): the member's pre-shoot questionnaire. Access is
// by the unguessable q_token alone, and only that one row is ever read or
// written — never a list. Answers can be revisited and updated until film day.

const TOKEN = /^[0-9a-f-]{20,60}$/i;

async function rowFor(token: string) {
  const admin = getAdminClient();
  if (!admin || !TOKEN.test(token)) return { admin, row: null };
  const { data } = await admin.from("spotlight_prospects")
    .select("id,user_id,business,owner_name,questions,answers,q_returned_at,stage")
    .eq("q_token", token).maybeSingle();
  return { admin, row: data };
}

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token") || "";
  const { row } = await rowFor(token);
  if (!row || row.stage === "no") return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  return NextResponse.json({
    ok: true,
    business: row.business,
    first_name: String(row.owner_name || "").trim().split(/\s+/)[0] || "",
    questions: row.questions || [],
    answers: row.answers || {},
    returned: !!row.q_returned_at,
  });
}

export async function POST(req: Request) {
  let b: { token?: string; answers?: Record<string, { a?: string; star?: boolean }> } = {};
  try { b = await req.json(); } catch { return NextResponse.json({ ok: false }, { status: 400 }); }
  const { admin, row } = await rowFor(String(b.token || ""));
  if (!admin || !row || row.stage === "no") return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

  // Only accept answers to questions that actually exist on this row.
  const ids = new Set(((row.questions || []) as { id: string }[]).map((q) => q.id));
  const answers: Record<string, { a: string; star: boolean }> = {};
  for (const [id, v] of Object.entries(b.answers || {})) {
    if (!ids.has(id) || !v) continue;
    answers[id] = { a: String(v.a || "").slice(0, 4000), star: !!v.star };
  }
  const answered = Object.values(answers).filter((v) => v.a.trim()).length;
  if (!answered) return NextResponse.json({ ok: false, error: "empty" }, { status: 400 });

  const first = !row.q_returned_at;
  await admin.from("spotlight_prospects").update({ answers, q_returned_at: new Date().toISOString() }).eq("id", row.id);
  await admin.from("log_entries").insert({ user_id: row.user_id, tag: "CS", color: "var(--gold)", message: `spotlight · ${row.business} ${first ? "returned" : "updated"} their questions (${answered} answered)` });

  // Tell the operator — with the starred ones on top, since those are the
  // questions to ask on film day.
  if (first) {
    const qs = (row.questions || []) as { id: string; q: string }[];
    const ordered = [...qs].sort((x, y) => Number(!!answers[y.id]?.star) - Number(!!answers[x.id]?.star));
    const rows = ordered.filter((q) => answers[q.id]?.a?.trim()).map((q) => {
      const a = answers[q.id];
      return `<div style="padding:10px 0;border-bottom:1px solid #24385c"><div style="font-size:12px;color:${a.star ? "#ffb81c" : "#8ea3c4"}">${a.star ? "★ ASK ON CAMERA · " : ""}${esc(q.q)}</div><div style="font-size:13.5px;color:#f4f7fc;margin-top:5px;line-height:1.6">${esc(a.a)}</div></div>`;
    }).join("");
    await sendEmail({
      to: process.env.EMAIL_BCC || "hello@creativeimpactmedia.co",
      bcc: null,
      subject: `⭐ Spotlight questions back: ${row.business} (${answered} answered)`,
      html: emailShell(`<div style="font-size:15px;margin-bottom:10px">${esc(row.business)} answered their pre-shoot questions.</div><div style="font-size:12px;color:#8ea3c4;margin-bottom:6px">Starred = they want to talk about it on camera. Those are film day.</div>${rows}`),
    }).catch((e) => console.error("spotlight answers notify failed", e));
  }
  return NextResponse.json({ ok: true, answered });
}
