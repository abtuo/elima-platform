import assert from "node:assert/strict";
import test from "node:test";
import { NextRequest } from "next/server";
import { middleware } from "../../middleware";

test("la demande de vérification signup reste publique", async () => {
  const response = await middleware(new NextRequest("https://www.elima.ci/api/auth/verification/request", { method: "POST" }));

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("x-middleware-next"), "1");
});

test("les autres routes API protégées exigent toujours une session", async () => {
  const response = await middleware(new NextRequest("https://www.elima.ci/api/elima-profile"));

  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { message: "Unauthorized" });
});
