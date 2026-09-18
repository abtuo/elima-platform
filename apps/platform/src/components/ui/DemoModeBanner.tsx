"use client";

import { resolveAppMode } from "@/lib/app-mode";

export function DemoModeBanner() {
  const mode = resolveAppMode({
    NEXT_PUBLIC_ELIMA_APP_MODE: process.env.NEXT_PUBLIC_ELIMA_APP_MODE,
    NODE_ENV: process.env.NODE_ENV,
  });

  if (mode !== "demo") return null;

  return (
    <div className="fixed bottom-3 right-3 z-30 rounded-full border border-emerald-200 bg-white/95 px-3 py-1.5 text-xs font-semibold text-emerald-800 shadow-sm backdrop-blur">
      Mode demo
    </div>
  );
}
