import { test } from "node:test";
import assert from "node:assert/strict";

import {
  hasFeature,
  isNavItemLocked,
  normalizePlan,
  requiredPlan,
  requiredPlanLabel,
  resolveEffectivePlan,
} from "../plans";

test("normalizePlan: unknown values fall back to basic", () => {
  assert.equal(normalizePlan(null), "basic");
  assert.equal(normalizePlan(undefined), "basic");
  assert.equal(normalizePlan(""), "basic");
  assert.equal(normalizePlan("enterprise"), "basic");
});

test("normalizePlan: accepts premium and custom", () => {
  assert.equal(normalizePlan("premium"), "premium");
  assert.equal(normalizePlan("custom"), "custom");
});

test("resolveEffectivePlan: demo schools get custom access", () => {
  assert.equal(resolveEffectivePlan("basic", true), "custom");
  assert.equal(resolveEffectivePlan("premium", true), "custom");
  assert.equal(resolveEffectivePlan("basic", false), "basic");
});

test("hasFeature: basic plan includes core modules only", () => {
  assert.equal(hasFeature("basic", "messaging"), true);
  assert.equal(hasFeature("basic", "cockpit"), true);
  assert.equal(hasFeature("basic", "finance"), false);
  assert.equal(hasFeature("basic", "kpis"), false);
  assert.equal(hasFeature("basic", "ai_import"), false);
});

test("hasFeature: premium unlocks finance and store", () => {
  assert.equal(hasFeature("premium", "finance"), true);
  assert.equal(hasFeature("premium", "store"), true);
  assert.equal(hasFeature("premium", "parent_payments"), true);
  assert.equal(hasFeature("premium", "ai_import"), false);
});

test("hasFeature: custom unlocks AI features", () => {
  assert.equal(hasFeature("custom", "ai_import"), true);
  assert.equal(hasFeature("custom", "ocr"), true);
  assert.equal(hasFeature("custom", "admin_assistant"), true);
});

test("requiredPlanLabel maps features to marketing names", () => {
  assert.equal(requiredPlan("finance"), "premium");
  assert.equal(requiredPlanLabel("finance"), "Premium");
  assert.equal(requiredPlanLabel("ai_import"), "Sur mesure");
});

test("isNavItemLocked: basic locks premium dashboard routes", () => {
  assert.equal(isNavItemLocked("basic", "/dashboard/finance"), true);
  assert.equal(isNavItemLocked("basic", "/dashboard/kpis"), true);
  assert.equal(isNavItemLocked("basic", "/dashboard/students"), false);
});

test("isNavItemLocked: premium unlocks gated routes", () => {
  assert.equal(isNavItemLocked("premium", "/dashboard/finance"), false);
  assert.equal(isNavItemLocked("premium", "/parent/pay"), false);
});
