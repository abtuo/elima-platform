import { test } from "node:test";
import assert from "node:assert/strict";

import { MARKETING_PLANS } from "../marketing-plans";

test("MARKETING_PLANS exposes three tiers in order", () => {
  assert.deepEqual(
    MARKETING_PLANS.map((p) => p.id),
    ["basic", "premium", "custom"],
  );
});

test("basic plan is highlighted and free", () => {
  const basic = MARKETING_PLANS.find((p) => p.id === "basic");
  assert.ok(basic);
  assert.equal(basic!.pill, "Gratuit");
  assert.equal(basic!.highlight, true);
  assert.equal(basic!.cta, "Essayer maintenant");
  assert.ok(basic!.features.length >= 10);
});

test("premium and custom use demo CTA", () => {
  const premium = MARKETING_PLANS.find((p) => p.id === "premium");
  const custom = MARKETING_PLANS.find((p) => p.id === "custom");
  assert.equal(premium!.cta, "Demander une démo");
  assert.equal(custom!.cta, "Demander une démo");
});

test("premium includes predictive analytics mention", () => {
  const premium = MARKETING_PLANS.find((p) => p.id === "premium")!;
  assert.ok(premium.features.some((f) => f.toLowerCase().includes("prédictive")));
});

test("custom includes IA and flexible offer line", () => {
  const custom = MARKETING_PLANS.find((p) => p.id === "custom")!;
  assert.ok(custom.features.some((f) => f.includes("IA")));
  assert.ok(custom.features.some((f) => f.toLowerCase().includes("plus encore")));
  assert.ok(custom.features[0].startsWith("Tout Premium"));
});
