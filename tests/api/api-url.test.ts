import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { normalizeApiBase, resolveApiUrl } from "../../src/services/api/apiUrl.ts";

test("sans base, les appels web restent same-origin", () => {
  assert.equal(resolveApiUrl("/api/learning", { environment: "production" }), "/api/learning");
  assert.equal(resolveApiUrl("/api/learning", { baseUrl: "  ", environment: "development" }), "/api/learning");
});

test("la base HTTPS est normalisée et résout les slashs via URL", () => {
  for (const baseUrl of ["https://backend.example.com", "https://backend.example.com/", " https://BACKEND.example.com:443/// "]) {
    assert.equal(resolveApiUrl("/api/learning", { baseUrl, environment: "production" }), "https://backend.example.com/api/learning");
  }
});

test("HTTP localhost reste limité au développement", () => {
  for (const host of ["localhost", "127.0.0.1", "[::1]"]) {
    const baseUrl = `http://${host}:3000`;
    assert.equal(resolveApiUrl("/api/learning", { baseUrl, environment: "development" }), `${baseUrl}/api/learning`);
    for (const environment of ["production", "demo"] as const) assert.throws(() => normalizeApiBase({ baseUrl, environment }));
  }
  assert.throws(() => normalizeApiBase({ baseUrl: "http://backend.example.com", environment: "development" }));
});

test("les bases invalides, credentials, chemins et queries sont refusés", () => {
  for (const baseUrl of ["invalid", "//backend.example.com", "ftp://backend.example.com", "https://user:password@backend.example.com", "https://backend.example.com/api", "https://backend.example.com/?token=secret", "https://backend.example.com/#fragment"]) {
    assert.throws(() => normalizeApiBase({ baseUrl, environment: "production" }));
  }
});

test("un endpoint ne peut pas détourner les tokens vers une autre origine", () => {
  for (const endpoint of ["https://evil.example/api/learning", "//evil.example/api/learning", "/api/../secret", "/api/%2e%2e/secret", "/api/learning#fragment"]) {
    assert.throws(() => resolveApiUrl(endpoint, { baseUrl: "https://backend.example.com", environment: "production" }));
  }
});

test("le futur bootstrap natif peut exiger un backend HTTPS distant", () => {
  for (const baseUrl of ["", "http://localhost:3000", "https://localhost", "https://127.0.0.1"]) {
    assert.throws(() => normalizeApiBase({ baseUrl, environment: "development", requireRemoteBackend: true }));
  }
  assert.equal(normalizeApiBase({ baseUrl: "https://backend.example.com/", environment: "production", requireRemoteBackend: true }), "https://backend.example.com");
});

test("les huit APIs Révision utilisent apiFetch sans modifier Supabase/OAuth", async () => {
  const endpoints = ["learning", "revision-generate", "identity-bridge", "elima-password-login", "elima-profile", "elima-signup", "auth-verification-request", "auth-password-reset"];
  const sources = await Promise.all(["learningService", "revisionDataService", "elimaIdentityService", "registrationService"].map(file => readFile(new URL(`../../src/services/${file}.ts`, import.meta.url), "utf8")));
  const source = sources.join("\n");
  for (const endpoint of endpoints) {
    assert.ok(source.includes(`apiFetch("/api/${endpoint}"`));
    assert.ok(!source.includes(`fetch("/api/${endpoint}"`));
  }
  assert.match(source, /fetch\(`\$\{env.elimaIdentityUrl/);
});
