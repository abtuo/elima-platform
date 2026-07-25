import { test } from "node:test";
import assert from "node:assert/strict";

import {
  PlanFeatureError,
  assertPlanFeature,
  planFeatureErrorResponse,
  type SchoolPlanContext,
} from "../plans-server";

function ctx(plan: SchoolPlanContext["plan"], isDemo = false): SchoolPlanContext {
  const effectivePlan = isDemo ? "custom" : plan;
  return { schoolId: "school-1", plan, isDemo, effectivePlan };
}

test("assertPlanFeature: SUPER_ADMIN bypasses gating", () => {
  assert.doesNotThrow(() => assertPlanFeature(ctx("basic"), "finance", "SUPER_ADMIN"));
});

test("assertPlanFeature: basic school cannot access finance", () => {
  assert.throws(() => assertPlanFeature(ctx("basic"), "finance"), PlanFeatureError);
});

test("assertPlanFeature: premium school can access finance", () => {
  assert.doesNotThrow(() => assertPlanFeature(ctx("premium"), "finance"));
});

test("assertPlanFeature: demo basic school gets custom effective plan", () => {
  assert.doesNotThrow(() => assertPlanFeature(ctx("basic", true), "ai_import"));
});

test("PlanFeatureError exposes required plan label", () => {
  const err = new PlanFeatureError("kpis");
  assert.equal(err.status, 403);
  assert.equal(err.requiredLabel, "Premium");
  assert.match(err.message, /Premium/);
});

test("planFeatureErrorResponse maps PlanFeatureError to 403 JSON", () => {
  const res = planFeatureErrorResponse(new PlanFeatureError("store"));
  assert.ok(res);
  assert.equal(res!.status, 403);
});

test("planFeatureErrorResponse maps missing school to 404", () => {
  const res = planFeatureErrorResponse(new Error("École introuvable"));
  assert.ok(res);
  assert.equal(res!.status, 404);
});

test("planFeatureErrorResponse returns null for unknown errors", () => {
  assert.equal(planFeatureErrorResponse(new Error("boom")), null);
});
