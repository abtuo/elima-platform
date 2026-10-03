import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { App } from "@capacitor/app";
import { SystemBars, SystemBarsStyle, type PluginListenerHandle } from "@capacitor/core";
import { Keyboard } from "@capacitor/keyboard";
import { SplashScreen } from "@capacitor/splash-screen";
import { androidBack, backDestination } from "../services/androidBack";
import { isNativeRuntime, nativePlatform } from "../services/nativeRuntime";
import { hasRecoveredPhoto, subscribeRecoveredPhoto } from "../services/nativeCamera";
import { useAuth } from "../features/auth/AuthProvider";

export function NativeRuntimeEffects() {
  const location = useLocation();
  const navigate = useNavigate();
  const { authenticated, loading } = useAuth();
  const current = useRef({ location, navigate }); current.current = { location, navigate };

  useEffect(() => {
    if (!isNativeRuntime() || nativePlatform() !== "android") return;
    const style = location.pathname === "/" && !authenticated ? SystemBarsStyle.Dark : SystemBarsStyle.Light;
    void SystemBars.setStyle({ style }).catch(() => undefined);
  }, [location.pathname, authenticated]);

  useEffect(() => {
    if (!isNativeRuntime() || loading || !authenticated) return;
    const openScanner = () => { if (hasRecoveredPhoto()) navigate("/student/reviser?mode=scanner"); };
    openScanner();
    return subscribeRecoveredPhoto(openScanner);
  }, [authenticated, loading, navigate]);

  useEffect(() => {
    if (!isNativeRuntime()) return;
    let disposed = false;
    let keyboardOpen = false;
    let focusTimer = 0;
    const handles: PluginListenerHandle[] = [];
    const listen = (pending: Promise<PluginListenerHandle>) => {
      void pending.then(handle => { if (disposed) void handle.remove(); else handles.push(handle); }).catch(() => undefined);
    };
    const scrollField = () => {
      window.clearTimeout(focusTimer);
      focusTimer = window.setTimeout(() => {
        if (document.activeElement?.matches("input,textarea,select")) document.activeElement.scrollIntoView({ block: "center", behavior: "smooth" });
      }, 250);
    };
    const setKeyboard = (open: boolean) => {
      keyboardOpen = open;
      document.documentElement.classList.toggle("native-keyboard-open", open);
      if (open) scrollField();
    };
    document.documentElement.classList.add("native-app");
    listen(Keyboard.addListener("keyboardDidShow", () => setKeyboard(true)));
    listen(Keyboard.addListener("keyboardDidHide", () => setKeyboard(false)));
    document.addEventListener("focusin", scrollField);
    const invalid = (event: Event) => (event.target as HTMLElement)?.scrollIntoView({ block: "center", behavior: "smooth" });
    document.addEventListener("invalid", invalid, true);
    const unregisterKeyboard = androidBack.register(90, async () => {
      if (!keyboardOpen) return false;
      await Keyboard.hide();
      (document.activeElement as HTMLElement)?.blur?.();
      setKeyboard(false); return true;
    });
    if (nativePlatform() === "android") {
      listen(App.addListener("backButton", ({ canGoBack }) => {
        void androidBack.dispatch(async () => {
          const { location: latest, navigate: go } = current.current;
          const action = backDestination(latest.pathname, canGoBack ? Number(window.history.state?.idx ?? 0) : 0);
          if (action === "minimize") await App.minimizeApp();
          else if (action === "history") go(-1);
          else go(action, { replace: true });
        }).catch(() => undefined);
      }));
      void SystemBars.show().catch(() => undefined);
    }
    void SplashScreen.hide().catch(() => undefined);
    return () => {
      disposed = true; unregisterKeyboard();
      handles.forEach(handle => { void handle.remove(); });
      document.removeEventListener("focusin", scrollField);
      document.removeEventListener("invalid", invalid, true);
      window.clearTimeout(focusTimer);
      document.documentElement.classList.remove("native-app", "native-keyboard-open");
    };
  }, []);
  return null;
}
