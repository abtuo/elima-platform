import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../../", import.meta.url);
const read = (path: string) => readFile(new URL(path, root), "utf8");

test("les baselines séparent Core School et Révision sans données ni secrets", async () => {
  const [core, revision] = await Promise.all([
    read("database/core/baseline/schema.sql"),
    read("database/revision/baseline/schema.sql"),
  ]);
  assert.match(core, /Project ref: nnsgvnjzfrcmbxfwlyow/);
  assert.match(revision, /Project ref: rydnrvvmwixrkmnvpajf/);
  assert.match(core, /create table "public"\."store_orders"/);
  assert.doesNotMatch(core, /create table "public"\."store_commerce_orders"/);
  assert.match(revision, /create table "public"\."revision_subscriptions"/);
  for (const baseline of [core, revision]) {
    assert.doesNotMatch(baseline, /postgres(?:ql)?:\/\//i);
    assert.doesNotMatch(baseline, /(?:service_role|anon)_key\s*=/i);
    assert.doesNotMatch(baseline, /eyJ[A-Za-z0-9_-]{30,}/);
  }
});

test("le plan Core ne peut contenir que les quatre migrations Store ordonnées", async () => {
  const core = JSON.parse(await read("database/core/migrations/manifest.json"));
  const revision = JSON.parse(await read("database/revision/migrations/manifest.json"));
  assert.equal(core.projectRef, "nnsgvnjzfrcmbxfwlyow");
  assert.deepEqual(
    core.deployable.map((migration: { version: string }) => migration.version),
    ["20261020120000", "20261020130000", "20261020140000", "20261020150000"],
  );
  assert.equal(revision.projectRef, "rydnrvvmwixrkmnvpajf");
  assert.deepEqual(
    revision.deployable.map((migration: { version: string }) => migration.version),
    ["20261019120000", "20261020180000"],
  );
  assert.match(core.deployable.at(-1).source, /store_commerce_orders_phase_3\.sql$/);
});

test("le nouveau Store ne réutilise plus les tables de commandes scolaires", async () => {
  const migration = await read(
    "supabase/migrations/20261020150000_store_commerce_orders_phase_3.sql",
  );
  assert.match(migration, /create table public\.store_commerce_orders/);
  assert.match(migration, /create table public\.store_commerce_order_items/);
  assert.doesNotMatch(migration, /create table public\.store_orders\s*\(/);
  assert.doesNotMatch(migration, /create table public\.store_order_items\s*\(/);
});
