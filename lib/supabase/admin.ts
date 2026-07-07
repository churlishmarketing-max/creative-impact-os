import { createClient } from "@supabase/supabase-js";

// SERVER-ONLY admin client (service role). Never import this into a client
// component. Used to mark an invoice paid after Stripe confirms payment.
export function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}
