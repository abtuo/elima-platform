import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

test("la production Révision est fail-closed et la démo exige une activation locale explicite", async () => {
  const env = await readFile(new URL("../../apps/revision/src/services/env.ts", import.meta.url), "utf8");
  const auth = await readFile(new URL("../../apps/revision/src/features/auth/AuthProvider.tsx", import.meta.url), "utf8");
  assert.match(env, /import\.meta\.env\.DEV.*appEnv === "development".*appMode === "demo".*enableDemoMode/);
  assert.match(env, /getRevisionConfigurationError/);
  assert.match(env, /Configuration de l’application incomplète/);
  assert.match(auth, /if \(configurationError\)/);
  assert.doesNotMatch(env, /enableDemoMode:\s*import\.meta\.env\.VITE_ENABLE_DEMO_MODE !== "false"/);
});

test("le manifest PWA français fournit des icônes any et maskable et un fallback SPA", async () => {
  const vite = await readFile(new URL("../../apps/revision/vite.base.ts", import.meta.url), "utf8");
  const vercel = JSON.parse(await readFile(new URL("../../apps/revision/vercel.json", import.meta.url), "utf8"));
  assert.match(vite, /lang: "fr"/);
  assert.match(vite, /pwa-192\.png.*purpose: "any"/);
  assert.match(vite, /pwa-512\.png.*purpose: "any"/);
  assert.match(vite, /pwa-maskable-192\.png.*purpose: "maskable"/);
  assert.match(vite, /pwa-maskable-512\.png.*purpose: "maskable"/);
  assert.match(vite, /navigateFallback: "\/index\.html"/);
  assert.deepEqual(vercel.rewrites, [{ source: "/(.*)", destination: "/index.html" }]);
  const headerKeys = vercel.headers[0].headers.map((header: { key: string }) => header.key);
  for (const key of ["Content-Security-Policy", "Referrer-Policy", "Permissions-Policy", "X-Content-Type-Options"]) assert.ok(headerKeys.includes(key));
});

test("les icônes PWA ont exactement les dimensions annoncées", async () => {
  for (const [file, width, height] of [["pwa-192.png", 192, 192], ["pwa-512.png", 512, 512], ["pwa-maskable-192.png", 192, 192], ["pwa-maskable-512.png", 512, 512]] as const) {
    const png = await readFile(new URL(`../../apps/revision/public/icons/${file}`, import.meta.url));
    assert.equal(png.readUInt32BE(16), width);
    assert.equal(png.readUInt32BE(20), height);
  }
});

test("le Scanner compresse puis envoie en stockage privé seulement au lancement de l’analyse", async () => {
  const service = await readFile(new URL("../../apps/revision/src/services/revisionDocumentService.ts", import.meta.url), "utf8");
  assert.match(service, /10 \* 1024 \* 1024/);
  assert.match(service, /revision-document-uploads/);
  assert.match(service, /createImageBitmap/);
  assert.match(service, /canvas\.toBlob/);
  assert.match(service, /storagePath/);
  assert.doesNotMatch(service, /readAsDataURL|contentBase64/);
});
