export type AuthStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export type AsyncAuthStorage = {
  getItem(key: string): string | null | Promise<string | null>;
  setItem(key: string, value: string): void | Promise<void>;
  removeItem(key: string): void | Promise<void>;
};

export type NativeSecureStorageDriver = {
  setKeyPrefix(prefix: string): Promise<void>;
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
};

function resolveBrowserStorage(kind: "localStorage" | "sessionStorage"): AuthStorage {
  const storage = globalThis[kind];
  if (!storage) throw new Error(`Le stockage navigateur ${kind} est indisponible.`);
  return storage;
}

export class WebStorage implements AuthStorage {
  private readonly kind: "localStorage" | "sessionStorage";

  constructor(kind: "localStorage" | "sessionStorage") { this.kind = kind; }

  getItem(key: string) { return resolveBrowserStorage(this.kind).getItem(key); }
  setItem(key: string, value: string) { resolveBrowserStorage(this.kind).setItem(key, value); }
  removeItem(key: string) { resolveBrowserStorage(this.kind).removeItem(key); }
}

export class NativeSecureStorage implements AsyncAuthStorage {
  private readonly ready: Promise<void>;
  private readonly legacyStorage?: AuthStorage;
  private readonly driver: NativeSecureStorageDriver;

  constructor(
    legacyStorage: AuthStorage | undefined,
    driver: NativeSecureStorageDriver,
    prefix = "elima_revision_auth_",
  ) {
    this.legacyStorage = legacyStorage;
    this.driver = driver;
    this.ready = driver.setKeyPrefix(prefix);
  }

  async getItem(key: string) {
    await this.ready;
    const secured = await this.driver.getItem(key);
    if (secured !== null) {
      this.legacyStorage?.removeItem(key);
      return secured;
    }
    if (!this.legacyStorage) return null;

    const legacy = this.legacyStorage.getItem(key);
    if (legacy === null) return null;
    await this.driver.setItem(key, legacy);
    this.legacyStorage.removeItem(key);
    return legacy;
  }

  async setItem(key: string, value: string) {
    await this.ready;
    await this.driver.setItem(key, value);
    this.legacyStorage?.removeItem(key);
  }

  async removeItem(key: string) {
    await this.ready;
    await this.driver.removeItem(key);
    this.legacyStorage?.removeItem(key);
  }
}

export const browserLocalAuthStorage: AuthStorage = new WebStorage("localStorage");

export const browserSessionAuthStorage: AuthStorage = new WebStorage("sessionStorage");

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

export async function readAsyncAuthSession<TProfile>(storage: AsyncAuthStorage, key: string): Promise<StoredAuthSession<TProfile> | null> {
  try {
    const value = await storage.getItem(key);
    if (!value) return null;
    const session = JSON.parse(value) as StoredAuthSession<TProfile>;
    return session?.accessToken ? session : null;
  } catch {
    return null;
  }
}

export async function writeAsyncAuthSession<TProfile>(storage: AsyncAuthStorage, key: string, session: StoredAuthSession<TProfile>) {
  await storage.setItem(key, JSON.stringify(session));
}

export async function clearAsyncAuthSession(storage: AsyncAuthStorage, key: string) {
  await storage.removeItem(key);
}
