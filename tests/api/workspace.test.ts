import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";
import { API_ENDPOINTS, REVISION_API_ENDPOINTS } from "../../apps/api/server/routes.mjs";

test("@elima/api possède les onze routes et les neuf routes Révision", () => {
  assert.deepEqual(API_ENDPOINTS, [
    "activate-school", "auth-password-reset", "auth-verification-check", "auth-verification-request",
    "elima-password-login", "elima-profile", "elima-signup", "identity-bridge",
    "learning", "registration-request", "revision-generate",
  ]);
  assert.equal(REVISION_API_ENDPOINTS.length, 9);
});

test("les adaptateurs Vite chargent le backend autonome", async () => {
  for (const file of ["../../apps/mobile/vite.config.ts", "../../apps/revision/vite.base.ts"]) {
    const source = await readFile(new URL(file, import.meta.url), "utf8");
    assert.match(source, /apps\/api\/api\/\$\{endpoint\}\.mjs/);
    assert.match(source, /apps\/api\/api\/revision-generate\.mjs/);
  }
});

test("learning résout le corpus racine et Vercel l'inclut", async () => {
  const learning = await readFile(new URL("../../apps/api/api/learning.mjs", import.meta.url), "utf8");
  const vercel = JSON.parse(await readFile(new URL("../../apps/api/vercel.json", import.meta.url), "utf8"));
  assert.match(learning, /\.\.\/\.\.\/\.\.\/data\/exams/);
  assert.equal(vercel.functions["api/learning.mjs"].includeFiles, "../../data/exams/**");
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
    const source = await readFile(new URL(`../../apps/api/api/${name}.mjs`, import.meta.url), "utf8");
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
