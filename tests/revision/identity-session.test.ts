import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { createIdentitySessionLifecycle, type IdentitySession } from "../../apps/revision/src/services/identitySessionLifecycle.ts";
import { WebStorage, NativeSecureStorage, type AsyncAuthStorage } from "../../packages/auth/src/storage.ts";

function harness(storage: AsyncAuthStorage) {
  let local: { user: string } | null = { user: "revision-user" };
  let refreshCount = 0;
  let bridgeCount = 0;
  let invalid = false;
  let unavailable = false;
  let bridgeUnavailable = false;
  const revoked: string[] = [];
  const key = "identity";
  const read = async () => {
    const raw = await storage.getItem(key);
    return raw ? JSON.parse(raw) as IdentitySession<{ id: string }> : null;
  };
  const write = async (session: IdentitySession<{ id: string }>) => { await storage.setItem(key, JSON.stringify(session)); };
  const lifecycle = createIdentitySessionLifecycle({
    read, write, clear: async () => { await storage.removeItem(key); }, now: () => 100_000,
    refresh: async (token) => {
      assert.equal(token, "old-refresh");
      refreshCount++;
      if (unavailable) throw new Error("network unavailable");
      return invalid ? null : { access_token: "new-access", refresh_token: "new-refresh", expires_at: 3700 };
    },
    bridge: async (token) => {
      assert.ok(["new-access", "valid-access"].includes(token));
      bridgeCount++;
      if (bridgeUnavailable) throw new Error("bridge unavailable");
      local = { user: "revision-user" };
      return { id: "identity-user" };
    },
    localSession: async () => local,
    clearLocal: async () => { local = null; },
    revoke: async (token) => { revoked.push(token); },
  });
  return { lifecycle, read, write, revoked,
    counts: () => ({ refreshCount, bridgeCount }), local: () => local,
    missingLocal: () => { local = null; }, invalidate: () => { invalid = true; },
    offline: () => { unavailable = true; }, bridgeFailure: (value: boolean) => { bridgeUnavailable = value; },
  };
}

