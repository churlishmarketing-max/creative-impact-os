"use client";

import dynamic from "next/dynamic";

// The cockpit is a fully client-side app (live clock, boot sequence, localStorage/
// session checks, Supabase reads). Rendering it on the server then hydrating causes
// server/client mismatches, so we load it client-only.
const Cockpit = dynamic(() => import("./cockpit/Cockpit"), {
  ssr: false,
  loading: () => <div style={{ minHeight: "100vh", background: "#0a1322" }} />,
});

export default function CockpitClient(props: Record<string, unknown>) {
  return <Cockpit {...props} />;
}
