import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";

const migrationUrl = new URL("../../supabase/migrations/20261020120000_store_catalog_phase_2a.sql", import.meta.url);
const adminMigrationUrl = new URL("../../supabase/migrations/20261020130000_store_catalog_admin_phase_2b.sql", import.meta.url);
const importMigrationUrl = new URL("../../supabase/migrations/20261020140000_store_catalog_import_phase_2c.sql", import.meta.url);
async function database() {
  const db = new PGlite();
  await db.exec(`
    create role anon; create role authenticated; create role service_role;
    create schema auth; create schema storage;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select '00000000-0000-0000-0000-000000000001'::uuid $$;
    create table storage.buckets(id text primary key, name text not null, public boolean not null default false, file_size_limit bigint, allowed_mime_types text[]);
    create table storage.objects(id uuid primary key default gen_random_uuid(), bucket_id text not null, name text not null);
  `);
  const migration = (await readFile(migrationUrl, "utf8")).replace(
    "create extension if not exists pgcrypto;",
    "",
  );
  await db.exec(migration);
  await db.exec(await readFile(adminMigrationUrl, "utf8"));
  await db.exec(await readFile(importMigrationUrl, "utf8"));
  return db;
}

test("la migration Store 2A s'exécute et crée le catalogue sans modifier le Store scolaire", async (context) => {
  const db = await database(); context.after(() => db.close());
  const tables = await db.query<{ table_name: string }>("select table_name from information_schema.tables where table_schema='public' and table_name like 'store_%'");
  const names = new Set(tables.rows.map((row) => row.table_name));
  for (const name of ["store_sellers", "store_categories", "store_catalog_products", "store_product_variants", "store_product_images", "store_grade_levels", "store_catalog_kits", "store_kit_items", "store_inventory_adjustments"]) assert.ok(names.has(name), name);
  assert.equal(names.has("store_products"), false, "la migration additive ne recrée pas la table scolaire historique");
});

test("SKU, prix promotionnel, stock et variante de kit sont contraints", async (context) => {
  const db = await database(); context.after(() => db.close());
  await db.exec(`
    insert into auth.users values ('00000000-0000-0000-0000-000000000001');
    insert into public.store_staff(user_id, role, status) values ('00000000-0000-0000-0000-000000000001','store_admin','active');
    insert into public.store_catalog_products(id,seller_id,category_id,name,slug,status,published_at)
    select '10000000-0000-0000-0000-000000000001', seller.id, category.id, 'Cahier test', 'cahier-test', 'active', now()
    from public.store_sellers seller, public.store_categories category where seller.slug='elima-store' and category.slug='cahiers-et-papiers';
    insert into public.store_product_variants(id,product_id,sku,name,price_amount,promotional_price_amount,quantity_available,availability,status,is_default)
    values ('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','TEST-001','96 pages',1000,800,5,'in_stock','active',true);
  `);
  const price = await db.query<{ starting_price_amount: bigint; has_active_promotion: boolean }>("select starting_price_amount,has_active_promotion from public.store_catalog_products where slug='cahier-test'");
  assert.equal(Number(price.rows[0]?.starting_price_amount), 800); assert.equal(price.rows[0]?.has_active_promotion, true);
  await assert.rejects(db.exec("insert into public.store_product_variants(product_id,sku,name,price_amount,promotional_price_amount) values ('10000000-0000-0000-0000-000000000001','TEST-001','Doublon',500,600)"));
  await assert.rejects(db.exec("update public.store_product_variants set quantity_available=0,availability='in_stock' where sku='TEST-001'"));
  const adjusted = await db.query<{ adjust_store_inventory: number }>("select public.adjust_store_inventory('20000000-0000-0000-0000-000000000001',-5,'manual_correction','test')");
  assert.equal(adjusted.rows[0]?.adjust_store_inventory, 0);
});

