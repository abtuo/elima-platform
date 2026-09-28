import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { AuthFlowError, resolveIdentityPublicConfig } from "../../apps/api/server/identityAuth.mjs";
import { createAuthFlowService } from "../../apps/api/server/authFlowService.mjs";
import { createTwilioVerifyClient } from "../../apps/api/server/twilioVerify.mjs";
import { resolveIdentityBridgeConfig } from "../../apps/api/api/identity-bridge.mjs";

const phone = "+2250500000000";

class FakeStore {
  attempts: Array<{ phone: string; ip: string | null; action: string; at: Date }> = [];
  authorizations = new Map<string, { id: string; token: string; phone: string; purpose: string; expiresAt: Date; claimed: boolean; consumed: boolean; claim_id?: string }>();
  accounts = new Map<string, { id: string; password?: string }>();
  accountLookups = 0;
  created = 0;
  sequence = 0;
  now = new Date("2026-09-27T10:00:00.000Z");

  async registerAttempt(input: { phone: string; ip: string | null; action: string; since: Date; phoneLimit: number; ipLimit: number }) {
    const recent = this.attempts.filter((attempt) => attempt.at >= input.since && attempt.action === input.action);
    if (recent.filter((attempt) => attempt.phone === input.phone).length >= input.phoneLimit || (input.ip && recent.filter((attempt) => attempt.ip === input.ip).length >= input.ipLimit)) {
      throw new AuthFlowError("Trop de tentatives. Réessayez dans quelques minutes.", 429, "rate_limited");
    }
    this.attempts.push({ phone: input.phone, ip: input.ip, action: input.action, at: this.now });
  }

  async issueAuthorization(input: { phone: string; purpose: string; ttlSeconds: number }) {
    const token = `token-${++this.sequence}-${"x".repeat(32)}`;
    const row = { id: String(this.sequence), token, phone: input.phone, purpose: input.purpose, expiresAt: new Date(this.now.getTime() + input.ttlSeconds * 1000), claimed: false, consumed: false };
    this.authorizations.set(token, row);
    return { token, expiresAt: row.expiresAt };
  }

  row(token: string, expectedPhone: string, purposes: string[]) {
    const row = this.authorizations.get(token);
    if (!row || row.phone !== expectedPhone || !purposes.includes(row.purpose) || row.consumed || row.expiresAt <= this.now) throw new AuthFlowError("Autorisation invalide ou expirée.", 400, "invalid_authorization");
    return row;
  }

  async authorization(token: string, expectedPhone: string, purposes: string[]) { return this.row(token, expectedPhone, purposes); }
  async claimAuthorization(token: string, expectedPhone: string, purpose: string) {
    const row = this.row(token, expectedPhone, [purpose]);
    if (row.claimed) throw new AuthFlowError("Cette autorisation est déjà utilisée.", 409, "authorization_in_use");
    row.claimed = true; row.claim_id = `claim-${row.id}`;
    return row;
  }
  async consumeAuthorization(row: ReturnType<FakeStore["row"]>) { if (row.consumed) throw new AuthFlowError("Cette autorisation a déjà été utilisée.", 409); row.consumed = true; row.claimed = false; }
  async releaseAuthorization(row: ReturnType<FakeStore["row"]>) { if (!row.consumed) row.claimed = false; }
  async accountByPhone(value: string) { this.accountLookups += 1; return this.accounts.get(value) ?? null; }
  async createStudent(input: { phone: string; password: string }) { this.created += 1; const account = { id: `user-${this.created}`, password: input.password }; this.accounts.set(input.phone, account); return { userId: account.id, session: { access_token: "access" } }; }
  async updatePassword(id: string, password: string) { const account = [...this.accounts.values()].find((value) => value.id === id); if (!account) throw new Error("missing"); account.password = password; }
  expire(token: string) { const row = this.authorizations.get(token); if (row) row.expiresAt = new Date(this.now.getTime() - 1); }
}

