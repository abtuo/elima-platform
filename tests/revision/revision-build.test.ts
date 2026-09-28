import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";
import { getRevisionDemoProfile, revisionDemoAccounts } from "../../apps/revision/src/revisionDemoAuth.ts";
import { buildHomeActivities, isNewRevisionAccount, selectContinueActivity } from "../../apps/revision/src/features/home/homeModel.ts";

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
    "/student",
    "/student/reviser",
    "/student/reviser/parcours/session/:id",
    "/student/reviser/parcours/resultats/:contentType/:id",
    "/student/reviser/quiz",
    "/student/reviser/fiches",
    "/student/reviser/fiches/:id",
    "/student/profil",
  ]) assert.match(source, new RegExp(route.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(source, /path="\/student" element={<StudentHomePage \/>}/);
});

test("login et inscription arrivent sur l’accueil élève", async () => {
  const login = await readFile(new URL("../../apps/revision/src/features/auth/LoginPage.tsx", import.meta.url), "utf8");
  const registration = await readFile(new URL("../../apps/revision/src/features/auth/RegistrationPage.tsx", import.meta.url), "utf8");
  const router = await readFile(routerUrl, "utf8");
  assert.match(login, /mode === "revision" \? "\/student"/);
  assert.match(registration, /navigate\("\/student", \{ replace: true \}\)/);
  assert.match(router, /profile\.role === "STUDENT" \? "\/student"/);
  assert.doesNotMatch(login, /mode === "revision" \? "\/student\/reviser"/);
});