test("RLS masque les brouillons au public et refuse ses écritures", async (context) => {
  const db = await database(); context.after(() => db.close());
  await db.exec(`
    insert into public.store_catalog_products(id,seller_id,category_id,name,slug,status,published_at)
    select '10000000-0000-0000-0000-000000000011', seller.id, category.id, 'Produit public', 'produit-public', 'active', now()
    from public.store_sellers seller, public.store_categories category where seller.slug='elima-store' and category.slug='cahiers-et-papiers';
    insert into public.store_catalog_products(id,seller_id,category_id,name,slug,status)
    select '10000000-0000-0000-0000-000000000012', seller.id, category.id, 'Produit brouillon', 'produit-brouillon', 'draft'
    from public.store_sellers seller, public.store_categories category where seller.slug='elima-store' and category.slug='cahiers-et-papiers';
    insert into public.store_catalog_products(id,seller_id,category_id,name,slug,status,published_at)
    select '10000000-0000-0000-0000-000000000013', seller.id, category.id, 'Produit programmé', 'produit-programme', 'active', now() + interval '1 day'
    from public.store_sellers seller, public.store_categories category where seller.slug='elima-store' and category.slug='cahiers-et-papiers';
    set role anon;
  `);
  const visible = await db.query<{ slug: string }>("select slug from public.store_catalog_products order by slug");
  assert.deepEqual(visible.rows.map((row) => row.slug), ["produit-public"]);
  await assert.rejects(db.exec("insert into public.store_categories(name,slug) values ('Interdit','interdit')"));
  await db.exec("reset role");
});

test("les politiques publiques masquent les brouillons et les écritures exigent le personnel Store", async () => {
  const sql = await readFile(migrationUrl, "utf8");
  assert.match(sql, /store_products_public_read[\s\S]*status = 'active'[\s\S]*published_at <= now\(\)/);
  assert.match(sql, /public\.is_store_staff\(array\['store_admin','catalog_manager'\]\)/);
  assert.doesNotMatch(sql, /current_user_role\(\)[\s\S]{0,100}SCHOOL_ADMIN/);
  assert.match(sql, /store-product-media[\s\S]*false[\s\S]*image\/avif/);
  assert.match(sql, /unique[\s\S]*sku|sku text not null unique/i);
});

test("Phase 2B contrôle publication, promotions et cycles de catégories", async (context) => {
  const db = await database(); context.after(() => db.close());
  await db.exec(`
    insert into auth.users values ('00000000-0000-0000-0000-000000000001');
    insert into public.store_catalog_products(id,seller_id,category_id,name,slug,status)
    select '10000000-0000-0000-0000-000000000021', seller.id, category.id, 'Produit administré', 'produit-administre', 'draft'
    from public.store_sellers seller, public.store_categories category where seller.slug='elima-store' and category.slug='cahiers-et-papiers';
    insert into public.store_product_variants(id,product_id,sku,name,price_amount,quantity_available,availability,status,is_default)
    values ('20000000-0000-0000-0000-000000000021','10000000-0000-0000-0000-000000000021','ADMIN-001','Principale',1000,2,'in_stock','active',true);
  `);
  await assert.rejects(db.exec("select public.set_store_product_publication('10000000-0000-0000-0000-000000000021','active')"));
  await db.exec("insert into public.store_staff(user_id,role,status) values ('00000000-0000-0000-0000-000000000001','store_admin','active')");
  await db.exec("select public.set_store_product_publication('10000000-0000-0000-0000-000000000021','active')");
  const published = await db.query<{ status: string; published_at: Date }>("select status,published_at from public.store_catalog_products where id='10000000-0000-0000-0000-000000000021'");
  assert.equal(published.rows[0]?.status, "active"); assert.ok(published.rows[0]?.published_at);
  await assert.rejects(db.exec("update public.store_product_variants set promotional_price_amount=900,promotion_starts_at=now(),promotion_ends_at=now()-interval '1 day' where sku='ADMIN-001'"));
  const category = await db.query<{ id: string }>("select id from public.store_categories where slug='fournitures-scolaires'");
  const child = await db.query<{ id: string }>("select id from public.store_categories where slug='cahiers-et-papiers'");
  await assert.rejects(db.exec(`update public.store_categories set parent_id='${child.rows[0]?.id}' where id='${category.rows[0]?.id}'`));
});

