import { test } from "node:test";
import assert from "node:assert/strict";

import {
  currencyFromSchool,
  firstRelation,
  schoolIdentityFromRow,
} from "../finance/invoice-school";

test("firstRelation unwraps array or object relations", () => {
  assert.equal(firstRelation({ name: "Elima" })?.name, "Elima");
  assert.equal(firstRelation([{ name: "A" }, { name: "B" }])?.name, "A");
  assert.equal(firstRelation(null), undefined);
});

test("schoolIdentityFromRow builds identity with defaults", () => {
  assert.deepEqual(schoolIdentityFromRow(), { name: "Établissement" });
  assert.deepEqual(schoolIdentityFromRow({ name: "GS Dakar", city: "Dakar", country: "Sénégal" }), {
    name: "GS Dakar",
    city: "Dakar",
    country: "Sénégal",
  });
});

test("currencyFromSchool maps XOF to FCFA", () => {
  assert.equal(currencyFromSchool({ currency: "XOF" }), "FCFA");
  assert.equal(currencyFromSchool({ currency: "EUR" }), "EUR");
  assert.equal(currencyFromSchool(), "FCFA");
});
