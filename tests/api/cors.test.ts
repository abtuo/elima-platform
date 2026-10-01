import assert from "node:assert/strict";
import test from "node:test";
import { handleRevisionCors } from "../../apps/api/server/revisionCors.mjs";

function response() {
  return {
    headers: new Map<string, string>(), statusCode: 200, body: undefined as unknown, ended: false,
    setHeader(name: string, value: string) { this.headers.set(name.toLowerCase(), value); return this; },
    getHeader(name: string) { return this.headers.get(name.toLowerCase()); },
    status(code: number) { this.statusCode = code; return this; },
    json(body: unknown) { this.body = body; this.ended = true; return this; },
    end() { this.ended = true; return this; },
  };
}

const native = { origin: "https://localhost", "access-control-request-method": "POST", "access-control-request-headers": "content-type, authorization" };

test("preflight natif explicitement autorisé : 204 sans logique métier ni credentials", () => {
  const res = response();
  assert.equal(handleRevisionCors({ method: "OPTIONS", headers: native }, res, ["POST"], "https://localhost,https://web.example.com"), true);
  assert.equal(res.statusCode, 204);
  assert.equal(res.ended, true);
  assert.equal(res.body, undefined);
  assert.equal(res.getHeader("Access-Control-Allow-Origin"), "https://localhost");
  assert.equal(res.getHeader("Access-Control-Allow-Methods"), "POST, OPTIONS");
  assert.equal(res.getHeader("Access-Control-Allow-Headers"), "Content-Type, Authorization");
  assert.equal(res.getHeader("Access-Control-Allow-Credentials"), undefined);
});

test("requête normale autorisée : laisse les guards métier s'exécuter", () => {
  const res = response();
  assert.equal(handleRevisionCors({ method: "POST", headers: native }, res, ["POST"], "https://localhost"), false);
  assert.equal(res.ended, false);
  assert.equal(res.getHeader("Access-Control-Allow-Origin"), "https://localhost");
});

test("origine inconnue, null ou wildcard : aucune réflexion aveugle", () => {
  for (const method of ["POST", "OPTIONS"]) for (const origin of ["https://evil.example", "null", "https://localhost"]) {
    const res = response();
    assert.equal(handleRevisionCors({ method, headers: { ...native, origin } }, res, ["POST"], "*,invalid,https://web.example.com"), true);
    assert.equal(res.statusCode, 403);
    assert.equal(res.getHeader("Access-Control-Allow-Origin"), undefined);
  }
});

test("same-origin web et appels sans Origin restent compatibles", () => {
  for (const headers of [{}, { host: "app.example.com", "x-forwarded-proto": "https", origin: "https://app.example.com" }, { host: "127.0.0.1:5173", origin: "http://127.0.0.1:5173" }]) {
    const res = response();
    assert.equal(handleRevisionCors({ method: "POST", headers }, res, ["POST"], ""), false);
    assert.equal(res.ended, false);
  }
});

test("Vary existant est conservé et Origin n'est pas dupliqué", () => {
  const res = response();
  res.setHeader("Vary", "Accept-Encoding, Origin");
  handleRevisionCors({ method: "GET", headers: {} }, res, ["GET"], "");
  assert.equal(res.getHeader("Vary"), "Accept-Encoding, Origin");
});

test("preflight avec méthode ou header non autorisé est refusé", () => {
  for (const headers of [{ ...native, "access-control-request-method": "DELETE" }, { ...native, "access-control-request-headers": "X-Secret" }]) {
    const res = response();
    assert.equal(handleRevisionCors({ method: "OPTIONS", headers }, res, ["POST"], "https://localhost"), true);
    assert.ok([400,405].includes(res.statusCode));
  }
});

test("les endpoints Révision court-circuitent OPTIONS avant leur logique métier", async () => {
  for (const name of ["account-delete", "learning", "revision-generate", "revision-document-analyze", "revision-document-delete", "identity-bridge", "elima-password-login", "elima-profile", "elima-signup", "auth-verification-request", "auth-verification-check", "auth-password-reset"]) {
    const { default: handler } = await import(new URL(`../../apps/api/server/handlers/${name}.mjs`, import.meta.url).href);
    const res = response();
    const previous = process.env.REVISION_ALLOWED_ORIGINS;
    process.env.REVISION_ALLOWED_ORIGINS = "https://localhost";
    try {
      const headers = { ...native, "access-control-request-method": name === "elima-profile" ? "GET" : "POST" };
      await handler({ method: "OPTIONS", headers, get body() { throw new Error("Le preflight ne doit pas accéder au payload"); } }, res);
      assert.equal(res.statusCode, 204, name);
    } finally {
      if (previous === undefined) delete process.env.REVISION_ALLOWED_ORIGINS;
      else process.env.REVISION_ALLOWED_ORIGINS = previous;
    }
  }
});

test("CORS ne désactive pas l'authentification d'elima-profile", async () => {
  const { default: handler } = await import("../../apps/api/server/handlers/elima-profile.mjs");
  const res = response();
  await handler({ method: "GET", headers: { host: "app.example.com", "x-forwarded-proto": "https", origin: "https://app.example.com" } }, res);
  assert.equal(res.statusCode, 401);
  assert.equal(res.getHeader("Access-Control-Allow-Origin"), "https://app.example.com");
});
