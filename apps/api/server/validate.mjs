import assert from "node:assert/strict";
import { API_ENDPOINTS, REVISION_API_ENDPOINTS } from "./routes.mjs";
import { handleRevisionCors } from "./revisionCors.mjs";

assert.equal(typeof handleRevisionCors, "function");
assert.equal(API_ENDPOINTS.length, 14);
assert.equal(REVISION_API_ENDPOINTS.length, 12);

for (const endpoint of API_ENDPOINTS) {
  const module = await import(new URL(`../api/${endpoint}.mjs`, import.meta.url));
  assert.equal(typeof module.default, "function", `${endpoint} doit exporter un handler par défaut`);
}

console.log(`@elima/api: ${API_ENDPOINTS.length} handlers valides, dont ${REVISION_API_ENDPOINTS.length} endpoints Révision.`);
