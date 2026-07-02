import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Browser Supabase client for Realtime (notifications). Returns null when the
 * public env vars aren't configured — callers then fall back to polling.
 *
 * To enable true realtime, set in the environment:
 *   NEXT_PUBLIC_SUPABASE_URL       (e.g. https://<ref>.supabase.co)
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY
 * (The "Notification" table is already added to the supabase_realtime publication.)
 */
let cached: SupabaseClient | null | undefined;

export function getSupabase(): SupabaseClient | null {
  if (cached !== undefined) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  cached = url && key
    ? createClient(url, key, { realtime: { params: { eventsPerSecond: 2 } } })
    : null;
  return cached;
}
