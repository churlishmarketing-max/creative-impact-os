"use client";

import React, { useState } from "react";
import { getBrowserClient, supabaseConfigured } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    const sb = getBrowserClient();
    if (!sb) {
      setErr("Supabase is not configured yet. Add your keys to .env.local.");
      return;
    }
    setBusy(true);
    const { error } = await sb.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) {
      setErr(error.message || "Sign-in failed.");
      return;
    }
    window.location.assign("/");
  }

  const field: React.CSSProperties = {
    width: "100%",
    background: "#060c17",
    border: "1px solid var(--line2, #33455f)",
    color: "var(--cream, #f4f7fc)",
    padding: "11px 13px",
    fontFamily: "var(--mono, ui-monospace, monospace)",
    fontSize: "14px",
    marginTop: "6px",
  };
  const label: React.CSSProperties = {
    fontFamily: "var(--mono, monospace)",
    fontSize: "10px",
    letterSpacing: ".22em",
    color: "var(--dim, #5c7096)",
    textTransform: "uppercase",
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg, #0a1322)",
        color: "var(--cream, #f4f7fc)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "var(--mono, ui-monospace, monospace)",
      }}
    >
      <form
        onSubmit={submit}
        style={{
          width: "340px",
          background: "#101d33",
          border: "1px solid var(--line, #24385c)",
          padding: "30px 26px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "22px" }}>
          <div
            style={{
              position: "relative",
              width: "38px",
              height: "38px",
              border: "2px solid var(--red, #ffb81c)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "#1a1608",
              flexShrink: 0,
            }}
          >
            <div
              style={{
                width: 0,
                height: 0,
                borderTop: "7px solid transparent",
                borderBottom: "7px solid transparent",
                borderLeft: "11px solid var(--red, #ffb81c)",
                marginLeft: "3px",
              }}
            />
          </div>
          <div>
            <div style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 900, fontSize: "21px", lineHeight: 0.86 }}>
              CI<span style={{ color: "var(--red, #ffb81c)" }}>/</span>OS
            </div>
            <div style={{ fontSize: "8px", letterSpacing: ".3em", color: "var(--dim, #5c7096)", marginTop: "3px" }}>
              OPERATING SYSTEM
            </div>
          </div>
        </div>

        <div style={{ marginBottom: "14px" }}>
          <div style={label}>Email</div>
          <input
            style={field}
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div style={{ marginBottom: "18px" }}>
          <div style={label}>Password</div>
          <input
            style={field}
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        {err ? (
          <div style={{ color: "var(--red, #ffb81c)", fontSize: "12px", marginBottom: "14px", lineHeight: 1.4 }}>{err}</div>
        ) : null}

        <button
          type="submit"
          disabled={busy}
          style={{
            width: "100%",
            background: "var(--red, #ffb81c)",
            color: "#1a1608",
            border: "none",
            padding: "12px",
            fontFamily: "var(--mono, monospace)",
            fontSize: "12px",
            fontWeight: 700,
            letterSpacing: ".18em",
            textTransform: "uppercase",
            cursor: busy ? "default" : "pointer",
            opacity: busy ? 0.6 : 1,
          }}
        >
          {busy ? "Authenticating…" : "Authenticate →"}
        </button>

        {!supabaseConfigured ? (
          <div style={{ fontSize: "11px", color: "var(--dim, #5c7096)", marginTop: "16px", lineHeight: 1.5 }}>
            Supabase not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local.
          </div>
        ) : null}
      </form>
    </div>
  );
}
