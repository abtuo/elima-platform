import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

test("les pages légales sont publiques et couvrent les traitements Révision", async () => {
  const router = await readFile(new URL("../../apps/revision/src/router.tsx", import.meta.url), "utf8");
  const legal = await readFile(new URL("../../apps/revision/src/features/legal/LegalPage.tsx", import.meta.url), "utf8");
  for (const route of ["/legal/terms", "/legal/privacy", "/legal/account-deletion"]) assert.match(router, new RegExp(route));
  assert.match(router, /!location\.pathname\.startsWith\("\/legal\/"\)/);
  for (const value of ["numéro WhatsApp", "Supabase", "Twilio Verify", "Azure Document Intelligence", "Azure OpenAI", "texte OCR", "identité centrale"]) assert.match(legal, new RegExp(value, "i"));
  assert.match(legal, /Elima Tech/); assert.match(legal, /Paris.*108 566 720/); assert.doesNotMatch(legal, /président/i);
});

test("inscription, connexion, accueil et profil exposent les liens légaux", async () => {
  for (const file of ["RevisionWelcomePage.tsx", "features/auth/LoginPage.tsx", "features/auth/RegistrationPage.tsx"]) {
    const source = await readFile(new URL(`../../apps/revision/src/${file}`, import.meta.url), "utf8");
    assert.match(source, /LegalLinks/);
  }
  const profile = await readFile(new URL("../../apps/revision/src/RevisionStudentProfilePage.tsx", import.meta.url), "utf8");
  assert.match(profile, /Supprimer mon compte/); assert.match(profile, /SUPPRIMER/); assert.match(profile, /deleteCurrentAccount/);
});

test("le frontend confirme côté serveur, se déconnecte et ne contient aucune clé serveur", async () => {
  const service = await readFile(new URL("../../apps/revision/src/services/accountDeletionService.ts", import.meta.url), "utf8");
  const profile = await readFile(new URL("../../apps/revision/src/RevisionStudentProfilePage.tsx", import.meta.url), "utf8");
  assert.match(service, /apiFetch\("\/api\/account-delete"/); assert.match(profile, /await signOut\(\)/); assert.match(profile, /navigate\("\/"/);
  const sources = `${service}\n${profile}`;
  assert.doesNotMatch(sources, /SERVICE_ROLE|SECRET_KEY|TWILIO_API_SECRET|AZURE_OPENAI_API_KEY/);
});

test("Mes documents permet la suppression et retire la fiche associée par migration", async () => {
  const panel = await readFile(new URL("../../apps/revision/src/features/revision/DocumentScannerPanel.tsx", import.meta.url), "utf8");
  const service = await readFile(new URL("../../apps/revision/src/services/revisionDocumentService.ts", import.meta.url), "utf8");
  const migration = await readFile(new URL("../../supabase/migrations/20260930090000_revision_document_deletion.sql", import.meta.url), "utf8");
  assert.match(panel, /Supprimer ce document/); assert.match(service, /\/api\/revision-document-delete/);
  assert.match(migration, /delete from public\.revision_documents/i); assert.match(migration, /delete from public\.user_course_summaries/i); assert.match(migration, /source_document_id = null/i);
});
