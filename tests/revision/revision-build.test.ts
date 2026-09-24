import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";
import { getRevisionDemoProfile, revisionDemoAccounts } from "../../apps/revision/src/revisionDemoAuth.ts";

const routerUrl = new URL("../../apps/revision/src/router.tsx", import.meta.url);

async function sourceFiles(directory: URL): Promise<URL[]> {
  const result: URL[] = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const url = new URL(entry.name + (entry.isDirectory() ? "/" : ""), directory);
    if (entry.isDirectory()) result.push(...await sourceFiles(url));
    else if (/\.(?:ts|tsx|js|mjs)$/.test(entry.name)) result.push(url);
  }
  return result;
}

test("le routeur autonome expose les parcours majeurs de Révision", async () => {
  const source = await readFile(routerUrl, "utf8");
  for (const route of [
    "/auth/login",
    "/auth/inscription",
    "/auth/mot-de-passe-oublie",
    "/student/reviser",
    "/student/reviser/parcours/session/:id",
    "/student/reviser/parcours/resultats/:contentType/:id",
    "/student/reviser/quiz",
    "/student/reviser/fiches",
    "/student/reviser/fiches/:id",
    "/student/profil",
  ]) assert.match(source, new RegExp(route.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
});

test("l'application Révision est autonome et ne référence aucun espace School", async () => {
  const files = [
    ...await sourceFiles(new URL("../../apps/revision/src/", import.meta.url)),
    new URL("../../apps/revision/vite.config.ts", import.meta.url),
    new URL("../../apps/revision/vite.base.ts", import.meta.url),
  ];
  for (const file of files) {
    const source = await readFile(file, "utf8");
    assert.doesNotMatch(source, /from\s+["'][^"']*(?:apps\/(?:mobile|platform)|features\/(?:admin|teacher|parent)|types\/school|services\/mainDataService)[^"']*["']/i, file.pathname);
  }
});

test("le build Révision possède une barrière d'imports inter-applications", async () => {
  const source = await readFile(new URL("../../apps/revision/vite.config.ts", import.meta.url), "utf8");
  for (const boundary of ["/src/features/admin/", "/src/features/teacher/", "/src/features/parent/", "/src/services/mainDataService.", "/src/types/school.", "normalizedMobileRoot", "normalizedPlatformRoot"]) {
    assert.match(source, new RegExp(boundary.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.match(source, /this\.error/);
  assert.match(source, /revision-build-modules\.json/);
  const commonConfig = await readFile(new URL("../../apps/revision/vite.base.ts", import.meta.url), "utf8");
  assert.match(commonConfig, /envDir: configDirectory/);
});

test("les scripts racine ciblent la vraie application @elima/revision", async () => {
  const rootPackage = JSON.parse(await readFile(new URL("../../package.json", import.meta.url), "utf8"));
  const revisionPackage = JSON.parse(await readFile(new URL("../../apps/revision/package.json", import.meta.url), "utf8"));
  assert.equal(revisionPackage.name, "@elima/revision");
  assert.match(rootPackage.scripts["dev:revision"], /--workspace @elima\/revision/);
  assert.match(rootPackage.scripts["build:revision"], /--workspace @elima\/revision/);
  for (const dependency of ["@elima/revision-core", "@elima/revision-ui", "@elima/auth", "@elima/api-client", "@elima/supabase-client", "@elima/shared-domain"]) {
    assert.ok(revisionPackage.dependencies[dependency]);
  }
});

test("les comptes de démonstration Révision sont uniquement des élèves autonomes", () => {
  for (const account of revisionDemoAccounts) {
    const profile = getRevisionDemoProfile(account.email);
    assert.equal(account.role, "STUDENT");
    assert.equal(profile.role, "STUDENT");
    assert.equal(profile.schoolId, null);
    assert.equal(profile.schoolMembershipStatus, "standalone");
  }
});

test("les adaptateurs Révision ne chargent aucune donnée démo School", async () => {
  for (const file of ["features/auth/AuthProvider.tsx", "features/auth/LoginPage.tsx", "services/revisionDataService.ts"]) {
    const source = await readFile(new URL(`../../apps/revision/src/${file}`, import.meta.url), "utf8");
    assert.doesNotMatch(source, /from ["'][^"']*constants\/demoData["']/);
  }
});

test("les packages Révision restent séparés des applications et des espaces School", async () => {
  for (const packageName of ["revision-core", "revision-ui"]) {
    for (const file of await sourceFiles(new URL(`../../packages/${packageName}/src/`, import.meta.url))) {
      const source = await readFile(file, "utf8");
      assert.doesNotMatch(source, /apps\/(?:mobile|platform)|features\/(?:admin|teacher|parent)|types\/school|services\/mainDataService/i, file.pathname);
    }
  }
});