test("la navigation Révision expose Accueil, Réviser et Profil sur desktop et mobile", async () => {
  const shell = await readFile(new URL("../../apps/revision/src/RevisionShell.tsx", import.meta.url), "utf8");
  for (const item of [
    '{ href: "/student", label: "Accueil"',
    '{ href: "/student/reviser", label: "Réviser"',
    '{ href: "/student/profil", label: "Profil"',
  ]) assert.match(shell, new RegExp(item.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(shell, /pathname === href/);
  assert.match(shell, /lg:hidden/);
  assert.match(shell, /hidden w-64[\s\S]*lg:flex/);
  assert.match(shell, /profile\.className \|\| profile\.schoolLevelId/);
});

test("l’accueil élève utilise les données Révision réelles et couvre les états essentiels", async () => {
  const home = await readFile(new URL("../../apps/revision/src/features/home/StudentHomePage.tsx", import.meta.url), "utf8");
  for (const service of ["getRevisionProgress", "getQuizAttempts", "getLearningAttempts", "getCourseSheets", "getAvailableQuizzes"]) {
    assert.match(home, new RegExp(`${service}\\(profile\\.id\\)|${service}\\(\\)`));
  }
  for (const copy of ["Progression cette semaine", "Continuer ma révision", "Commence ta première révision", "Mes matières", "Pour toi", "Activité récente", "Réessayer"]) {
    assert.match(home, new RegExp(copy));
  }
  assert.match(home, /navigate\("\/student\/reviser"\)/);
  assert.match(home, /grid-cols-2[\s\S]*lg:grid-cols-4/);
  assert.doesNotMatch(home, /65\s*%|40\s*%|25\s*%/);
  assert.doesNotMatch(home, /revisionDemoData|demoRevision/);
});

test("l’accueil ordonne l’historique et reprend en priorité un parcours commencé", () => {
  const attempts = [{ id: "quiz-1", quizRef: "quiz-set-1", subject: "Mathématiques", topic: "Fractions", score: 45, completedAt: "2026-09-25T10:00:00Z" }];
  const learningAttempts = [{ id: "attempt-1", contentType: "guided_exercise" as const, contentId: "exercise-1", title: "Équations", subject: "Mathématiques", chapter: "Calcul littéral", status: "in_progress" as const, startedAt: "2026-09-27T10:00:00Z", elapsedSeconds: 300 }];
  const sheets = [{ id: "sheet-1", title: "Les fonctions", subject: "Mathématiques", topic: "Fonctions", content: "", createdAt: "2026-09-26" }];
  const activities = buildHomeActivities(attempts, learningAttempts, sheets);
  assert.deepEqual(activities.map((activity) => activity.kind), ["learning", "sheet", "quiz"]);
  assert.deepEqual(selectContinueActivity(attempts, learningAttempts, sheets), {
    subject: "Mathématiques",
    title: "Équations",
    detail: "Calcul littéral",
    href: "/student/reviser/parcours/session/exercise-1",
  });
});

test("un nouveau compte obtient l’état de démarrage sans historique", () => {
  const progress = { xp: 0, level: 1, streakDays: 0, completedQuizCount: 0, averageScore: 0 };
  assert.equal(isNewRevisionAccount(progress, [], [], []), true);
  assert.equal(selectContinueActivity([], [], []), null);
  assert.deepEqual(buildHomeActivities([], [], []), []);
});

test("la page Réviser conserve ses QCM, fiches et historique et affiche Scanner", async () => {
  const page = await readFile(new URL("../../apps/revision/src/features/revision/RevisionDashboardPage.tsx", import.meta.url), "utf8");
  for (const feature of ["Quiz du jour", "Historique des QCM", "QCM populaires", "Mes fiches", "DocumentScannerPanel", 'label: "Scanner"']) {
    assert.match(page, new RegExp(feature));
  }
  assert.doesNotMatch(page, /id: "parcours", label: "Parcours"/);
});

test("l’onboarding exige et sauvegarde au moins une matière canonique", async () => {
  const registration = await readFile(new URL("../../apps/revision/src/features/auth/RegistrationPage.tsx", import.meta.url), "utf8");
  assert.match(registration, /revisionSubjectsForLevel\(form\.schoolLevel\)\.map/);
  assert.match(registration, /Dans quelles matières souhaites-tu progresser/);
  assert.match(registration, /if \(!subjectIds\.length\).*Choisis au moins une matière/);
  assert.match(registration, /await saveSubjectPreferences\(subjectIds\)/);
});

test("le profil permet de modifier les matières sans toucher aux historiques", async () => {
  const profile = await readFile(new URL("../../apps/revision/src/RevisionStudentProfilePage.tsx", import.meta.url), "utf8");
  const service = await readFile(new URL("../../apps/revision/src/services/subjectPreferencesService.ts", import.meta.url), "utf8");
  assert.match(profile, /Modifier mes matières/);
  assert.match(profile, /saveSubjectPreferences\(subjectIds\)/);
  assert.match(service, /student_revision_subject_preferences/);
  assert.doesNotMatch(service, /quiz_attempts|learning_attempts|user_course_summaries/);
});

test("Scanner gère caméra, formats, états, historique et quiz documentaire", async () => {
  const scanner = await readFile(new URL("../../apps/revision/src/features/revision/DocumentScannerPanel.tsx", import.meta.url), "utf8");
  const service = await readFile(new URL("../../apps/revision/src/services/revisionDocumentService.ts", import.meta.url), "utf8");
  for (const value of ["capture=\"environment\"", "application/pdf,image/jpeg,image/png", "Upload du document", "Analyse du document", "Mes documents", "Créer un quiz sur ce document", 'source: "document"']) assert.match(scanner, new RegExp(value));
  assert.match(scanner, /profile\.className \|\| profile\.schoolLevelId/);
  assert.match(service, /\/api\/revision-document-analyze/);
  assert.doesNotMatch(service, /localStorage/);
});

test("les matières préférées filtrent Réviser et priorisent l’accueil", async () => {
  const dashboard = await readFile(new URL("../../apps/revision/src/features/revision/RevisionDashboardPage.tsx", import.meta.url), "utf8");
  const home = await readFile(new URL("../../apps/revision/src/features/home/StudentHomePage.tsx", import.meta.url), "utf8");
  assert.match(dashboard, /preferredSubjects\.includes\(subjectIdFromLabel/);
  assert.match(home, /preferredSubjects\.includes\(subjectIdFromLabel/);
  assert.match(home, /Scanner un document/);
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
  for (const boundary of ["/src/features/admin/", "/src/features/teacher/", "/src/features/parent/", "/src/services/mainDataService.", "/src/types/school.", "normalizedMobileRoot", "normalizedPlatformRoot", "normalizedApiRoot"]) {
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

test("l’inscription Révision utilise uniquement le numéro WhatsApp", async () => {
  const source = await readFile(new URL("../../apps/revision/src/features/auth/RegistrationPage.tsx", import.meta.url), "utf8");
  assert.match(source, /name="phone" autoComplete="tel"/);
  assert.match(source, /Format international, ex\. \+225 05 00 00 00 00/);
  assert.match(source, /Vérifier mon numéro/);
  assert.match(source, /name="declaredSchoolName" autoComplete="organization"/);
  assert.doesNotMatch(source, /Email ou téléphone|Ton compte Révision fonctionne|Recevoir mon code/);
  const clientSources = (await Promise.all([
    "features/auth/RegistrationPage.tsx",
    "features/auth/ForgotPasswordPage.tsx",
    "services/registrationService.ts",
  ].map((file) => readFile(new URL(`../../apps/revision/src/${file}`, import.meta.url), "utf8")))).join("\n");
  assert.doesNotMatch(clientSources, /TWILIO_API_SECRET|TWILIO_API_KEY|ELIMA_IDENTITY_SECRET_KEY/);
});

test("login, signup et reset Révision utilisent Identity puis la session technique du bridge", async () => {
  const loginPage = await readFile(new URL("../../apps/revision/src/features/auth/LoginPage.tsx", import.meta.url), "utf8");
  const authProvider = await readFile(new URL("../../apps/revision/src/features/auth/AuthProvider.tsx", import.meta.url), "utf8");
  const identityService = await readFile(new URL("../../apps/revision/src/services/elimaIdentityService.ts", import.meta.url), "utf8");
  const registrationPage = await readFile(new URL("../../apps/revision/src/features/auth/RegistrationPage.tsx", import.meta.url), "utf8");
  const registrationService = await readFile(new URL("../../apps/revision/src/services/registrationService.ts", import.meta.url), "utf8");

  assert.doesNotMatch(loginPage, /isElimaIdentityConfigured/);
  assert.match(authProvider, /signInWithElimaPassword\(identifier, password\)/);
  assert.match(identityService, /apiFetch\("\/api\/elima-password-login"/);
  assert.match(identityService, /apiFetch\("\/api\/identity-bridge"/);
  assert.match(identityService, /mainDbClient\.auth\.verifyOtp/);
  assert.match(registrationPage, /completeElimaIdentitySession\(registration\.session\)/);
  assert.match(registrationService, /request\("\/api\/elima-signup"/);
  assert.match(registrationService, /request\("\/api\/auth-password-reset"/);

  for (const file of await sourceFiles(new URL("../../apps/revision/src/", import.meta.url))) {
    const source = await readFile(file, "utf8");
    assert.doesNotMatch(source, /mainDbClient\.auth\.signInWithPassword/, file.pathname);
  }
});

test("l’authentification Mobile conserve son routage existant", async () => {
  const loginPage = await readFile(new URL("../../apps/mobile/src/features/auth/LoginPage.tsx", import.meta.url), "utf8");
  const authService = await readFile(new URL("../../apps/mobile/src/services/authService.ts", import.meta.url), "utf8");
  assert.match(loginPage, /isElimaIdentityConfigured/);
  assert.match(authService, /mainDbClient\.auth\.signInWithPassword/);
});

test("les packages Révision restent séparés des applications et des espaces School", async () => {
  for (const packageName of ["revision-core", "revision-ui"]) {
    for (const file of await sourceFiles(new URL(`../../packages/${packageName}/src/`, import.meta.url))) {
      const source = await readFile(file, "utf8");
      assert.doesNotMatch(source, /apps\/(?:mobile|platform)|features\/(?:admin|teacher|parent)|types\/school|services\/mainDataService/i, file.pathname);
    }
  }
});
