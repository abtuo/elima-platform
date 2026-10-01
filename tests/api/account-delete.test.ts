import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { createHandler, detectCentralIdentityUsage } from "../../apps/api/server/handlers/account-delete.mjs";
import { createHandler as createDocumentDeleteHandler } from "../../apps/api/server/handlers/revision-document-delete.mjs";

function response() {
  return { headers: new Map<string, string>(), statusCode: 200, body: undefined as unknown,
    setHeader(name: string, value: string) { this.headers.set(name, value); return this; }, getHeader(name: string) { return this.headers.get(name); },
    status(code: number) { this.statusCode = code; return this; }, json(body: unknown) { this.body = body; return this; }, end() { return this; } };
}

const env = {
  ELIMA_IDENTITY_URL: "https://identity.example",
  ELIMA_IDENTITY_PUBLISHABLE_KEY: "identity-public",
  ELIMA_IDENTITY_SECRET_KEY: "identity-secret",
  REVISION_SUPABASE_URL: "https://revision.example",
  REVISION_SUPABASE_PUBLISHABLE_KEY: "revision-public",
  REVISION_SUPABASE_SECRET_KEY: "revision-secret",
};

function fixture(shared: boolean) {
  const deleted = { revision: [] as string[], identity: [] as string[] };
  const linkQuery = { select() { return this; }, eq() { return this; }, async maybeSingle() { return { data: { local_user_id: "local-1", external_subject: "identity-1", external_school_id: null, external_student_id: null }, error: null }; } };
  const clients: Record<string, unknown> = {
    "revision-public": { auth: { async getUser() { return { data: { user: { id: "local-1" } }, error: null }; } } },
    "identity-public": { auth: {
      async getUser() { return { data: { user: { id: "identity-1", email: "+22500000000@phone.elima" } }, error: null }; },
      async signInWithPassword() { return { data: { user: { id: "identity-1" } }, error: null }; },
    } },
    "revision-secret": {
      from() { return linkQuery; },
      storage: { from() { return { async list() { return { data: [], error: null }; }, async remove() { return { error: null }; } }; } },
      auth: { admin: { async deleteUser(id: string) { deleted.revision.push(id); return { error: null }; } } },
    },
    "identity-secret": { auth: { admin: { async deleteUser(id: string) { deleted.identity.push(id); return { error: null }; } } } },
  };
  const handler = createHandler({ env, createClient(_url: string, key: string) { return clients[key]; }, async detectCentralIdentityUsage() { return { shared, reason: shared ? "elima_context" : "revision_only" }; } });
  return { handler, deleted };
}

const validRequest = { method: "POST", headers: { authorization: "Bearer local-token" }, body: { identityAccessToken: "identity-token", password: "password-123", confirmation: "SUPPRIMER" } };

test("la suppression de compte est refusée sans authentification", async () => {
  const { handler, deleted } = fixture(false); const res = response();
  await handler({ method: "POST", headers: {}, body: { password: "password-123", confirmation: "SUPPRIMER" } }, res);
  assert.equal(res.statusCode, 401); assert.deepEqual(deleted, { revision: [], identity: [] });
});

test("un compte Revision-only supprime les données locales puis l'identité centrale", async () => {
  const { handler, deleted } = fixture(false); const res = response();
  await handler(validRequest, res);
  assert.equal(res.statusCode, 200); assert.deepEqual(res.body, { status: "deleted", identityDeleted: true });
  assert.deepEqual(deleted.revision, ["local-1"]); assert.deepEqual(deleted.identity, ["identity-1"]);
});

test("une identité centrale partagée est conservée après suppression Révision", async () => {
  const { handler, deleted } = fixture(true); const res = response();
  await handler(validRequest, res);
  assert.equal(res.statusCode, 200); assert.deepEqual(res.body, { status: "shared_identity", identityDeleted: false });
  assert.deepEqual(deleted.revision, ["local-1"]); assert.deepEqual(deleted.identity, []);
});

test("un rattachement école suffit à classer l'identité comme partagée", async () => {
  const usage = await detectCentralIdentityUsage({}, "identity-1", { external_school_id: "school-1", external_student_id: null });
  assert.deepEqual(usage, { shared: true, reason: "revision_link" });
});

test("la suppression de l'utilisateur technique cascade sur identity_links et les données Révision", async () => {
  const links = await readFile(new URL("../../supabase/migrations/20260715170000_elima_identity_links.sql", import.meta.url), "utf8");
  const schema = await readFile(new URL("../../supabase/migrations/20260715100000_unified_revision_schema.sql", import.meta.url), "utf8");
  const documents = await readFile(new URL("../../supabase/migrations/20260928120000_revision_subject_preferences_and_documents.sql", import.meta.url), "utf8");
  assert.match(links, /local_user_id uuid not null unique references auth\.users\(id\) on delete cascade/i);
  for (const table of ["student_profiles", "user_progress", "quiz_attempts", "user_course_summaries"]) assert.match(schema, new RegExp(`create table if not exists public\\.${table}[\\s\\S]*?references auth\\.users\\(id\\) on delete cascade`, "i"));
  assert.match(documents, /create table if not exists public\.revision_documents[\s\S]*?references auth\.users\(id\) on delete cascade/i);
});

test("la suppression documentaire passe par la RPC propriétaire", async () => {
  let rpcArgs: Record<string, unknown> | undefined;
  const handler = createDocumentDeleteHandler({
    async authorize() { return { user: { id: "00000000-0000-0000-0000-000000000001" }, admin: { async rpc(_name: string, args: Record<string, unknown>) { rpcArgs = args; return { data: true, error: null }; } } }; },
  });
  const res = response();
  await handler({ method: "POST", headers: {}, body: { documentId: "10000000-0000-4000-8000-000000000001" } }, res);
  assert.equal(res.statusCode, 200); assert.equal(rpcArgs?.p_document_id, "10000000-0000-4000-8000-000000000001");
});