function fixture(options: { existing?: boolean; sendError?: AuthFlowError; checkError?: AuthFlowError } = {}) {
  const store = new FakeStore();
  if (options.existing) store.accounts.set(phone, { id: "existing" });
  const calls = { send: 0, check: 0 };
  const twilio = {
    async send() { calls.send += 1; if (options.sendError) throw options.sendError; },
    async check() { calls.check += 1; if (options.checkError) throw options.checkError; },
  };
  return { store, calls, service: createAuthFlowService({ store, twilio, now: () => store.now }) };
}

async function verifiedSignup(service: ReturnType<typeof createAuthFlowService>) {
  const request = await service.requestVerification({ phone, purpose: "signup", ip: "203.0.113.1" });
  return service.checkVerification({ phone, code: "123456", requestToken: request.requestToken, ip: "203.0.113.1" });
}

test("demande OTP valide sans révéler l’existence du compte", async () => {
  const { service, store, calls } = fixture({ existing: true });
  const result = await service.requestVerification({ phone: "+225 05 00 00 00 00", purpose: "signup", ip: "203.0.113.1" });
  assert.ok(result.requestToken);
  assert.equal(calls.send, 1);
  assert.equal(store.accountLookups, 0);
});

test("numéro invalide refusé avant Twilio", async () => {
  const { service, calls } = fixture();
  await assert.rejects(service.requestVerification({ phone: "0500", purpose: "signup" }), /numéro WhatsApp valide/);
  assert.equal(calls.send, 0);
});

test("rate limit OTP après trois demandes", async () => {
  const { service, calls } = fixture();
  for (let index = 0; index < 3; index += 1) await service.requestVerification({ phone, purpose: "signup", ip: "203.0.113.1" });
  await assert.rejects(service.requestVerification({ phone, purpose: "signup", ip: "203.0.113.1" }), /Trop de tentatives/);
  assert.equal(calls.send, 3);
});

test("erreur Twilio masquée par un message utilisateur", async () => {
  const { service } = fixture({ sendError: new AuthFlowError("Nous n’avons pas pu envoyer le code pour le moment. Réessayez dans quelques instants.", 503, "twilio_unavailable") });
  await assert.rejects(service.requestVerification({ phone, purpose: "signup" }), /pas pu envoyer le code/);
});

test("OTP incorrect et expiré ne produisent aucune autorisation", async () => {
  for (const error of [
    new AuthFlowError("Ce code est incorrect. Vérifiez le message reçu sur WhatsApp.", 400, "invalid_code"),
    new AuthFlowError("Ce code a expiré. Demandez-en un nouveau.", 400, "code_expired"),
  ]) {
    const { service, store } = fixture({ checkError: error });
    const request = await service.requestVerification({ phone, purpose: "signup" });
    await assert.rejects(service.checkVerification({ phone, code: "123456", requestToken: request.requestToken }), new RegExp(error.message.split(".")[0]));
    assert.equal([...store.authorizations.values()].filter((row) => row.purpose === "signup").length, 0);
  }
});

test("OTP approuvé distingue numéro nouveau et numéro existant", async () => {
  const fresh = fixture();
  const newResult = await verifiedSignup(fresh.service);
  assert.equal(newResult.accountExists, false);
  assert.equal(newResult.purpose, "signup");
  const existing = fixture({ existing: true });
  const existingResult = await verifiedSignup(existing.service);
  assert.equal(existingResult.accountExists, true);
  assert.equal(existingResult.purpose, "phone_control");
});

test("signup exige une preuve valide, non expirée, du bon numéro et du bon purpose", async () => {
  const { service, store } = fixture();
  const valid = await verifiedSignup(service);
  const base = { phone, authorization: valid.authorization, firstName: "Awa", lastName: "Koné", password: "motdepasse", schoolLevel: "3e" };
  await assert.rejects(service.signup({ ...base, authorization: "absent" }), /Autorisation invalide/);
  await assert.rejects(service.signup({ ...base, phone: "+2250700000000" }), /Autorisation invalide/);
  store.expire(valid.authorization);
  await assert.rejects(service.signup(base), /expirée/);
  const resetProof = await store.issueAuthorization({ phone, purpose: "password_reset", ttlSeconds: 600 });
  await assert.rejects(service.signup({ ...base, authorization: resetProof.token }), /Autorisation invalide/);
});

