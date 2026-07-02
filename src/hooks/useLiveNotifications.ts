"use client";

import { useEffect, useRef } from "react";
import { getSupabase } from "@/lib/supabaseClient";

/**
 * Keeps notifications fresh without a page refresh.
 * - Subscribes to Supabase Realtime INSERTs on the Notification table for this
 *   user when configured (fires `onChange` immediately on a new notification).
 * - Always runs a lightweight poll as a fallback so it works even without the
 *   realtime keys, and while the tab regains focus.
 */
export function useLiveNotifications(userId: string | undefined, onChange: () => void) {
  const cb = useRef(onChange);
  cb.current = onChange;

  useEffect(() => {
    if (!userId) return;

    // Poll fallback (covers no-realtime setups).
    const interval = setInterval(() => cb.current(), 20000);
    const onFocus = () => cb.current();
    window.addEventListener("focus", onFocus);

    // Supabase Realtime (if configured).
    const sb = getSupabase();
    const channel = sb
      ? sb
          .channel(`notif:${userId}`)
          .on(
            "postgres_changes",
            { event: "INSERT", schema: "public", table: "Notification", filter: `userId=eq.${userId}` },
            () => cb.current()
          )
          .subscribe()
      : null;

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      if (sb && channel) sb.removeChannel(channel);
    };
  }, [userId]);
}
