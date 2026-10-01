import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import test from "node:test";
import { API_ENDPOINTS, API_ROUTES, REVISION_API_ENDPOINTS } from "../../apps/api/server/routes.mjs";
import catchAllHandler, { endpointFromRequest } from "../../apps/api/api/[...route].mjs";

test("@elima/api possède les quatorze routes et les douze routes Révision", () => {
  assert.deepEqual(API_ENDPOINTS, [
    "account-delete",
    "activate-school", "auth-password-reset", "auth-verification-check", "auth-verification-request",
    "elima-password-login", "elima-profile", "elima-signup", "identity-bridge",
    "learning", "registration-request", "revision-generate", "revision-document-analyze", "revision-document-delete",
  ]);
  assert.equal(REVISION_API_ENDPOINTS.length, 12);
});

test("Vercel expose un seul routeur catch-all", async () => {
  const entries = (await readdir(new URL("../../apps/api/api/", import.meta.url))).filter((name) => name.endsWith(".mjs"));
  assert.deepEqual(entries, ["[...route].mjs"]);
  assert.equal(API_ROUTES.size, 14);
  assert.equal(endpointFromRequest({ url: "/api/elima-signup" }), "elima-signup");
  assert.equal(endpointFromRequest({ url: "/api/revision-document-analyze?source=scanner" }), "revision-document-analyze");
  assert.equal(endpointFromRequest({ query: { route: ["identity-bridge"] } }), "identity-bridge");
  assert.equal(endpointFromRequest({ query: { route: ["identity-bridge", "nested"] } }), "");
});

test("le catch-all conserve le routage par URL et les contrats de méthode", async () => {
  const response = () => ({
    statusCode: 200,
    body: undefined as unknown,
    headers: new Map<string, string>(),
    setHeader(name: string, value: string) { this.headers.set(name, value); return this; },
    getHeader(name: string) { return this.headers.get(name); },
    status(code: number) { this.statusCode = code; return this; },
    json(body: unknown) { this.body = body; return this; },
  });
  const methodResponse = response();
  await catchAllHandler({ url: "/api/elima-password-login", method: "GET", headers: {}, body: {} }, methodResponse);
  assert.equal(methodResponse.statusCode, 405);

  const missingResponse = response();
  await catchAllHandler({ url: "/api/unknown", method: "GET", headers: {} }, missingResponse);
  assert.equal(missingResponse.statusCode, 404);
});

test("les adaptateurs Vite chargent le backend autonome", async () => {
  for (const file of ["../../apps/mobile/vite.config.ts", "../../apps/revision/vite.base.ts"]) {
    const source = await readFile(new URL(file, import.meta.url), "utf8");
    assert.match(source, /apps\/api\/server\/handlers\/\$\{endpoint\}\.mjs/);
    assert.match(source, /apps\/api\/server\/handlers\/revision-generate\.mjs/);
  }
});

test("learning résout le corpus racine et Vercel l'inclut", async () => {
  const learning = await readFile(new URL("../../apps/api/server/handlers/learning.mjs", import.meta.url), "utf8");
  const vercel = JSON.parse(await readFile(new URL("../../apps/api/vercel.json", import.meta.url), "utf8"));
  assert.match(learning, /\.\.\/\.\.\/\.\.\/\.\.\/data\/exams/);
  assert.equal(vercel.functions["api/*.mjs"].includeFiles, "../../data/exams/**");
  await access(new URL("../../data/exams/6eme-maths-guided-sessions-v3.json", import.meta.url));
});

test("les scripts racine délèguent à @elima/api", async () => {
  const root = JSON.parse(await readFile(new URL("../../package.json", import.meta.url), "utf8"));
  for (const name of ["dev:api", "build:api", "typecheck:api", "test:api", "lint:api"]) {
    assert.match(root.scripts[name], /@elima\/api/);
  }
});

test("signup, OTP et reset ne passent plus par Platform", async () => {
  for (const name of ["auth-verification-request", "auth-verification-check", "auth-password-reset", "elima-signup"]) {
    const source = await readFile(new URL(`../../apps/api/server/handlers/${name}.mjs`, import.meta.url), "utf8");
    assert.doesNotMatch(source, /www\.elima\.ci|VITE_WEB_BASE_URL|\/api\/auth\//, name);
  }
});

test("la migration Twilio Auth vit uniquement dans le répertoire Supabase canonique", async () => {
  await access(new URL("../../supabase/migrations/20260927090000_twilio_verify_auth_flows.sql", import.meta.url));
  await assert.rejects(access(new URL("../../apps/platform/supabase/migrations/20260927090000_twilio_verify_auth_flows.sql", import.meta.url)));
  const readme = await readFile(new URL("../../apps/api/README.md", import.meta.url), "utf8");
  assert.match(readme, /supabase\/migrations\/20260927090000_twilio_verify_auth_flows\.sql/);
  assert.doesNotMatch(readme, /apps\/platform\/supabase\/migrations\/20260927090000_twilio_verify_auth_flows\.sql/);
});
