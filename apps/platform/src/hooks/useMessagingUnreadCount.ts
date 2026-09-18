"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { MESSAGING_UPDATED_EVENT } from "@/lib/messaging/unread-events";

const POLL_MS = 12_000;

export function useMessagingUnreadCount(enabled = true) {
  const [count, setCount] = useState(0);
  const pathname = usePathname();

  const refresh = useCallback(async () => {
    if (!enabled) return;
    try {
      const res = await fetch("/api/messaging/unread-count", { cache: "no-store" });
      if (!res.ok) return;
      const body = (await res.json()) as { total?: number };
      setCount(Math.max(0, Number(body.total ?? 0)));
    } catch {
    }
  }, [enabled]);

  useEffect(() => {
    if (enabled) return;
    const id = window.setTimeout(() => setCount(0), 0);
    return () => window.clearTimeout(id);
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;

    const immediateId = window.setTimeout(() => void refresh(), 0);
    const onUpdate = () => void refresh();
    const id = window.setInterval(() => void refresh(), POLL_MS);
    window.addEventListener(MESSAGING_UPDATED_EVENT, onUpdate);
    window.addEventListener("focus", onUpdate);
    document.addEventListener("visibilitychange", onUpdate);

    return () => {
      window.clearTimeout(immediateId);
      window.clearInterval(id);
      window.removeEventListener(MESSAGING_UPDATED_EVENT, onUpdate);
      window.removeEventListener("focus", onUpdate);
      document.removeEventListener("visibilitychange", onUpdate);
    };
  }, [enabled, refresh]);

  useEffect(() => {
    if (!enabled) return;
    const id = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(id);
  }, [pathname, enabled, refresh]);

  return count;
}