for (const runtime of ["web", "native"] as const) {
  test(`Identity lifecycle ${runtime}: restore, refresh, bridge, logout`, async (t) => {
    const originalStorage = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
    t.after(() => {
      if (originalStorage) Object.defineProperty(globalThis, "localStorage", originalStorage);
      else Reflect.deleteProperty(globalThis, "localStorage");
    });
    function setup() {
      const entries = new Map<string, string>();
      let storage: AsyncAuthStorage;
      const backing = { getItem: (key: string) => entries.get(key) ?? null,
        setItem: (key: string, value: string) => { entries.set(key, value); }, removeItem: (key: string) => { entries.delete(key); } };
      if (runtime === "web") {
        Object.defineProperty(globalThis, "localStorage", { configurable: true, value: backing });
        storage = new WebStorage("localStorage");
      } else {
        storage = new NativeSecureStorage(undefined, { setKeyPrefix: async () => {},
          getItem: async (key) => backing.getItem(key), setItem: async (key, value) => backing.setItem(key, value),
          removeItem: async (key) => backing.removeItem(key) });
      }
      return harness(storage);
    }
    const valid = { accessToken: "valid-access", refreshToken: "old-refresh", expiresAt: 200_000, profile: { id: "identity-user" } };
    await t.test("valid central and technical sessions need no HTTP refresh/bridge", async () => {
      const h = setup(); await h.write(valid);
      assert.equal((await h.lifecycle.restore())?.local?.user, "revision-user");
      assert.deepEqual(h.counts(), { refreshCount: 0, bridgeCount: 0 });
    });
    await t.test("valid central session recreates absent Revision session", async () => {
      const h = setup(); await h.write(valid); h.missingLocal();
      assert.ok((await h.lifecycle.restore())?.local);
      assert.deepEqual(h.counts(), { refreshCount: 0, bridgeCount: 1 });
    });
    await t.test("expired session rotates once across concurrent restores, then bridges", async () => {
      const h = setup(); await h.write({ ...valid, expiresAt: 0 });
      await Promise.all([h.lifecycle.restore(), h.lifecycle.restore()]);
      assert.deepEqual(h.counts(), { refreshCount: 1, bridgeCount: 1 });
      assert.equal((await h.read())?.refreshToken, "new-refresh");
      assert.equal((await h.read())?.expiresAt, 3_700_000);
    });
    await t.test("invalid refresh clears both sessions", async () => {
      const h = setup(); await h.write({ ...valid, expiresAt: 0 }); h.invalidate();
      assert.equal(await h.lifecycle.restore(), null);
      assert.equal(await h.read(), null); assert.equal(h.local(), null);
    });
    await t.test("expired session without refresh token signs out", async () => {
      const h = setup(); await h.write({ ...valid, expiresAt: 0, refreshToken: undefined });
      assert.equal(await h.lifecycle.restore(), null);
      assert.equal(await h.read(), null); assert.equal(h.local(), null);
    });
    await t.test("missing central session never accepts an orphan technical session", async () => {
      const h = setup(); assert.equal(await h.lifecycle.restore(), null); assert.equal(h.local(), null);
    });
    await t.test("network failure preserves tokens", async () => {
      const h = setup(); await h.write({ ...valid, expiresAt: 0 }); h.offline();
      await assert.rejects(h.lifecycle.restore());
      assert.equal((await h.read())?.refreshToken, "old-refresh");
    });
    await t.test("rotation persists before failed bridge and retries without refresh reuse", async () => {
      const h = setup(); await h.write({ ...valid, expiresAt: 0 }); h.bridgeFailure(true);
      await assert.rejects(h.lifecycle.restore());
      assert.equal((await h.read())?.refreshToken, "new-refresh");
      assert.equal((await h.read())?.bridgePending, true);
      h.bridgeFailure(false); await h.lifecycle.restore();
      assert.deepEqual(h.counts(), { refreshCount: 1, bridgeCount: 2 });
    });
    await t.test("logout waits for refresh then erases sessions without resurrection", async () => {
      const h = setup(); await h.write({ ...valid, expiresAt: 0 });
      await Promise.all([h.lifecycle.restore(), h.lifecycle.logout()]);
      assert.equal(await h.read(), null); assert.equal(h.local(), null);
      assert.deepEqual(h.revoked, ["new-access"]);
    });
    await t.test("login/signup stores central tokens and creates technical session", async () => {
      const h = setup(); h.missingLocal();
      const result = await h.lifecycle.accept({ access_token: "valid-access", refresh_token: "old-refresh", expires_in: 3600 });
      assert.equal(result.local?.user, "revision-user");
      assert.equal((await h.read())?.expiresAt, 3_700_000);
    });
  });
}

test("main restoration uses the API refresh, never the OAuth token exchange", async () => {
  const source = await readFile(new URL("../../apps/revision/src/services/elimaIdentityService.ts", import.meta.url), "utf8");
  const lifecycle = source.slice(source.indexOf("const identityLifecycle"), source.indexOf("export async function signInWithElimaPassword"));
  assert.match(lifecycle, /apiFetch\("\/api\/elima-session"/);
  assert.doesNotMatch(lifecycle, /oauth|window\.location|browserSessionAuthStorage/i);
  const provider = await readFile(new URL("../../apps/revision/src/features/auth/AuthProvider.tsx", import.meta.url), "utf8");
  assert.match(provider, /await restoreElimaSession\(\)/);
  assert.match(provider, /await clearElimaIdentitySession\(\)/);
});

test("logout attempts both storage removals even when one fails", async () => {
  let localCleared = false;
  const lifecycle = createIdentitySessionLifecycle({
    read: async () => null, write: async () => {},
    clear: async () => { throw new Error("secure storage unavailable"); },
    refresh: async () => null, bridge: async () => null, localSession: async () => null,
    clearLocal: async () => { localCleared = true; }, revoke: async () => {},
  });
  await assert.rejects(lifecycle.logout(), /secure storage unavailable/);
  assert.equal(localCleared, true);
});