test("Phase 2C journalise les imports et isole les coûts d’achat", async (context) => {
  const db = await database(); context.after(() => db.close());
  await db.exec(`
    insert into auth.users values ('00000000-0000-0000-0000-000000000001');
    insert into public.store_staff(user_id,role,status) values ('00000000-0000-0000-0000-000000000001','store_admin','active');
    insert into public.store_catalog_imports(created_by,filename,file_format,file_checksum,conflict_strategy,total_rows)
    values ('00000000-0000-0000-0000-000000000001','catalogue.xlsx','xlsx','checksum','skip',100);
  `);
  const imported = await db.query<{total_rows:number;status:string}>("select total_rows,status from public.store_catalog_imports");
  assert.equal(imported.rows[0]?.total_rows,100); assert.equal(imported.rows[0]?.status,"processing");
  const columns=await db.query<{column_name:string}>("select column_name from information_schema.columns where table_name='store_variant_commercial_costs'");
  assert.ok(columns.rows.some((column)=>column.column_name==="purchase_cost_amount"));
  const grants=await db.query<{grantee:string}>("select grantee from information_schema.role_table_grants where table_name='store_variant_commercial_costs'");
  assert.equal(grants.rows.some((grant)=>grant.grantee==="anon"),false);
});

test("Phase 2C détecte les brouillons incomplets sans les publier", async (context) => {
  const db=await database(); context.after(()=>db.close());
  await db.exec(`insert into auth.users values ('00000000-0000-0000-0000-000000000001'); insert into public.store_staff(user_id,role,status) values ('00000000-0000-0000-0000-000000000001','catalog_manager','active');
    insert into public.store_catalog_products(id,seller_id,category_id,name,slug,status) select '10000000-0000-0000-0000-000000000099',seller.id,category.id,'Brouillon incomplet','brouillon-incomplet','draft' from public.store_sellers seller,public.store_categories category where seller.slug='elima-store' and category.slug='ecriture';`);
  const quality=await db.query<{store_catalog_quality_report:{productsWithoutImage:Array<{id:string}>;productsWithoutVariant:Array<{id:string}>}}>("select public.store_catalog_quality_report()");
  assert.ok(quality.rows[0]?.store_catalog_quality_report.productsWithoutImage.some((item)=>item.id==="10000000-0000-0000-0000-000000000099"));
  assert.ok(quality.rows[0]?.store_catalog_quality_report.productsWithoutVariant.some((item)=>item.id==="10000000-0000-0000-0000-000000000099"));
  await db.exec("set role anon"); const visible=await db.query("select id from public.store_catalog_products where id='10000000-0000-0000-0000-000000000099'"); assert.equal(visible.rows.length,0); await db.exec("reset role");
});

