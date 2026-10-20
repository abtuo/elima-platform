import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";

const migrations = [
  "20261020120000_store_catalog_phase_2a.sql",
  "20261020130000_store_catalog_admin_phase_2b.sql",
  "20261020140000_store_catalog_import_phase_2c.sql",
  "20261020150000_store_commerce_orders_phase_3.sql",
].map((name) => new URL(`../../supabase/migrations/${name}`, import.meta.url));

const customerA = "00000000-0000-0000-0000-000000000001";
const customerB = "00000000-0000-0000-0000-000000000002";
const admin = "00000000-0000-0000-0000-000000000003";
const productA = "10000000-0000-0000-0000-000000000301";
const productB = "10000000-0000-0000-0000-000000000302";
const variantA = "20000000-0000-0000-0000-000000000301";
const variantB = "20000000-0000-0000-0000-000000000302";
const kitA = "30000000-0000-0000-0000-000000000301";
const addressA = "40000000-0000-0000-0000-000000000301";
const addressB = "40000000-0000-0000-0000-000000000302";
const zoneA = "50000000-0000-0000-0000-000000000301";

async function database() {
  const db = new PGlite();
  await db.exec(`
    create role anon; create role authenticated; create role service_role;
    create schema auth; create schema storage;
    create table auth.users(id uuid primary key, phone text);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    create table storage.buckets(id text primary key, name text not null, public boolean not null default false, file_size_limit bigint, allowed_mime_types text[]);
    create table storage.objects(id uuid primary key default gen_random_uuid(), bucket_id text not null, name text not null);
    create table public.store_products(id uuid primary key, school_id uuid not null, name text not null, price numeric(12,2) not null);
    create table public.store_packs(id uuid primary key, school_id uuid not null, title text not null, price numeric(12,2) not null);
    create table public.store_pack_items(id uuid primary key, pack_id uuid not null, name text not null, quantity integer not null, unit_price numeric(12,2) not null);
    create table public.store_orders(id uuid primary key, school_id uuid not null, parent_id uuid not null, student_id uuid not null, pack_id uuid not null, order_status text not null);
    create table public.store_order_items(id uuid primary key, order_id uuid not null, name text not null, quantity integer not null, unit_price numeric(12,2) not null);
    insert into public.store_orders values ('90000000-0000-0000-0000-000000000001','90000000-0000-0000-0000-000000000002','90000000-0000-0000-0000-000000000003','90000000-0000-0000-0000-000000000004','90000000-0000-0000-0000-000000000005','pending');
  `);
  for (const url of migrations) {
    const sql = (await readFile(url, "utf8")).replace("create extension if not exists pgcrypto;", "");
    await db.exec(sql);
  }
  await db.exec(`
    insert into auth.users values ('${customerA}','+2250700000001'),('${customerB}','+2250700000002'),('${admin}','+2250700000003');
    select set_config('request.jwt.claim.sub','${admin}',false);
    insert into public.store_staff(user_id,role,status) values ('${admin}','store_admin','active');
    insert into public.store_delivery_zones(id,method_id,name,city,commune,fee_amount,is_active)
      select '${zoneA}',id,'Zone recette','Abidjan','Cocody',700,true from public.store_delivery_methods where code='home_delivery';
    insert into public.store_customer_addresses(id,customer_id,label,recipient_name,phone,city,commune,neighborhood,address_details,delivery_zone_id,is_default) values
      ('${addressA}','${customerA}','Maison','Awa Koné','+2250700000001','Abidjan','Cocody','Riviera','Rue de la recette','${zoneA}',true),
      ('${addressB}','${customerB}','Maison','Koffi Yao','+2250700000002','Abidjan','Cocody','Angré','Rue du test','${zoneA}',true);
    insert into public.store_catalog_products(id,seller_id,category_id,name,slug,status,published_at)
      select '${productA}',seller.id,category.id,'Cahier Phase 3','cahier-phase-3','active',now() from public.store_sellers seller,public.store_categories category where seller.slug='elima-store' and category.slug='cahiers-et-papiers';
    insert into public.store_catalog_products(id,seller_id,category_id,name,slug,status,published_at)
      select '${productB}',seller.id,category.id,'Stylo Phase 3','stylo-phase-3','active',now() from public.store_sellers seller,public.store_categories category where seller.slug='elima-store' and category.slug='ecriture';
    insert into public.store_product_variants(id,product_id,sku,name,price_amount,quantity_available,availability,status,is_default) values
      ('${variantA}','${productA}','P3-CAHIER','96 pages',1000,5,'in_stock','active',true),
      ('${variantB}','${productB}','P3-STYLO','Bleu',500,1,'in_stock','active',true);
    insert into public.store_catalog_kits(id,seller_id,grade_id,name,slug,status,pricing_strategy,fixed_price_amount,availability,published_at)
      select '${kitA}',seller.id,grade.id,'Kit Phase 3','kit-phase-3','active','fixed',1200,'in_stock',now() from public.store_sellers seller,public.store_grade_levels grade where seller.slug='elima-store' and grade.slug='6e';
    insert into public.store_kit_items(kit_id,product_id,variant_id,quantity) values ('${kitA}','${productB}','${variantB}',1);
    select set_config('request.jwt.claim.sub','${customerA}',false);
  `);
  return db;
}

