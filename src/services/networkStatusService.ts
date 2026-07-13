type NetworkListener = (online: boolean) => void;

const listeners = new Set<NetworkListener>();

function notify() {
  const online = navigator.onLine;
  listeners.forEach((fn) => fn(online));
}

if (typeof window !== "undefined") {
  window.addEventListener("online", notify);
  window.addEventListener("offline", notify);
}

export function isOnline() {
  return typeof navigator !== "undefined" ? navigator.onLine : true;
}

export function subscribeNetworkStatus(listener: NetworkListener) {
  listeners.add(listener);
  listener(isOnline());
  return () => { listeners.delete(listener); };
}