test("Phase 2D couvre le cycle produit, les classes, le kit et l’archivage public", async (context) => {
  const db=await database(); context.after(()=>db.close());
  await db.exec(`
    insert into auth.users values ('00000000-0000-0000-0000-000000000001');
    insert into public.store_staff(user_id,role,status) values ('00000000-0000-0000-0000-000000000001','store_admin','active');
    insert into public.store_catalog_products(id,seller_id,category_id,name,slug,status)
      select '10000000-0000-0000-0000-000000000201',seller.id,category.id,'Produit recette A','produit-recette-a','draft'
      from public.store_sellers seller,public.store_categories category where seller.slug='elima-store' and category.slug='ecriture';
    insert into public.store_catalog_products(id,seller_id,category_id,name,slug,status)
      select '10000000-0000-0000-0000-000000000202',seller.id,category.id,'Produit recette B','produit-recette-b','draft'
      from public.store_sellers seller,public.store_categories category where seller.slug='elima-store' and category.slug='geometrie';
    insert into public.store_product_variants(id,product_id,sku,name,price_amount,quantity_available,availability,status,is_default) values
      ('20000000-0000-0000-0000-000000000201','10000000-0000-0000-0000-000000000201','QA-201','Bleu',1500,12,'in_stock','active',true),
      ('20000000-0000-0000-0000-000000000202','10000000-0000-0000-0000-000000000202','QA-202','Standard',2500,5,'in_stock','active',true);
    insert into public.store_product_images(product_id,external_url,alt_text,is_primary,sort_order) values
      ('10000000-0000-0000-0000-000000000201','https://media.example.test/qa-a-main.webp','Produit recette A',true,0),
      ('10000000-0000-0000-0000-000000000201','https://media.example.test/qa-a-detail.webp','Détail du produit recette A',false,1);
    insert into public.store_product_grades(product_id,grade_id)
      select '10000000-0000-0000-0000-000000000201',id from public.store_grade_levels where slug in ('cm2','6e');
    select public.set_store_product_publication('10000000-0000-0000-0000-000000000201','active');
    select public.set_store_product_publication('10000000-0000-0000-0000-000000000202','active');
    insert into public.store_catalog_kits(id,seller_id,grade_id,name,slug,status,pricing_strategy,fixed_price_amount,availability,published_at)
      select '30000000-0000-0000-0000-000000000201',seller.id,grade.id,'Kit recette','kit-recette','active','fixed',5000,'in_stock',now()
      from public.store_sellers seller,public.store_grade_levels grade where seller.slug='elima-store' and grade.slug='6e';
    insert into public.store_kit_items(kit_id,product_id,variant_id,quantity,sort_order) values
      ('30000000-0000-0000-0000-000000000201','10000000-0000-0000-0000-000000000201','20000000-0000-0000-0000-000000000201',2,0),
      ('30000000-0000-0000-0000-000000000201','10000000-0000-0000-0000-000000000202','20000000-0000-0000-0000-000000000202',1,1);
  `);
  const completeness=await db.query<{images:bigint;grades:bigint;items:bigint}>(`select
    (select count(*) from public.store_product_images where product_id='10000000-0000-0000-0000-000000000201') images,
    (select count(*) from public.store_product_grades where product_id='10000000-0000-0000-0000-000000000201') grades,
    (select count(*) from public.store_kit_items where kit_id='30000000-0000-0000-0000-000000000201') items`);
  assert.deepEqual([Number(completeness.rows[0]?.images),Number(completeness.rows[0]?.grades),Number(completeness.rows[0]?.items)],[2,2,2]);
  await db.exec(`
    update public.store_catalog_products set name='Produit recette A modifié',description='Description validée' where id='10000000-0000-0000-0000-000000000201';
    update public.store_product_variants set price_amount=1750,quantity_available=9 where id='20000000-0000-0000-0000-000000000201';
  `);
  const modified=await db.query<{name:string;description:string;price_amount:number;quantity_available:number}>(`select product.name,product.description,variant.price_amount,variant.quantity_available
    from public.store_catalog_products product join public.store_product_variants variant on variant.product_id=product.id
    where product.id='10000000-0000-0000-0000-000000000201'`);
  assert.deepEqual(modified.rows[0],{name:'Produit recette A modifié',description:'Description validée',price_amount:1750,quantity_available:9});
  await db.exec("set role anon");
  const visible=await db.query<{slug:string}>("select slug from public.store_catalog_products where slug like 'produit-recette-%' order by slug"); assert.deepEqual(visible.rows.map((row)=>row.slug),['produit-recette-a','produit-recette-b']);
  const visibleKit=await db.query<{slug:string}>("select slug from public.store_catalog_kits where slug='kit-recette'"); assert.equal(visibleKit.rows.length,1);
  await db.exec("reset role; select public.set_store_product_publication('10000000-0000-0000-0000-000000000201','archived'); set role anon;");
  const archived=await db.query("select id from public.store_catalog_products where id='10000000-0000-0000-0000-000000000201'"); assert.equal(archived.rows.length,0); await db.exec("reset role");
});
