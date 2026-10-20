import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../../apps/store/src/", import.meta.url);
const sensitiveRoutes = [
  "app/api/admin/products/route.ts",
  "app/api/admin/products/[id]/series/route.ts",
  "app/api/admin/categories/route.ts",
  "app/api/admin/kits/route.ts",
  "app/api/admin/stocks/adjust/route.ts",
  "app/api/admin/promotions/[id]/route.ts",
  "app/api/admin/imports/catalog/preview/route.ts",
  "app/api/admin/imports/catalog/confirm/route.ts",
];

test("toutes les écritures du back-office exigent explicitement un rôle Store", async () => {
  for (const path of sensitiveRoutes) {
    const source = await readFile(new URL(path, root), "utf8");
    assert.match(source, /requireStoreApi\((catalogRoles|inventoryRoles)\)/, path);
    assert.doesNotMatch(source, /service_role|SUPABASE_SERVICE/i, path);
  }
});

test("la garde d'administration vérifie Auth puis store_staff", async () => {
  const source = await readFile(new URL("lib/admin-auth.ts", root), "utf8");
  assert.match(source, /auth\.getUser\(\)/);
  assert.match(source, /from\("store_staff"\)/);
  assert.doesNotMatch(source, /SCHOOL_ADMIN|school_admin/);
  assert.match(source, /isIdentityConfigured\(\)/);
  assert.match(source, /status: 503/);
});

test("les stocks passent par la RPC atomique et non par un écrasement", async () => {
  const source = await readFile(new URL("app/api/admin/stocks/adjust/route.ts", root), "utf8");
  assert.match(source, /rpc\("adjust_store_inventory"/);
  assert.doesNotMatch(source, /quantity_available/);
});

test("l’import exige une stratégie explicite et journalise les mises à jour de stock", async () => {
  const confirm = await readFile(new URL("app/api/admin/imports/catalog/confirm/route.ts", root), "utf8");
  const apply = await readFile(new URL("lib/catalog-import-apply.ts", root), "utf8");
  const template = await readFile(new URL("app/api/admin/imports/catalog/template/route.ts", root), "utf8");
  assert.match(confirm, /strategy !== "skip" && strategy !== "update"/);
  assert.match(confirm, /store_catalog_imports/); assert.match(confirm, /store_catalog_import_rows/);
  assert.match(apply, /rpc\("adjust_store_inventory"/); assert.doesNotMatch(apply, /update\(\{[^}]*quantity_available/);
  assert.match(template, /requireStoreApi\(catalogRoles\)/);
});

test("les commandes, transitions, zones et encaissements restent derrière les rôles Store dédiés", async () => {
  for (const path of [
    "app/api/admin/orders/[id]/transition/route.ts",
    "app/api/admin/orders/[id]/payment/route.ts",
    "app/api/admin/delivery-zones/route.ts",
    "app/api/admin/delivery-zones/[id]/route.ts",
  ]) {
    const source = await readFile(new URL(path, root), "utf8");
    assert.match(source, /requireStoreApi\(orderRoles\)/, path);
    assert.doesNotMatch(source, /service_role|SUPABASE_SERVICE/i, path);
  }
  const checkout = await readFile(new URL("app/api/checkout/confirm/route.ts", root), "utf8");
  assert.match(checkout, /requireCustomerApi\(\)/);
  assert.match(checkout, /rpc\("create_store_order"/);
  assert.doesNotMatch(checkout, /unitPrice|total_amount|service_role/i);
});

test("le compte n'affiche l'administration qu'avec un role Store actif", async () => {
  const api = await readFile(new URL("app/api/account/me/route.ts", root), "utf8");
  const page = await readFile(new URL("app/compte/page.tsx", root), "utf8");
  assert.match(api, /from\("store_staff"\)/);
  assert.match(api, /staff\?\.status === "active"/);
  assert.match(page, /user\.storeRole&&<AccountLink href="\/admin"/);
});

test("l'attribution store_admin exige le compte exact et une preuve Twilio recente", async () => {
  const template = await readFile(new URL("../../database/core/admin/store-admin-template.sql", import.meta.url), "utf8");
  assert.match(template, /721e715a-a520-4d9f-bd7a-2fda083fc5e1/);
  assert.match(template, /purpose = 'phone_control'/);
  assert.match(template, /consumed_at >= now\(\) - interval '30 minutes'/);
  assert.match(template, /rollback;/i);
});

test("le login Store reutilise la preuve Elima et ne cree pas de compte telephone natif", async () => {
  const send = await readFile(new URL("app/api/auth/phone/send/route.ts", root), "utf8");
  const verify = await readFile(new URL("app/api/auth/phone/verify/route.ts", root), "utf8");
  assert.match(send, /auth-verification-request/);
  assert.match(verify, /auth-verification-check/);
  assert.match(verify, /elima-phone-login/);
  assert.match(verify, /auth\.setSession/);
  assert.doesNotMatch(`${send}\n${verify}`, /signInWithOtp|shouldCreateUser/);
});
