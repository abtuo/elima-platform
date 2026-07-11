import { test } from "node:test";
import assert from "node:assert/strict";

import { MARKETING_PLANS, PRICING_FLEXIBILITY_NOTE } from "../marketing-plans";

test("MARKETING_PLANS exposes three tiers in order", () => {
  assert.deepEqual(
    MARKETING_PLANS.map((p) => p.id),
    ["basic", "premium", "custom"],
  );
});

test("basic plan shows annual starting price and 24h support only there", () => {
  const basic = MARKETING_PLANS.find((p) => p.id === "basic");
  assert.ok(basic);
  assert.equal(basic!.price, "À partir de 100 000 FCFA/an");
  assert.equal(basic!.highlight, undefined);
  assert.equal(basic!.cta, "Commencer l'essai gratuit");
  assert.ok(basic!.features.some((f) => f.includes("24h/24")));
  assert.ok(basic!.features.length >= 10);
});

test("premium is highlighted with starting price and priority support only", () => {
  const premium = MARKETING_PLANS.find((p) => p.id === "premium");
  assert.ok(premium);
  assert.equal(premium!.price, "À partir de 300 000 FCFA/an");
  assert.equal(premium!.highlight, true);
  assert.equal(premium!.cta, "Commencer l'essai gratuit");
  assert.ok(premium!.features.some((f) => f.toLowerCase().includes("prioritaire")));
  assert.ok(!premium!.features.some((f) => f.includes("24h/24")));
});

test("custom has no public price and uses devis CTA", () => {
  const custom = MARKETING_PLANS.find((p) => p.id === "custom");
  assert.ok(custom);
  assert.equal(custom!.price, undefined);
  assert.equal(custom!.cta, "Demander un devis");
  assert.equal(custom!.ctaHref, "/contact");
  assert.ok(!custom!.features.some((f) => f.includes("24h/24")));
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

test("pricing flexibility note is exposed for marketing pages", () => {
  assert.ok(PRICING_FLEXIBILITY_NOTE.toLowerCase().includes("formule"));
});
