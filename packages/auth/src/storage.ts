export type AuthStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function resolveBrowserStorage(kind: "localStorage" | "sessionStorage"): AuthStorage {
  const storage = globalThis[kind];
  if (!storage) throw new Error(`Le stockage navigateur ${kind} est indisponible.`);
  return storage;
}

export const browserLocalAuthStorage: AuthStorage = {
  getItem(key) { return resolveBrowserStorage("localStorage").getItem(key); },
  setItem(key, value) { resolveBrowserStorage("localStorage").setItem(key, value); },
  removeItem(key) { resolveBrowserStorage("localStorage").removeItem(key); },
};

export const browserSessionAuthStorage: AuthStorage = {
  getItem(key) { return resolveBrowserStorage("sessionStorage").getItem(key); },
  setItem(key, value) { resolveBrowserStorage("sessionStorage").setItem(key, value); },
  removeItem(key) { resolveBrowserStorage("sessionStorage").removeItem(key); },
};

export function readStoredJson<T>(storage: AuthStorage, key: string): T | null {
  try {
    const value = storage.getItem(key);
    return value ? JSON.parse(value) as T : null;
  } catch {
    return null;
  }
}

export function writeStoredJson(storage: AuthStorage, key: string, value: unknown): void {
  storage.setItem(key, JSON.stringify(value));
}

export function clearStoredAuth(storage: AuthStorage, ...keys: string[]): void {
  keys.forEach((key) => storage.removeItem(key));
}

export type StoredAuthSession<TProfile = unknown> = {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  profile?: TProfile | null;
};

export function readAuthSession<TProfile>(storage: AuthStorage, key: string): StoredAuthSession<TProfile> | null {
  const session = readStoredJson<StoredAuthSession<TProfile>>(storage, key);
  return session?.accessToken ? session : null;
}

export function writeAuthSession<TProfile>(
  storage: AuthStorage,
  key: string,
  session: StoredAuthSession<TProfile>,
): void {
  writeStoredJson(storage, key, session);
}

export function hasUsableAccessToken(
  session: StoredAuthSession,
  now = Date.now(),
  clockSkewMs = 30_000,
): boolean {
  return Boolean(session.accessToken) && session.expiresAt > now + clockSkewMs;
}

export function clearAuthSession(storage: AuthStorage, key: string): void {
  clearStoredAuth(storage, key);
}
