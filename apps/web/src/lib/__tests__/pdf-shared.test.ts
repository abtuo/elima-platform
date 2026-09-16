import { test } from "node:test";
import assert from "node:assert/strict";

import { money, paymentLabel, toPdfText } from "../finance/pdf-shared";

test("toPdfText normalizes unicode punctuation for PDF fonts", () => {
  assert.equal(toPdfText("Élève — l'école « test »"), "Élève - l'école \" test \"");
  assert.equal(toPdfText("1\u00a0000 FCFA"), "1 000 FCFA");
});

test("money formats amounts in French locale", () => {
  assert.match(money(25000, "FCFA"), /25\s?000 FCFA/);
});

test("paymentLabel maps known methods and appends provider", () => {
  assert.equal(paymentLabel("mobile_money"), "Mobile Money");
  assert.equal(paymentLabel("card", "Visa"), "Carte bancaire (Visa)");
  assert.equal(paymentLabel("wave"), "wave");
  assert.equal(paymentLabel("cash", "   "), "Especes");
});
