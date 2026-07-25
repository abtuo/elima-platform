import { test } from "node:test";
import assert from "node:assert/strict";

import { resolveAppMode } from "../app-mode";
import { DEMO_REFERENCE_DATE, getAppNow, getRelativeDemoDate, relativeDemoDateLabel } from "../app-date";

test("resolveAppMode defaults to demo in development", () => {
  assert.equal(resolveAppMode({ NODE_ENV: "development" }), "demo");
});

test("resolveAppMode defaults to saas in production", () => {
  assert.equal(resolveAppMode({ NODE_ENV: "production" }), "saas");
});

test("ELIMA_APP_MODE=saas forces SaaS in development", () => {
  assert.equal(resolveAppMode({ NODE_ENV: "development", ELIMA_APP_MODE: "saas" }), "saas");
});

test("ELIMA_APP_MODE=demo forces demo", () => {
  assert.equal(resolveAppMode({ NODE_ENV: "production", ELIMA_APP_MODE: "demo" }), "demo");
});

test("invalid mode falls back safely", () => {
  assert.equal(resolveAppMode({ NODE_ENV: "production", ELIMA_APP_MODE: "banana" }), "saas");
});

test("getAppNow returns demo reference date in demo mode", () => {
  assert.equal(getAppNow({ ELIMA_APP_MODE: "demo" }).toISOString().slice(0, 10), DEMO_REFERENCE_DATE);
});

test("getAppNow returns real date in SaaS mode", () => {
  const before = Date.now();
  const value = getAppNow({ ELIMA_APP_MODE: "saas" }).getTime();
  const after = Date.now();
  assert.ok(value >= before);
  assert.ok(value <= after);
});

test("demo relative dates and labels are stable", () => {
  assert.equal(getRelativeDemoDate(-3).toISOString().slice(0, 10), "2026-06-22");
  assert.equal(relativeDemoDateLabel(0), "aujourd'hui");
  assert.equal(relativeDemoDateLabel(2), "dans 2 jours");
});
