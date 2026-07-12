import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { sendEmail, esc } from "@/lib/email";

export const runtime = "nodejs";

// Clarity Engine "Email it to me": sends the FULL Authority Clarity Brief in
// the document brand (cream/teal — reads like the PDF), wrapped in a congrats
// note whose one CTA is a booking call. BCC's the operator on every send.
// Abuse guards: session must exist via the signed ingest webhook, brief is
// rendered SERVER-SIDE from the stored board_read, one email claim per session.

const T = { cream: "#F0EDE8", ink: "#1a1a18", teal: "#007A87", red: "#C41E3A", gold: "#C8960A", muted: "#5a5852" };
const BOOK_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://os.creativeimpactmedia.co") + "/go/book";

type Read = {
  authorityStatement?: string;
  idealAvatar?: { name?: string; snapshot?: string; keepsThemUp?: string; whatMakesThemBuy?: string; whereToFind?: string; alreadyTried?: string; assumptions?: string[] };
  coreProblem?: string;
  uniqueMechanism?: { name?: string; description?: string };
  transformation?: { from?: string; to?: string };
  authorityAngle?: string;
  messagingPillars?: string[];
  sampleHook?: string;
  sayThisNotThat?: { instead?: string; say?: string };
  boardVerdict?: { member?: string; take?: string }[];
  firstMove?: string;
};

function sect(label: string): string {
  return `<div style="font-family:'Barlow Condensed','Arial Narrow',Arial,sans-serif;font-weight:800;font-size:13px;letter-spacing:3px;color:${T.teal};text-transform:uppercase;margin:26px 0 8px">${esc(label)}</div>`;
}
function body(text?: string, bold = false): string {
  return text ? `<div style="font-size:15px;color:${T.ink};line-height:1.65;${bold ? "font-weight:700;" : ""}margin:0 0 6px">${esc(text)}</div>` : "";
}
function kv(k: string, v?: string): string {
  return v ? `<div style="font-size:14px;line-height:1.6;margin:0 0 5px"><span style="color:${T.muted};text-transform:uppercase;font-size:11px;letter-spacing:1px">${esc(k)}: </span><span style="color:${T.ink}">${esc(v)}</span></div>` : "";
}

function briefHtml(r: Read): string {
  const a = r.idealAvatar || {};
  return [
    sect("01 / Your Authority Position"),
    `<div style="font-family:'Barlow Condensed','Arial Narrow',Arial,sans-serif;font-weight:800;font-size:24px;line-height:1.15;color:${T.ink}">${esc(r.authorityStatement || "")}</div>`,
    sect("02 / Your Real Buyer"),
    body(a.name, true), body(a.snapshot),
    kv("Keeps them up", a.keepsThemUp), kv("What makes them buy", a.whatMakesThemBuy),
    kv("Where to find them", a.whereToFind), kv("Already tried", a.alreadyTried),
    (a.assumptions || []).length ? kv("Verify before betting on", (a.assumptions || []).join(" · ")) : "",
    sect("03 / The Core Problem"), body(r.coreProblem),
    sect("04 / Your Unique Mechanism"), body([r.uniqueMechanism?.name, r.uniqueMechanism?.description].filter(Boolean).join(" — ")),
    sect("05 / The Transformation"), body(`From: ${r.transformation?.from || ""}  →  To: ${r.transformation?.to || ""}`),
    sect("06 / Your Edge"), body(r.authorityAngle),
    sect("07 / Messaging Pillars"), ...(r.messagingPillars || []).map((x, i) => body(`${i + 1}. ${x}`)),
    sect("08 / Say This, Not That"),
    kv("Instead of", r.sayThisNotThat?.instead), kv("Say", r.sayThisNotThat?.say),
    sect("The Board's Verdict"),
    ...(r.boardVerdict || []).map((v) => body(`${v.member ? v.member + ": " : ""}${v.take || ""}`)),
    sect("Sample Hook"), body(r.sampleHook ? `“${r.sampleHook}”` : "", true),
    sect("First Move"), body(r.firstMove, true),
  ].filter(Boolean).join("");
}

