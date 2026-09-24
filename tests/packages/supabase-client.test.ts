import assert from "node:assert/strict";
import test from "node:test";
import { readFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { hasPublicSupabaseConfig, parsePublicSupabaseConfig } from "../../packages/supabase-client/src/config.ts";

test("Supabase Client accepte et normalise une configuration publique", () => {
  assert.deepEqual(
    parsePublicSupabaseConfig({ url: " https://project.supabase.co/ ", publishableKey: " public-key " }),
    { url: "https://project.supabase.co", publishableKey: "public-key" },
  );
});

test("Supabase Client détecte une configuration publique complète", () => {
  assert.equal(hasPublicSupabaseConfig({ url: "https://project.supabase.co", publishableKey: "key" }), true);
  assert.equal(hasPublicSupabaseConfig({ url: "", publishableKey: "key" }), false);
});

test("Supabase Client refuse une configuration manquante ou invalide", () => {
  assert.throws(() => parsePublicSupabaseConfig({ url: "", publishableKey: "" }));
  assert.throws(() => parsePublicSupabaseConfig({ url: "not-a-url", publishableKey: "key" }));
  assert.throws(() => parsePublicSupabaseConfig({ url: "ftp://project.example", publishableKey: "key" }));
});

test("les packages client n'importent ni ne référencent aucun secret serveur", async () => {
  const packageRoot = fileURLToPath(new URL("../../packages/", import.meta.url));
  const packageNames = ["auth", "api-client", "supabase-client"];
  const forbidden = [
    "SUPABASE_" + "SERVICE_ROLE_KEY",
    "SUPABASE_" + "SECRET_KEY",
    "OPENAI_" + "API_KEY",
    "AZURE_OPENAI_" + "API_KEY",
    "TWILIO_" + "AUTH_TOKEN",
    "RESEND_" + "API_KEY",
    "DATABASE_" + "URL",
  ];
  for (const packageName of packageNames) {
    const sourceDirectory = `${packageRoot}${packageName}/src`;
    const files = (await readdir(sourceDirectory)).filter((name) => name.endsWith(".ts"));
    const source = (await Promise.all(files.map((name) => readFile(`${sourceDirectory}/${name}`, "utf8")))).join("\n");
    for (const name of forbidden) assert.equal(source.includes(name), false, `${packageName} expose ${name}`);
  }
});
