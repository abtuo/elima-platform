import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { normalizeApiBase, resolveApiUrl } from "../../packages/api-client/src/apiUrl.ts";

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

test("les services Mobile/Révision et leurs modules partagés utilisent le client API commun", async () => {
  // Les wrappers ne contiennent plus les URLs extraites dans auth/revision-core.
  const implementations: Record<string, string[]> = {
    "apps/revision/src/services/accountDeletionService.ts": ["account-delete"],
    "packages/revision-core/src/learningApi.ts": ["learning"],
    "packages/revision-core/src/revisionApi.ts": ["revision-generate"],
    "packages/revision-core/src/revisionDocumentService.ts": ["revision-document-analyze", "revision-document-delete"],
    "packages/auth/src/whatsapp.ts": ["elima-signup", "auth-verification-request", "auth-verification-check", "auth-password-reset"],
    "apps/mobile/src/services/elimaIdentityService.ts": ["identity-bridge", "elima-password-login", "elima-profile", "elima-session"],
    "apps/revision/src/services/elimaIdentityService.ts": ["identity-bridge", "elima-password-login", "elima-profile", "elima-session"],
  };
  for (const [file, endpoints] of Object.entries(implementations)) {
    const source = await readFile(new URL(`../../${file}`, import.meta.url), "utf8");
    for (const endpoint of endpoints) {
      assert.match(source, new RegExp(`\\b(?:apiFetch|request)\\s*\\(\\s*(["'])/api/${endpoint}\\1`), `${file}: /api/${endpoint} doit utiliser le client commun`);
      assert.doesNotMatch(source, new RegExp(`\\bfetch\\s*\\(\\s*(["'])/api/${endpoint}\\1`), `${file}: fetch direct interdit pour /api/${endpoint}`);
      assert.equal(resolveApiUrl(`/api/${endpoint}`, { baseUrl: "https://api.elima.ci", environment: "production" }), `https://api.elima.ci/api/${endpoint}`);
    }
    if (file === "packages/auth/src/whatsapp.ts") {
      assert.match(source, /\bapiFetch\s*\(\s*path\s*,/, "le helper request doit déléguer au client injecté");
    }
  }
  for (const app of ["mobile", "revision"]) {
    const source = await readFile(new URL(`../../apps/${app}/src/services/registrationService.ts`, import.meta.url), "utf8");
    assert.match(source, /createWhatsAppAuthApi\s*\(\s*apiFetch\s*\)/, `${app}: injecter le client dans l'auth partagée`);
  }
});
