import assert from "node:assert/strict";
import test from "node:test";
import { products } from "../catalog.ts";
import { formatMoney } from "../domain.ts";
import { formatPhoneNational, normalizeCountryPhone, normalizeIvorianPhone, normalizeStoreLoginPhone } from "../phone.ts";
import { addCartItem, parseStoredCart, updateCartQuantity } from "../cart.ts";
import { parseCatalogQuery, toWebSearchQuery } from "../catalog-query.ts";
import { validateProductInput } from "../admin-product-input.ts";
import { validateKitInput } from "../admin-kit-input.ts";

test("catalog slugs and ids are unique", () => {
  assert.equal(new Set(products.map((p) => p.slug)).size, products.length);
  assert.equal(new Set(products.map((p) => p.id)).size, products.length);
});

test("money uses integer FCFA amounts", () => {
  assert.ok(products.every((p) => Number.isInteger(p.price.amount) && p.price.currency === "XOF"));
  assert.match(formatMoney({ amount: 3500, currency: "XOF" }), /3[\s\u00a0]?500/);
});

test("Ivorian phone normalization is strict", () => {
  assert.equal(normalizeIvorianPhone("07 08 09 10 11"), "+2250708091011");
  assert.equal(normalizeIvorianPhone("+225 01 23 45 67 89"), "+2250123456789");
  assert.equal(normalizeIvorianPhone("123"), null);
});

test("Store login accepts E.164 numbers while keeping local Ivorian input", () => {
  assert.equal(normalizeStoreLoginPhone("+33 6 56 80 21 88"), "+33656802188");
  assert.equal(normalizeStoreLoginPhone("0033 6 56 80 21 88"), "+33656802188");
  assert.equal(normalizeStoreLoginPhone("07 08 09 10 11"), "+2250708091011");
  assert.equal(normalizeStoreLoginPhone("+012345678"), null);
  assert.equal(normalizeStoreLoginPhone("33656802188"), null);
});

test("phone field normalizes Côte d’Ivoire and France", () => {
  assert.equal(normalizeCountryPhone("CI", "07 08 09 10 11"), "+2250708091011");
  assert.equal(normalizeCountryPhone("FR", "06 56 80 21 88"), "+33656802188");
  assert.equal(normalizeCountryPhone("FR", "00 00"), null);
  assert.equal(formatPhoneNational("FR", "+33656802188"), "6 56 80 21 88");
});

test("cart adds, merges, caps and removes items", () => {
  const item = { productId: "p1", variantId: "v1", name: "Cahier", variantName: "96 pages", slug: "cahier", unitPrice: { amount: 500, currency: "XOF" as const }, availability: "in_stock" as const, isDemo: false };
  const initial = addCartItem([], item, 2);
  assert.equal(addCartItem(initial, item, 3)[0]?.quantity, 5);
  assert.equal(addCartItem(initial, item, 200)[0]?.quantity, 99);
  assert.deepEqual(updateCartQuantity(initial, "p1", "v1", 0), []);
});

test("stored cart ignores corrupt and legacy Phase 1 rows", () => {
  assert.deepEqual(parseStoredCart("not-json"), []);
  assert.deepEqual(parseStoredCart(JSON.stringify([{ productId: "old", quantity: 1 }])), []);
  const item = { productId: "p1", variantId: "v1", quantity: 140, name: "Cahier", variantName: "96 pages", slug: "cahier", unitPrice: { amount: 500, currency: "XOF" }, availability: "in_stock", isDemo: false };
  assert.equal(parseStoredCart(JSON.stringify([item]))[0]?.quantity, 99);
});

test("catalog query bounds pagination, prices and search", () => {
  assert.deepEqual(parseCatalogQuery({ page: "0", parPage: "1000", prixMin: "500", prixMax: "100", niveau: "primaire" }), { search: undefined, category: undefined, level: "primaire", minPrice: 500, maxPrice: undefined, promotions: false, sort: "popularite", page: 1, pageSize: 48 });
  assert.equal(toWebSearchQuery("cahier, A4 !!! règle"), "cahier A4 règle");
});

test("admin product validation rejects incoherent promotions and stock", () => {
  const base = { name: "Cahier", slug: "cahier", categoryId: "10000000-0000-0000-0000-000000000001", productType: "physical", status: "draft", variants: [{ name: "96 pages", sku: "CAH-096", price: 1000, promotionalPrice: 1200, quantity: 2, threshold: 5, availability: "in_stock", status: "active", isDefault: true }] };
  assert.equal(validateProductInput(base).ok, false);
  assert.equal(validateProductInput({ ...base, variants: [{ ...base.variants[0], promotionalPrice: 800, quantity: 0 }] }).ok, false);
  assert.equal(validateProductInput({ ...base, variants: [{ ...base.variants[0], promotionalPrice: 800 }] }).ok, true);
});

test("admin kit validation requires a valid composition and fixed price", () => {
  const base = { name: "Kit 6e", slug: "kit-6e", gradeId: "10000000-0000-0000-0000-000000000001", status: "draft", pricingStrategy: "fixed", availability: "unavailable", items: [{ productId: "10000000-0000-0000-0000-000000000002", variantId: "10000000-0000-0000-0000-000000000003", quantity: 1 }] };
  assert.equal(validateKitInput(base).ok, false);
  assert.equal(validateKitInput({ ...base, fixedPrice: 5000 }).ok, true);
});