test("signup valide crée le compte et interdit la réutilisation", async () => {
  const { service, store } = fixture();
  const proof = await verifiedSignup(service);
  const input = { phone, authorization: proof.authorization, firstName: "Awa", lastName: "Koné", password: "motdepasse", schoolLevel: "3e" };
  const result = await service.signup(input);
  assert.equal(result.ok, true);
  assert.equal(store.created, 1);
  await assert.rejects(service.signup(input), /invalide|expirée/);
});

test("signup refuse un numéro devenu existant", async () => {
  const { service, store } = fixture();
  const proof = await verifiedSignup(service);
  store.accounts.set(phone, { id: "race" });
  await assert.rejects(service.signup({ phone, authorization: proof.authorization, firstName: "Awa", lastName: "Koné", password: "motdepasse", schoolLevel: "3e" }), /déjà associé/);
});

test("password reset exige une preuve reset valide et liée au numéro", async () => {
  const { service, store } = fixture({ existing: true });
  const signup = await store.issueAuthorization({ phone, purpose: "signup", ttlSeconds: 600 });
  const reset = await store.issueAuthorization({ phone, purpose: "password_reset", ttlSeconds: 600 });
  const base = { phone, authorization: reset.token, password: "nouveaupasse" };
  await assert.rejects(service.resetPassword({ ...base, authorization: "absent" }), /Autorisation invalide/);
  await assert.rejects(service.resetPassword({ ...base, authorization: signup.token }), /Autorisation invalide/);
  await assert.rejects(service.resetPassword({ ...base, phone: "+2250700000000" }), /Autorisation invalide/);
  store.expire(reset.token);
  await assert.rejects(service.resetPassword(base), /expirée/);
});

test("password reset réussit une fois", async () => {
  const { service, store } = fixture({ existing: true });
  const reset = await store.issueAuthorization({ phone, purpose: "password_reset", ttlSeconds: 600 });
  const input = { phone, authorization: reset.token, password: "nouveaupasse" };
  await service.resetPassword(input);
  assert.equal(store.accounts.get(phone)?.password, "nouveaupasse");
  await assert.rejects(service.resetPassword(input), /invalide|expirée/);
});

test("compte existant passe du signup au reset sans second OTP", async () => {
  const { service, calls, store } = fixture({ existing: true });
  const proof = await verifiedSignup(service);
  const reset = await service.exchangePhoneControl({ phone, authorization: proof.authorization });
  await service.resetPassword({ phone, authorization: reset.authorization, password: "nouveaupasse" });
  assert.equal(calls.send, 1);
  assert.equal(calls.check, 1);
  assert.equal(store.accounts.get(phone)?.password, "nouveaupasse");
});

test("Twilio Verify envoie sur WhatsApp et n’approuve que status=approved", async () => {
  const requests: Array<{ url: string; body: string }> = [];
  const env = { TWILIO_ACCOUNT_SID: "AC_test", TWILIO_API_KEY: "SK_test", TWILIO_API_SECRET: "secret", TWILIO_VERIFY_SERVICE_SID: "VA_test" };
  const client = createTwilioVerifyClient({ env, fetchImpl: async (url, init) => {
    requests.push({ url: String(url), body: String(init?.body) });
    return new Response(JSON.stringify({ status: requests.length === 1 ? "pending" : "approved" }), { status: 200, headers: { "Content-Type": "application/json" } });
  } });
  await client.send(phone);
  await client.check(phone, "123456");
  assert.match(requests[0].url, /\/Verifications$/);
  assert.match(requests[0].body, /Channel=whatsapp/);
  assert.match(requests[1].url, /\/VerificationCheck$/);
});

