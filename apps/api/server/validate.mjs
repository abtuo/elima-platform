import assert from "node:assert/strict";
import { API_ENDPOINTS, API_ROUTES, REVISION_API_ENDPOINTS, resolveApiRoute } from "./routes.mjs";
import { handleRevisionCors } from "./revisionCors.mjs";

assert.equal(typeof handleRevisionCors, "function");
assert.equal(API_ENDPOINTS.length, 14);
assert.equal(REVISION_API_ENDPOINTS.length, 12);
assert.equal(API_ROUTES.size, API_ENDPOINTS.length);

for (const endpoint of API_ENDPOINTS) {
  const route = resolveApiRoute(endpoint);
  assert.equal(typeof route?.handler, "function", `${endpoint} doit exposer un handler`);
  assert.ok(route.methods.length > 0, `${endpoint} doit declarer au moins une methode`);
}

const catchAll = await import(new URL("../api/[...route].mjs", import.meta.url));
assert.equal(typeof catchAll.default, "function", "le routeur catch-all doit exporter un handler par defaut");

console.log(`@elima/api: 1 fonction Vercel route ${API_ENDPOINTS.length} endpoints, dont ${REVISION_API_ENDPOINTS.length} endpoints Revision.`);
