import assert from "node:assert/strict";
import test from "node:test";
import { consumeRevisionAiQuota, RevisionApiError } from "../../apps/api/server/revisionAiQuota.mjs";

test("le quota IA transmet la politique et autorise la requête", async () => {
  let args: Record<string, unknown> | undefined;
  const admin = { async rpc(_name: string, input: Record<string, unknown>) { args = input; return { data: { allowed: true }, error: null }; } };
  await consumeRevisionAiQuota(admin, "00000000-0000-0000-0000-000000000001", { action: "revision_generate", windowSeconds: 900, windowLimit: 12, dailyLimit: 60 });
  assert.equal(args?.p_short_limit, 12); assert.equal(args?.p_daily_limit, 60);
});

test("le quota IA renvoie 429 et Retry-After lorsqu'il est dépassé", async () => {
  const admin = { async rpc() { return { data: { allowed: false, retry_after: 42 }, error: null }; } };
  await assert.rejects(consumeRevisionAiQuota(admin, "00000000-0000-0000-0000-000000000001", { action: "revision_document_analyze", windowSeconds: 3600, windowLimit: 5, dailyLimit: 15 }), (error: unknown) => error instanceof RevisionApiError && error.statusCode === 429 && error.retryAfter === 42);
});
