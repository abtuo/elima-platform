import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { getRevisionDemoProfile, revisionDemoAccounts } from "../../apps/mobile/src/apps/revision/revisionDemoAuth.ts";

const routerUrl = new URL("../../apps/mobile/src/apps/revision/router.tsx", import.meta.url);

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
  ]) {
    assert.match(source, new RegExp(route.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("le routeur autonome ne référence aucun espace School", async () => {
  const source = await readFile(routerUrl, "utf8");
  assert.doesNotMatch(source, /(?:path|to)=["'`]\/(?:admin|teacher|parent)(?:\/|["'`])/);
  assert.doesNotMatch(source, /features\/(?:admin|teacher|parent|scanner|offline|supplies|messages)/);
  assert.doesNotMatch(source, /StudentHomePage|StudentTimetablePage|mainDataService|types\/school/);
});

test("le build Révision possède une barrière d'imports School", async () => {
  const source = await readFile(new URL("../../apps/mobile/vite.revision.config.ts", import.meta.url), "utf8");
  for (const boundary of ["/src/features/admin/", "/src/features/teacher/", "/src/features/parent/", "/src/services/mainDataService.", "/src/types/school."]) {
    assert.match(source, new RegExp(boundary.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.match(source, /this\.error/);
  assert.match(source, /revision-build-modules\.json/);
  const commonConfig = await readFile(new URL("../../apps/mobile/vite.config.ts", import.meta.url), "utf8");
  assert.match(commonConfig, /envDir: configDirectory/);
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

test("les modules partagés utilisés par Révision ne chargent plus les données démo School", async () => {
  for (const file of ["src/features/auth/AuthProvider.tsx", "src/features/auth/LoginPage.tsx", "src/services/revisionDataService.ts"]) {
    const source = await readFile(new URL(`../../apps/mobile/${file}`, import.meta.url), "utf8");
    assert.doesNotMatch(source, /from ["'][^"']*constants\/demoData["']/);
  }
});
