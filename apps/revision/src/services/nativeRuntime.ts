import { App, type URLOpenListenerEvent } from "@capacitor/app";
import { Capacitor, type PluginListenerHandle } from "@capacitor/core";

export function isNativeRuntime() {
  return Capacitor.isNativePlatform();
}

export function isNativeBuild() {
  return import.meta.env.VITE_NATIVE_BUILD === "true";
}

export function nativePlatform() {
  return Capacitor.getPlatform();
}

export type NativeAppHooks = {
  onBackButton?: (canGoBack: boolean) => void;
  onAppUrlOpen?: (event: URLOpenListenerEvent) => void;
};

/** Prepared for the Android navigation/deep-link step; no listener is installed yet. */
export async function registerNativeAppHooks(hooks: NativeAppHooks) {
  if (!isNativeRuntime()) return () => undefined;
  const listeners: PluginListenerHandle[] = [];
  if (hooks.onBackButton) listeners.push(await App.addListener("backButton", ({ canGoBack }) => hooks.onBackButton?.(canGoBack)));
  if (hooks.onAppUrlOpen) listeners.push(await App.addListener("appUrlOpen", (event) => hooks.onAppUrlOpen?.(event)));
  return async () => { await Promise.all(listeners.map((listener) => listener.remove())); };
}
