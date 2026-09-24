import assert from "node:assert/strict";
import test from "node:test";
import { normalizeApiBase, resolveApiUrl } from "../../packages/api-client/src/apiUrl.ts";

test("API Client conserve le same-origin sans base explicite", () => {
  assert.equal(resolveApiUrl("/api/learning", { environment: "production" }), "/api/learning");
});

test("API Client normalise une origine HTTPS et les slashs", () => {
  assert.equal(
    resolveApiUrl("/api/learning", { baseUrl: " https://API.example.com/// ", environment: "production" }),
    "https://api.example.com/api/learning",
  );
});

test("API Client refuse les bases invalides et les chemins embarqués", () => {
  for (const baseUrl of ["invalid", "ftp://api.example.com", "https://api.example.com/api", "https://api.example.com/?token=x"]) {
    assert.throws(() => normalizeApiBase({ baseUrl, environment: "production" }));
  }
});

test("API Client autorise HTTP uniquement sur localhost en développement", () => {
  assert.equal(normalizeApiBase({ baseUrl: "http://localhost:3000", environment: "development" }), "http://localhost:3000");
  assert.throws(() => normalizeApiBase({ baseUrl: "http://localhost:3000", environment: "production" }));
  assert.throws(() => normalizeApiBase({ baseUrl: "http://api.example.com", environment: "development" }));
});

test("API Client refuse qu'un endpoint change d'origine", () => {
  assert.throws(() => resolveApiUrl("https://evil.example/api/learning", { environment: "production" }));
  assert.throws(() => resolveApiUrl("/api/../secret", { environment: "production" }));
});

test("API Client peut exiger un backend distant", () => {
  assert.throws(() => normalizeApiBase({ environment: "production", requireRemoteBackend: true }));
  assert.throws(() => normalizeApiBase({ baseUrl: "https://localhost", environment: "production", requireRemoteBackend: true }));
  assert.equal(
    normalizeApiBase({ baseUrl: "https://api.example.com", environment: "production", requireRemoteBackend: true }),
    "https://api.example.com",
  );
});