function productCart(quantity = 1) { return JSON.stringify([{ itemType: "product", productId: productA, variantId: variantA, quantity }]); }
function kitCart(quantity = 1) { return JSON.stringify([{ itemType: "kit", kitId: kitA, quantity }]); }

test("Phase 3 couvre checkout, concurrence, idempotence, annulation, transitions, COD et RLS", async (context) => {
  const db = await database(); context.after(() => db.close());

  const legacy = await db.query<{ order_status: string }>("select order_status from public.store_orders where id='90000000-0000-0000-0000-000000000001'");
  assert.equal(legacy.rows[0]?.order_status, "pending", "la commande scolaire historique reste intacte");
  const commerceTables = await db.query<{ table_name: string }>("select table_name from information_schema.tables where table_schema='public' and table_name in ('store_commerce_orders','store_commerce_order_items') order by table_name");
  assert.deepEqual(commerceTables.rows.map((row) => row.table_name), ["store_commerce_order_items", "store_commerce_orders"]);

  const quote = await db.query<{ quote_store_checkout: { subtotal: number; deliveryFee: number; total: number } }>(
    `select public.quote_store_checkout('${productCart(2)}'::jsonb,'home_delivery','${addressA}','${zoneA}',null)`,
  );
  assert.deepEqual([quote.rows[0]?.quote_store_checkout.subtotal,quote.rows[0]?.quote_store_checkout.deliveryFee,quote.rows[0]?.quote_store_checkout.total],[2000,700,2700]);
  await assert.rejects(db.exec(`select public.quote_store_checkout('[]'::jsonb,'home_delivery','${addressA}','${zoneA}',null)`), /EMPTY_OR_INVALID_CART/);
  await assert.rejects(db.exec(`select public.quote_store_checkout('${productCart()}'::jsonb,'home_delivery','${addressB}','${zoneA}',null)`), /ADDRESS_NOT_AUTHORIZED/);

  const keyA = "60000000-0000-0000-0000-000000000301";
  const created = await db.query<{ create_store_order: { reference: string; duplicate: boolean } }>(
    `select public.create_store_order('${productCart(2)}'::jsonb,'home_delivery','${addressA}','${zoneA}',null,'${keyA}',2000,700,null)`,
  );
  const reference = created.rows[0]!.create_store_order.reference;
  assert.equal(created.rows[0]?.create_store_order.duplicate, false);
  const duplicate = await db.query<{ create_store_order: { reference: string; duplicate: boolean } }>(
    `select public.create_store_order('${productCart(2)}'::jsonb,'home_delivery','${addressA}','${zoneA}',null,'${keyA}',2000,700,null)`,
  );
  assert.equal(duplicate.rows[0]?.create_store_order.reference, reference);
  assert.equal(duplicate.rows[0]?.create_store_order.duplicate, true);
  const firstState = await db.query<{ payment_status: string; quantity_reserved: number; orders: bigint }>(`select
    (select payment_status from public.store_commerce_orders where reference='${reference}') payment_status,
    (select quantity_reserved from public.store_product_variants where id='${variantA}') quantity_reserved,
    (select count(*) from public.store_commerce_orders where idempotency_key='${keyA}') orders`);
  assert.deepEqual([firstState.rows[0]?.payment_status,firstState.rows[0]?.quantity_reserved,Number(firstState.rows[0]?.orders)],["unpaid",2,1]);

  await db.exec(`update public.store_product_variants set price_amount=1100 where id='${variantA}'`);
  await assert.rejects(db.exec(`select public.create_store_order('${productCart()}'::jsonb,'home_delivery','${addressA}','${zoneA}',null,'60000000-0000-0000-0000-000000000302',1000,700,null)`), /CHECKOUT_CHANGED/);
  await db.exec(`select set_config('request.jwt.claim.sub','${customerB}',false)`);
  await assert.rejects(db.exec(`select public.create_store_order('${productCart(4)}'::jsonb,'home_delivery','${addressB}','${zoneA}',null,'60000000-0000-0000-0000-000000000303',4400,700,null)`), /INSUFFICIENT_STOCK/);

  const kitQuote = await db.query<{ quote_store_checkout: { subtotal: number; deliveryFee: number } }>(`select public.quote_store_checkout('${kitCart()}'::jsonb,'home_delivery','${addressB}','${zoneA}',null)`);
  assert.equal(kitQuote.rows[0]?.quote_store_checkout.subtotal,1200);
  await db.exec(`select public.create_store_order('${kitCart()}'::jsonb,'home_delivery','${addressB}','${zoneA}',null,'60000000-0000-0000-0000-000000000304',1200,700,null)`);
  await db.exec(`select set_config('request.jwt.claim.sub','${customerA}',false)`);
  await assert.rejects(db.exec(`select public.quote_store_checkout('${kitCart()}'::jsonb,'home_delivery','${addressA}','${zoneA}',null)`), /KIT_COMPONENT_UNAVAILABLE/);

  const cancelKey = "60000000-0000-0000-0000-000000000305";
  await db.exec(`select public.create_store_order('${productCart()}'::jsonb,'home_delivery','${addressA}','${zoneA}',null,'${cancelKey}',1100,700,null)`);
  const beforeCancel = await db.query<{ quantity_reserved: number }>(`select quantity_reserved from public.store_product_variants where id='${variantA}'`);
  const cancelRef = await db.query<{ reference: string }>(`select reference from public.store_commerce_orders where idempotency_key='${cancelKey}'`);
  await db.exec(`select public.cancel_store_order('${cancelRef.rows[0]!.reference}','Changement client')`);
  const afterCancel = await db.query<{ quantity_reserved: number }>(`select quantity_reserved from public.store_product_variants where id='${variantA}'`);
  assert.equal(beforeCancel.rows[0]!.quantity_reserved-afterCancel.rows[0]!.quantity_reserved,1);

  await db.exec(`select set_config('request.jwt.claim.sub','${admin}',false)`);
  const order = await db.query<{ id: string }>(`select id from public.store_commerce_orders where reference='${reference}'`); const orderId=order.rows[0]!.id;
  for (const status of ["confirmed","preparing","out_for_delivery","delivered"]) await db.exec(`select public.transition_store_order('${orderId}','${status}','Recette',false)`);
  const delivered = await db.query<{ status:string;payment_status:string;quantity_available:number;quantity_reserved:number;history:bigint }>(`select
    (select status from public.store_commerce_orders where id='${orderId}') status,
    (select payment_status from public.store_commerce_orders where id='${orderId}') payment_status,
    (select quantity_available from public.store_product_variants where id='${variantA}') quantity_available,
    (select quantity_reserved from public.store_product_variants where id='${variantA}') quantity_reserved,
    (select count(*) from public.store_order_status_history where order_id='${orderId}') history`);
  assert.deepEqual([delivered.rows[0]?.status,delivered.rows[0]?.payment_status,delivered.rows[0]?.quantity_available,delivered.rows[0]?.quantity_reserved,Number(delivered.rows[0]?.history)],["delivered","unpaid",3,0,5]);
  await db.exec(`select public.record_store_cod_payment('${orderId}',2700,now(),'cash','RECETTE-1',null)`);
  await assert.rejects(db.exec(`select public.record_store_cod_payment('${orderId}',2700,now(),'cash','RECETTE-2',null)`), /PAYMENT_ALREADY_RECORDED/);

  const failedOrder=await db.query<{id:string}>("select id from public.store_commerce_orders where idempotency_key='60000000-0000-0000-0000-000000000304'");
  for(const status of ["confirmed","preparing","out_for_delivery","delivery_failed"])await db.exec(`select public.transition_store_order('${failedOrder.rows[0]!.id}','${status}','Incident recette',false)`);
  const review=await db.query<{status:string;quantity_reserved:number}>(`select reservation.status,variant.quantity_reserved from public.store_inventory_reservations reservation join public.store_product_variants variant on variant.id=reservation.variant_id where reservation.order_id='${failedOrder.rows[0]!.id}'`);
  assert.deepEqual(review.rows[0],{status:"review_required",quantity_reserved:1});
  await db.exec(`select public.resolve_store_reservation_review('${failedOrder.rows[0]!.id}','release','Retour contrôlé et revendable')`);
  const released=await db.query<{status:string;quantity_reserved:number}>(`select reservation.status,variant.quantity_reserved from public.store_inventory_reservations reservation join public.store_product_variants variant on variant.id=reservation.variant_id where reservation.order_id='${failedOrder.rows[0]!.id}'`);
  assert.deepEqual(released.rows[0],{status:"released",quantity_reserved:0});

  await db.exec(`select set_config('request.jwt.claim.sub','${customerB}',false); set role authenticated`);
  const forbidden = await db.query<{ reference:string }>(`select reference from public.store_commerce_orders where reference='${reference}'`);
  assert.equal(forbidden.rows.length,0);
  await db.exec("reset role");
});

test("la migration Phase 3 protège les écritures et n’active aucun paiement en ligne", async () => {
  const sql = await readFile(migrations[3]!, "utf8");
  assert.match(sql,/payment_method text not null default 'cash_on_delivery'/);
  assert.match(sql,/unique \(customer_id, idempotency_key\)/);
  assert.match(sql,/quantity_reserved <= quantity_available/);
  assert.match(sql,/store_commerce_orders_owner_read[\s\S]*customer_id=auth\.uid\(\)/);
  assert.match(sql,/store_admin','order_manager/);
  assert.doesNotMatch(sql,/stripe|paypal/i);
});
