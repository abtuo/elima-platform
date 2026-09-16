import { test } from "node:test";
import assert from "node:assert/strict";

import { AuthVerificationError, normalizeAuthIdentifier, normalizeVerificationPhone } from "../auth-verification";

test("normalise les emails et les numeros E.164", () => {
  assert.equal(normalizeAuthIdentifier("  TEST@ELIMA.CI "), "test@elima.ci");
  assert.equal(normalizeAuthIdentifier("+33 6 56 80 21 88"), "+33656802188");
  assert.equal(normalizeVerificationPhone("00 225 01 02 03 04 05"), "+2250102030405");
});

test("refuse un numero WhatsApp qui n'est pas au format international", () => {
  assert.throws(
    () => normalizeVerificationPhone("0656802188"),
    (error: unknown) => error instanceof AuthVerificationError && error.status === 400,
  );
});
