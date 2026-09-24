import assert from "node:assert/strict";
import test from "node:test";
import {
  clearAuthSession,
  hasUsableAccessToken,
  readAuthSession,
  writeAuthSession,
  type AuthStorage,
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
