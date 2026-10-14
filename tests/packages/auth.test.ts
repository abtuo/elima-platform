import assert from "node:assert/strict";
import test from "node:test";
import {
  clearAuthSession,
  hasUsableAccessToken,
  NativeSecureStorage,
  readAsyncAuthSession,
  readAuthSession,
  WebStorage,
  writeAsyncAuthSession,
  writeAuthSession,
  type AuthStorage,
  type NativeSecureStorageDriver,
} from "../../packages/auth/src/storage.ts";
import { normalizeEmail, normalizePhone, phoneToEmail } from "../../packages/auth/src/identity.ts";

function memoryStorage(): AuthStorage {
  const values = new Map<string, string>();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => { values.set(key, value); },
    removeItem: (key) => { values.delete(key); },
  };
}

test("Auth normalise emails et téléphones sans changer leur contrat", () => {
  assert.equal(normalizeEmail(" Student@Example.COM "), "student@example.com");
  assert.equal(normalizePhone(" +225 (01) 02-03.04.05 "), "+2250102030405");
  assert.equal(phoneToEmail(" +225 01 02 03 04 05 "), "+2250102030405@phone.elima");
});

test("Auth restaure une session stockée", () => {
  const storage = memoryStorage();
  writeAuthSession(storage, "session", { accessToken: "access", refreshToken: "refresh", expiresAt: 123, profile: { id: "u1" } });
  assert.deepEqual(readAuthSession(storage, "session"), {
    accessToken: "access",
    refreshToken: "refresh",
    expiresAt: 123,
    profile: { id: "u1" },
  });
});

test("Auth ignore une session absente, corrompue ou sans access token", () => {
  const storage = memoryStorage();
  assert.equal(readAuthSession(storage, "session"), null);
  storage.setItem("session", "{");
  assert.equal(readAuthSession(storage, "session"), null);
  storage.setItem("session", JSON.stringify({ refreshToken: "refresh", expiresAt: 123 }));
  assert.equal(readAuthSession(storage, "session"), null);
});

test("Auth distingue un access token utilisable d'une session expirante", () => {
  assert.equal(hasUsableAccessToken({ accessToken: "access", expiresAt: 131_000 }, 100_000), true);
  assert.equal(hasUsableAccessToken({ accessToken: "access", expiresAt: 129_000 }, 100_000), false);
});

test("Auth nettoie la session au logout", () => {
  const storage = memoryStorage();
  writeAuthSession(storage, "session", { accessToken: "access", expiresAt: 123 });
  clearAuthSession(storage, "session");
  assert.equal(readAuthSession(storage, "session"), null);
});

test("WebStorage conserve le contrat navigateur existant", () => {
  const previous = globalThis.localStorage;
  const storage = memoryStorage() as Storage;
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: storage });
  try {
    const web = new WebStorage("localStorage");
    web.setItem("session", "value");
    assert.equal(web.getItem("session"), "value");
    web.removeItem("session");
    assert.equal(web.getItem("session"), null);
  } finally {
    Object.defineProperty(globalThis, "localStorage", { configurable: true, value: previous });
  }
});

test("NativeSecureStorage migre une ancienne session puis utilise le coffre", async () => {
  const legacy = memoryStorage();
  legacy.setItem("session", JSON.stringify({ accessToken: "legacy-access", refreshToken: "legacy-refresh", expiresAt: 123 }));
  const values = new Map<string, string>();
  let prefix = "";
  const driver: NativeSecureStorageDriver = {
    async setKeyPrefix(value) { prefix = value; },
    async getItem(key) { return values.get(key) ?? null; },
    async setItem(key, value) { values.set(key, value); },
    async removeItem(key) { values.delete(key); },
  };
  const native = new NativeSecureStorage(legacy, driver);
  assert.equal((await readAsyncAuthSession(native, "session"))?.refreshToken, "legacy-refresh");
  assert.equal(prefix, "elima_revision_auth_");
  assert.equal(legacy.getItem("session"), null);

  await writeAsyncAuthSession(native, "session", { accessToken: "native-access", expiresAt: 456 });
  assert.equal((await readAsyncAuthSession(native, "session"))?.accessToken, "native-access");
});

test("le coffre indisponible ne perd pas la session a migrer et ne replie pas les ecritures", async () => {
  const legacy = memoryStorage();
  legacy.setItem("session", "original");
  const driver: NativeSecureStorageDriver = {
    async setKeyPrefix() {},
    async getItem() { return null; },
    async setItem() { throw new Error("secure storage unavailable"); },
    async removeItem() {},
  };
  const native = new NativeSecureStorage(legacy, driver);
  await assert.rejects(native.getItem("session"));
  assert.equal(legacy.getItem("session"), "original");
  await assert.rejects(native.setItem("other-session", "secret"));
  assert.equal(legacy.getItem("other-session"), null);
});
