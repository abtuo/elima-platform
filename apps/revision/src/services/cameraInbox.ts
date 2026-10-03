/** One-shot delivery survives route/auth restoration in the current app launch. */
export function createCameraInbox<T>() {
  let pending: T | undefined;
  const listeners = new Set<() => void>();
  return {
    put(value: T) { pending = value; [...listeners].forEach(listener => listener()); },
    has: () => pending !== undefined,
    take() { const value = pending; pending = undefined; return value; },
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
  };
}
