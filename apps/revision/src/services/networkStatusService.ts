import { Network } from "@capacitor/network";
import { isNativeRuntime } from "./nativeRuntime";

type NetworkListener = (online: boolean) => void;
const listeners = new Set<NetworkListener>();
let online = typeof navigator === "undefined" ? true : navigator.onLine;
let initialized = false;
function notify(value: boolean) {
  online = value;
  listeners.forEach(listener => listener(value));
}
function initialize() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;
  if (isNativeRuntime()) {
    // App-lifetime singleton: no duplicate listener during StrictMode remounts.
    let changed = false;
    void Network.addListener("networkStatusChange", status => { changed = true; notify(status.connected); }).catch(() => undefined);
    void Network.getStatus().then(status => { if (!changed) notify(status.connected); }).catch(() => undefined);
  } else {
    window.addEventListener("online", () => notify(true));
    window.addEventListener("offline", () => notify(false));
  }
}
export function isOnline() { initialize(); return online; }
export function subscribeNetworkStatus(listener: NetworkListener) {
  initialize(); listeners.add(listener); listener(online);
  return () => { listeners.delete(listener); };
}
