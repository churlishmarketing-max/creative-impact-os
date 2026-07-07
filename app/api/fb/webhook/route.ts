import { NextResponse } from "next/server";
import crypto from "crypto";
import { getAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

// Facebook Lead Ads webhook.
//   GET  = Meta's subscription verification handshake.
//   POST = a new lead -> fetch its fields from the Graph API -> create a Lead client.
// Env (server-only): FB_VERIFY_TOKEN, FB_APP_SECRET, FB_PAGE_ACCESS_TOKEN.

export async function GET(req: Request) {
  const url = new URL(req.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  if (mode === "subscribe" && token && token === process.env.FB_VERIFY_TOKEN) {
    return new Response(challenge || "", { status: 200 });
  }
  return new Response("forbidden", { status: 403 });
}

function verifySig(raw: string, header: string | null, secret: string) {
  if (!header) return false;
  const expected = "sha256=" + crypto.createHmac("sha256", secret).update(raw).digest("hex");
  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function POST(req: Request) {
  const raw = await req.text();
  const appSecret = process.env.FB_APP_SECRET;
  const pageToken = process.env.FB_PAGE_ACCESS_TOKEN;

  // Verify the payload really came from Meta.
  if (appSecret && !verifySig(raw, req.headers.get("x-hub-signature-256"), appSecret)) {
    return new Response("bad signature", { status: 403 });
  }

  let body: any;
  try { body = JSON.parse(raw); } catch { return NextResponse.json({ ok: true }); }

  const admin = getAdminClient();

  // Single-user app: resolve the owner + their connected-FB token (DB first —
  // written by the Connect Facebook flow — env var as legacy fallback).
  let ownerId: string | null = null;
  let dbPageToken: string | null = null;
  if (admin) {
    const { data: row } = await admin.from("app_state").select("user_id, ops").limit(1).maybeSingle();
    ownerId = row?.user_id || null;
    dbPageToken = row?.ops?.__fb?.token || null;
    if (!ownerId) {
      try {
        const { data: u } = await admin.auth.admin.listUsers();
        ownerId = u?.users?.[0]?.id || null;
      } catch {}
    }
  }
  const effectiveToken = dbPageToken || pageToken;

  const leadIds: string[] = [];
  for (const entry of body.entry || []) {
    for (const change of entry.changes || []) {
      const lid = change?.value?.leadgen_id;
      if (lid) leadIds.push(String(lid));
    }
  }

  for (const lid of leadIds) {
    try {
      if (!effectiveToken || !admin || !ownerId) break;
      const r = await fetch(`https://graph.facebook.com/v21.0/${lid}?access_token=${encodeURIComponent(effectiveToken)}`);
      const lead = await r.json();
      const fields: Record<string, string> = {};
      for (const fd of lead.field_data || []) fields[fd.name] = (fd.values || [])[0] || "";
      const name = fields.company_name || fields.business_name || "";
      const contact = fields.full_name || [fields.first_name, fields.last_name].filter(Boolean).join(" ") || "";
      const notes = Object.entries(fields).map(([k, v]) => `${k}: ${v}`).join("\n");
      await admin.from("clients").insert({
        user_id: ownerId,
        name: name || contact || "Facebook lead",
        contact_name: contact || null,
        email: fields.email || null,
        phone: fields.phone_number || fields.phone || null,
        status: "Lead",
        source: "Facebook",
        notes,
      });
    } catch (e) {
      console.error("fb lead import failed", e);
    }
  }

  // Meta requires a fast 200 or it retries.
  return NextResponse.json({ ok: true });
}
