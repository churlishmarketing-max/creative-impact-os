import { createBrowserClient } from "@supabase/ssr";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** True only when Supabase env vars are present (real mode). */
export const supabaseConfigured = !!(URL && KEY);

let _client: ReturnType<typeof createBrowserClient> | null = null;

/** Browser Supabase client (singleton). Null when not configured (local dev). */
export function getBrowserClient() {
  if (!supabaseConfigured) return null;
  if (!_client) _client = createBrowserClient(URL!, KEY!);
  return _client;
}