function fullEmail(r: Read): string {
  return `<div style="background:${T.cream};padding:28px 14px;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
  <div style="max-width:640px;margin:0 auto">
    <div style="border-top:5px solid ${T.teal};background:#ffffff;padding:28px 30px;border:1px solid #ddd8cf">
      <div style="font-family:'Barlow Condensed','Arial Narrow',Arial,sans-serif;font-weight:800;font-size:12px;letter-spacing:3px;color:${T.teal};text-transform:uppercase;margin-bottom:14px">Creative Impact — Authority Clarity Engine</div>
      <div style="font-family:'Barlow Condensed','Arial Narrow',Arial,sans-serif;font-weight:800;font-size:30px;line-height:1.05;color:${T.ink};text-transform:uppercase">Congrats — the hard part&rsquo;s done.</div>
      <div style="font-size:15px;color:${T.ink};line-height:1.7;margin:14px 0 0">Most owners never sit down and get this clear about who they serve and why it&rsquo;s them. You just did — and the board noticed. Your full Authority Clarity Brief is below: save it, hand it to your team, run with the hook.</div>
      <div style="font-size:15px;color:${T.ink};line-height:1.7;margin:12px 0 0">When you&rsquo;re ready to turn this clarity into booked work, that part is a 15-minute conversation.</div>
      <div style="margin:20px 0 6px"><a href="${BOOK_URL}" style="display:inline-block;background:${T.red};color:#ffffff;font-family:'Barlow Condensed','Arial Narrow',Arial,sans-serif;font-weight:800;font-size:17px;letter-spacing:1px;text-transform:uppercase;text-decoration:none;padding:14px 22px">&rarr; Let&rsquo;s map out your game plan — grab a free 15-minute call</a></div>
    </div>
    <div style="background:#ffffff;border:1px solid #ddd8cf;border-top:none;padding:8px 30px 30px">
      <div style="height:1px;background:${T.gold};margin:18px 0 4px"></div>
      ${briefHtml(r)}
      <div style="height:1px;background:${T.gold};margin:26px 0 14px"></div>
      <div style="font-size:12px;color:${T.muted};line-height:1.7"><b style="color:${T.ink}">Brandon King</b> · Creative Impact · hello@creativeimpactmedia.co<br/>We tell you what&rsquo;s wrong before we sell you the fix.</div>
    </div>
  </div>
</div>`;
}

export async function POST(req: Request) {
  const admin = getAdminClient();
  if (!admin) return NextResponse.json({ ok: false }, { status: 400 });

  let external_id = "", email = "";
  try { ({ external_id, email } = await req.json()); } catch { return NextResponse.json({ ok: false }, { status: 400 }); }
  email = String(email || "").trim().toLowerCase();
  if (!external_id || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ ok: false, error: "bad_input" }, { status: 400 });

  const { data: s } = await admin.from("clarity_sessions").select("id, email, board_read").eq("external_id", String(external_id)).maybeSingle();
  if (!s) return NextResponse.json({ ok: false, error: "unknown_session" }, { status: 404 });
  if (s.email) return NextResponse.json({ ok: s.email === email, already: true }); // one claim per session
  if (!s.board_read) return NextResponse.json({ ok: false, error: "no_brief" }, { status: 400 });

  const res = await sendEmail({
    to: email,
    bcc: process.env.EMAIL_BCC || "hello@creativeimpactmedia.co", // operator copy, always
    subject: "Congrats — your Authority Clarity Brief is in",
    replyTo: process.env.EMAIL_REPLY_TO,
    from: `Brandon King — Creative Impact <hello@os.creativeimpactmedia.co>`,
    html: fullEmail(s.board_read as Read),
  });
  if (!res.ok) return NextResponse.json({ ok: false, error: "send_failed" }, { status: 500 });
  await admin.from("clarity_sessions").update({ email }).eq("id", s.id);
  return NextResponse.json({ ok: true });
}
