import assert from "node:assert/strict";
import { readFile, access } from "node:fs/promises";
import test from "node:test";

const source = (path: string) => readFile(new URL(`../../${path}`, import.meta.url), "utf8");

test("Capacitor embarque le bundle local Android sans serveur distant", async () => {
  const config = await source("apps/revision/capacitor.config.ts");
  assert.match(config, /appId: "ci\.elima\.revision"/);
  assert.match(config, /webDir: "dist"/);
  assert.match(config, /androidScheme: "https"/);
  assert.doesNotMatch(config, /\burl\s*:/);
  await access(new URL("../../apps/revision/android/gradlew.bat", import.meta.url));
  const pkg = JSON.parse(await source("apps/revision/package.json"));
  assert.ok(pkg.dependencies["@aparajita/capacitor-secure-storage"], "plugin directly discoverable by Capacitor");
  assert.ok(pkg.dependencies["@capacitor/android"]);
  assert.match(pkg.scripts["build:web"], /--mode production/);
  assert.match(pkg.scripts["build:native"], /--mode native/);
});

test("Android cible SDK 36 et interdit HTTP et permissions non necessaires", async () => {
  const sdk = await source("apps/revision/android/variables.gradle");
  assert.match(sdk, /compileSdkVersion = 36\b/);
  assert.match(sdk, /targetSdkVersion = 36\b/);
  const app = await source("apps/revision/android/app/build.gradle");
  assert.match(app, /applicationId "ci\.elima\.revision"/);
  const manifest = await source("apps/revision/android/app/src/main/AndroidManifest.xml");
  assert.match(manifest, /android:allowBackup="false"/);
  assert.match(manifest, /android:usesCleartextTraffic="false"/);
  assert.match(manifest, /android\.permission\.INTERNET/);
  assert.doesNotMatch(manifest, /android\.permission\.(?:CAMERA|READ_EXTERNAL_STORAGE|WRITE_EXTERNAL_STORAGE|MANAGE_EXTERNAL_STORAGE|ACCESS_FINE_LOCATION|ACCESS_COARSE_LOCATION|RECORD_AUDIO)/);
});

test("les deux sessions passent par le stockage injecte et OAuth natif est bloque", async () => {
  const identity = await source("apps/revision/src/services/elimaIdentityService.ts");
  const supabase = await source("apps/revision/src/services/mainDbClient.ts");
  assert.doesNotMatch(identity, /browserLocalAuthStorage|\blocalStorage\b/);
  assert.match(identity, /writeAsyncAuthSession\(sensitiveAuthStorage/);
  assert.match(identity, /clearAsyncAuthSession\(sensitiveAuthStorage/);
  assert.match(identity, /if \(nativeOAuthDisabled\(\)\) throw/);
  assert.match(supabase, /storage: sensitiveAuthStorage/);
  const api = await source("apps/revision/src/services/api/apiClient.ts");
  assert.match(api, /requireRemoteBackend: isNativeRuntime\(\) \|\| isNativeBuild\(\)/);
});
