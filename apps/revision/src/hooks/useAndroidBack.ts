import { useEffect, useRef } from "react";
import { androidBack } from "../services/androidBack";
import { isNativeRuntime } from "../services/nativeRuntime";

export function useAndroidBack(handler: () => boolean, priority = 50) {
  const current = useRef(handler);
  current.current = handler;
  useEffect(() => {
    if (!isNativeRuntime()) return;
    return androidBack.register(priority, () => current.current());
  }, [priority]);
}

export function useRevealAuthError(error: string) {
  useEffect(() => {
    if (!error) return;
    const timer = window.setTimeout(() => document.querySelector('[role="alert"], [data-auth-error]')?.scrollIntoView({ block: "center", behavior: "smooth" }), 100);
    return () => window.clearTimeout(timer);
  }, [error]);
}