test("login normal reste mot de passe Supabase sans OTP", async () => {
  const source = await readFile(new URL("../../apps/api/api/elima-password-login.mjs", import.meta.url), "utf8");
  assert.match(source, /auth\/v1\/token\?grant_type=password/);
  assert.match(source, /resolveIdentityPublicConfig/);
  assert.doesNotMatch(source, /auth-verification|Twilio|VerificationCheck/);
});

test("la configuration d’identité ne retombe jamais sur le Supabase Revision", () => {
  assert.throws(() => resolveIdentityPublicConfig({
    VITE_ELIMA_IDENTITY_URL: "https://nnsgvnjzfrcmbxfwlyow.supabase.co",
    VITE_SUPABASE_URL: "https://rydnrvvmwixrkmnvpajf.supabase.co",
    SUPABASE_URL: "https://rydnrvvmwixrkmnvpajf.supabase.co",
    ELIMA_IDENTITY_PUBLISHABLE_KEY: "public-test-key",
  }), (error: unknown) => error instanceof AuthFlowError && error.status === 503 && error.code === "identity_configuration_missing");

  const config = resolveIdentityPublicConfig({
    ELIMA_IDENTITY_URL: "https://nnsgvnjzfrcmbxfwlyow.supabase.co/",
    ELIMA_IDENTITY_PUBLISHABLE_KEY: "public-test-key",
  });
  assert.equal(config.url, "https://nnsgvnjzfrcmbxfwlyow.supabase.co");
});

test("le bridge sépare explicitement Identity de la session technique Revision", async () => {
  assert.throws(() => resolveIdentityBridgeConfig({
    VITE_ELIMA_IDENTITY_URL: "https://nnsgvnjzfrcmbxfwlyow.supabase.co",
    VITE_SUPABASE_URL: "https://rydnrvvmwixrkmnvpajf.supabase.co",
    SUPABASE_SECRET_KEY: "legacy-secret",
  }));

  const config = resolveIdentityBridgeConfig({
    ELIMA_IDENTITY_URL: "https://nnsgvnjzfrcmbxfwlyow.supabase.co/",
    ELIMA_IDENTITY_PUBLISHABLE_KEY: "identity-public-key",
    REVISION_SUPABASE_URL: "https://rydnrvvmwixrkmnvpajf.supabase.co/",
    REVISION_SUPABASE_SECRET_KEY: "revision-secret-key",
  });
  assert.equal(config.identityUrl, "https://nnsgvnjzfrcmbxfwlyow.supabase.co");
  assert.equal(config.revisionUrl, "https://rydnrvvmwixrkmnvpajf.supabase.co");
  assert.notEqual(config.identityUrl, config.revisionUrl);

  const source = await readFile(new URL("../../apps/api/api/identity-bridge.mjs", import.meta.url), "utf8");
  assert.match(source, /ELIMA_IDENTITY_URL/);
  assert.match(source, /ELIMA_IDENTITY_PUBLISHABLE_KEY/);
  assert.match(source, /REVISION_SUPABASE_URL/);
  assert.match(source, /REVISION_SUPABASE_(?:SECRET|SERVICE_ROLE)_KEY/);
  assert.match(source, /\/auth\/v1\/user/);
  assert.match(source, /external_subject.*externalSubject/);
  assert.match(source, /admin\.auth\.admin\.getUserById\(localUserId\)/);
  assert.match(source, /ensureRevisionProfile/);
  assert.doesNotMatch(source, /external_subject:\s*(?:phone|identityEmail)/);
  assert.doesNotMatch(source, /process\.env\.VITE_(?:ELIMA_IDENTITY|SUPABASE)_URL/);

  const migration = await readFile(new URL("../../supabase/migrations/20260715170000_elima_identity_links.sql", import.meta.url), "utf8");
  assert.match(migration, /local_user_id uuid not null unique references auth\.users\(id\)/i);
  assert.match(migration, /unique \(issuer, external_subject\)/i);
});
