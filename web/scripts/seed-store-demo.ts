/**
 * Seed demo data for Elima Store.
 *
 * Prerequisites:
 *   1. Apply supabase/migrations/20260704120000_elima_store.sql.
 *   2. Env: SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) + SUPABASE_SERVICE_ROLE_KEY.
 *
 * Usage:
 *   npm run seed:store
 */

import path from "node:path";
import { config as dotenvConfig } from "dotenv";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const root = process.cwd();
dotenvConfig({ path: path.join(root, ".env") });
dotenvConfig({ path: path.join(root, ".env.local"), override: true });

const ACADEMIC_YEAR = "2025-2026";

type SchoolRow = { id: string; name: string };
type ClassRow = { id: string; school_id: string; name: string; level: string; academic_year: string };
type StudentRow = { id: string; school_id: string; class_id: string; full_name: string };
type ParentLinkRow = { student_id: string; parent_id: string };
type ProductSeed = { name: string; description: string; category: string; price: number };
type PackType = "essential" | "recommended" | "premium";

const products: ProductSeed[] = [
  { name: "Cahier 100 pages", description: "Cahier grands carreaux pour exercices quotidiens.", category: "Cahiers", price: 750 },
  { name: "Cahier 200 pages", description: "Cahier grand format pour cours principaux.", category: "Cahiers", price: 1200 },
  { name: "Stylo bleu", description: "Stylo bille bleu pointe moyenne.", category: "Ecriture", price: 150 },
  { name: "Stylo rouge", description: "Stylo bille rouge pour corrections.", category: "Ecriture", price: 150 },
  { name: "Crayon HB", description: "Crayon graphite HB.", category: "Ecriture", price: 100 },
  { name: "Regle 30 cm", description: "Regle transparente graduee.", category: "Geometrie", price: 300 },
  { name: "Gomme", description: "Gomme blanche souple.", category: "Ecriture", price: 100 },
  { name: "Trousse", description: "Trousse scolaire zippee.", category: "Accessoires", price: 1500 },
  { name: "Sac scolaire", description: "Sac a dos renforce pour fournitures.", category: "Accessoires", price: 9500 },
  { name: "Kit geometrie", description: "Equerre, rapporteur, compas et regle.", category: "Geometrie", price: 2500 },
];

const listItems = [
  { name: "Cahier 100 pages", quantity: 4, notes: "Pour exercices et travaux diriges." },
  { name: "Cahier 200 pages", quantity: 3, notes: "Pour les matieres principales." },
  { name: "Stylo bleu", quantity: 5, notes: "Prevoir une reserve." },
  { name: "Stylo rouge", quantity: 2, notes: "Correction et annotations." },
  { name: "Crayon HB", quantity: 2, notes: "Dessin et brouillon." },
  { name: "Regle 30 cm", quantity: 1, notes: "Modele rigide conseille." },
  { name: "Gomme", quantity: 2, notes: null },
  { name: "Trousse", quantity: 1, notes: null },
  { name: "Kit geometrie", quantity: 1, notes: "Necessaire pour mathematiques." },
];

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env ${name}`);
  return value;
}

function productPriceByName(name: string) {
  return products.find((p) => p.name === name)?.price ?? 0;
}

function packMultiplier(type: PackType) {
  if (type === "premium") return 1.2;
  if (type === "recommended") return 1;
  return 0.78;
}

function packTitle(className: string, type: PackType) {
  const label = type === "essential" ? "Essentiel" : type === "recommended" ? "Recommande" : "Premium";
  return `Pack ${label} - ${className}`;
}

async function getSchools(supabase: SupabaseClient): Promise<SchoolRow[]> {
  const { data, error } = await supabase.from("schools").select("id, name").order("created_at", { ascending: true }).limit(2);
  if (error) throw error;
  return (data ?? []) as SchoolRow[];
}

async function getClasses(supabase: SupabaseClient, schoolId: string): Promise<ClassRow[]> {
  const { data, error } = await supabase
    .from("classes")
    .select("id, school_id, name, level, academic_year")
    .eq("school_id", schoolId)
    .order("level", { ascending: true })
    .order("name", { ascending: true })
    .limit(3);
  if (error) throw error;
  return (data ?? []) as ClassRow[];
}

async function ensureProducts(supabase: SupabaseClient, schoolId: string) {
  const { data: existing, error: existingErr } = await supabase
    .from("store_products")
    .select("id, name")
    .eq("school_id", schoolId);
  if (existingErr) throw existingErr;

  const byName = new Map(((existing ?? []) as Array<{ id: string; name: string }>).map((p) => [p.name, p.id]));
  const missing = products.filter((p) => !byName.has(p.name));
  if (missing.length > 0) {
    const { data, error } = await supabase
      .from("store_products")
      .insert(
        missing.map((p) => ({
          school_id: schoolId,
          name: p.name,
          description: p.description,
          category: p.category,
          price: p.price,
          image_url: null,
          is_active: true,
        })) as never,
      )
      .select("id, name");
    if (error) throw error;
    for (const row of (data ?? []) as Array<{ id: string; name: string }>) {
      byName.set(row.name, row.id);
    }
  }

  return byName;
}

async function ensureSupplyList(
  supabase: SupabaseClient,
  schoolId: string,
  cls: ClassRow,
  productIds: Map<string, string>,
) {
  const title = `Liste de fournitures - ${cls.name}`;
  const { data: existing, error: existingErr } = await supabase
    .from("supply_lists")
    .select("id")
    .eq("school_id", schoolId)
    .eq("class_id", cls.id)
    .eq("academic_year", cls.academic_year || ACADEMIC_YEAR)
    .eq("title", title)
    .maybeSingle();
  if (existingErr) throw existingErr;

  let listId = (existing as { id?: string } | null)?.id;
  const listStatus = cls.name === "6ème B" ? "draft" : "published";
  if (!listId) {
    const { data, error } = await supabase
      .from("supply_lists")
      .insert({
        school_id: schoolId,
        class_id: cls.id,
        title,
        academic_year: cls.academic_year || ACADEMIC_YEAR,
        status: listStatus,
      } as never)
      .select("id")
      .single();
    if (error) throw error;
    listId = (data as { id: string }).id;
  } else if (cls.name === "6ème B") {
    const { error: statusErr } = await supabase.from("supply_lists").update({ status: "draft" } as never).eq("id", listId);
    if (statusErr) throw statusErr;
  }

  const { data: existingItems, error: itemsErr } = await supabase
    .from("supply_list_items")
    .select("name")
    .eq("supply_list_id", listId);
  if (itemsErr) throw itemsErr;
  const existingNames = new Set(((existingItems ?? []) as Array<{ name: string }>).map((i) => i.name));
  const missing = listItems.filter((item) => !existingNames.has(item.name));
  if (missing.length > 0) {
    const { error } = await supabase.from("supply_list_items").insert(
      missing.map((item) => ({
        supply_list_id: listId,
        name: item.name,
        quantity: item.quantity,
        notes: item.notes,
        recommended_product_id: productIds.get(item.name) ?? null,
      })) as never,
    );
    if (error) throw error;
  }

  return listId;
}

async function ensurePack(
  supabase: SupabaseClient,
  schoolId: string,
  cls: ClassRow,
  supplyListId: string,
  type: PackType,
  productIds: Map<string, string>,
) {
  const title = packTitle(cls.name, type);
  const multiplier = packMultiplier(type);
  const selectedItems = type === "essential" ? listItems.slice(0, 7) : type === "recommended" ? listItems : [...listItems, { name: "Sac scolaire", quantity: 1, notes: null }];
  const total = selectedItems.reduce((sum, item) => sum + productPriceByName(item.name) * item.quantity * multiplier, 0);

  const { data: existing, error: existingErr } = await supabase
    .from("store_packs")
    .select("id")
    .eq("school_id", schoolId)
    .eq("class_id", cls.id)
    .eq("type", type)
    .eq("title", title)
    .maybeSingle();
  if (existingErr) throw existingErr;

  let packId = (existing as { id?: string } | null)?.id;
  if (!packId) {
    const { data, error } = await supabase
      .from("store_packs")
      .insert({
        school_id: schoolId,
        class_id: cls.id,
        supply_list_id: supplyListId,
        title,
        description: `Pack scolaire ${type} pour ${cls.name}, prepare pour le retrait a l'ecole.`,
        price: Math.round(total),
        type,
        status: "published",
      } as never)
      .select("id")
      .single();
    if (error) throw error;
    packId = (data as { id: string }).id;
  }

  const { data: existingItems, error: itemsErr } = await supabase.from("store_pack_items").select("name").eq("pack_id", packId);
  if (itemsErr) throw itemsErr;
  const existingNames = new Set(((existingItems ?? []) as Array<{ name: string }>).map((i) => i.name));
  const missing = selectedItems.filter((item) => !existingNames.has(item.name));
  if (missing.length > 0) {
    const { error } = await supabase.from("store_pack_items").insert(
      missing.map((item) => {
        const unitPrice = Math.round(productPriceByName(item.name) * multiplier);
        return {
          pack_id: packId,
          product_id: productIds.get(item.name) ?? null,
          name: item.name,
          quantity: item.quantity,
          unit_price: unitPrice,
        };
      }) as never,
    );
    if (error) throw error;
  }

  return { id: packId, total: Math.round(total) };
}

async function seedOrders(supabase: SupabaseClient, schoolId: string, classes: ClassRow[]) {
  const { data: existingOrders, error: existingErr } = await supabase
    .from("store_orders")
    .select("id")
    .eq("school_id", schoolId)
    .limit(1);
  if (existingErr) throw existingErr;
  if ((existingOrders ?? []).length > 0) return 0;

  const classIds = classes.map((c) => c.id);
  const { data: studentsData, error: studentsErr } = await supabase
    .from("students")
    .select("id, school_id, class_id, full_name")
    .eq("school_id", schoolId)
    .in("class_id", classIds)
    .limit(8);
  if (studentsErr) throw studentsErr;
  const students = (studentsData ?? []) as StudentRow[];
  if (students.length === 0) return 0;

  const { data: linksData, error: linksErr } = await supabase
    .from("student_parents")
    .select("student_id, parent_id")
    .in("student_id", students.map((s) => s.id));
  if (linksErr) throw linksErr;
  const parentByStudent = new Map(((linksData ?? []) as ParentLinkRow[]).map((l) => [l.student_id, l.parent_id]));

  let count = 0;
  for (const [index, student] of students.entries()) {
    const parentId = parentByStudent.get(student.id);
    if (!parentId) continue;
    const { data: pack, error: packErr } = await supabase
      .from("store_packs")
      .select("id, price")
      .eq("school_id", schoolId)
      .eq("class_id", student.class_id)
      .eq("type", index % 3 === 0 ? "premium" : index % 2 === 0 ? "recommended" : "essential")
      .eq("status", "published")
      .maybeSingle();
    if (packErr) throw packErr;
    if (!pack) continue;

    const { data: order, error: orderErr } = await supabase
      .from("store_orders")
      .insert({
        school_id: schoolId,
        parent_id: parentId,
        student_id: student.id,
        class_id: student.class_id,
        pack_id: (pack as { id: string }).id,
        total_amount: Number((pack as { price: number }).price ?? 0),
        payment_status: index % 4 === 0 ? "paid" : "pending",
        order_status: index % 4 === 0 ? "confirmed" : index % 3 === 0 ? "preparing" : "pending",
        pickup_location: "Retrait a l'ecole",
      } as never)
      .select("id")
      .single();
    if (orderErr) throw orderErr;

    const { data: packItems, error: packItemsErr } = await supabase
      .from("store_pack_items")
      .select("product_id, name, quantity, unit_price")
      .eq("pack_id", (pack as { id: string }).id);
    if (packItemsErr) throw packItemsErr;

    const orderId = (order as { id: string }).id;
    const { error: orderItemsErr } = await supabase.from("store_order_items").insert(
      ((packItems ?? []) as Array<{ product_id: string | null; name: string; quantity: number; unit_price: number }>).map((item) => ({
        order_id: orderId,
        product_id: item.product_id,
        name: item.name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: Number(item.quantity) * Number(item.unit_price),
      })) as never,
    );
    if (orderItemsErr) throw orderItemsErr;
    count += 1;
  }

  return count;
}

async function main() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) throw new Error("Missing SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL");
  const supabase = createClient(supabaseUrl, requireEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false },
  });

  const schools = await getSchools(supabase);
  if (schools.length === 0) {
    console.log("[seed:store] No school found. Run npm run seed first.");
    return;
  }

  let schoolCount = 0;
  let classCount = 0;
  let orderCount = 0;
  for (const school of schools) {
    const classes = await getClasses(supabase, school.id);
    if (classes.length === 0) continue;

    const productIds = await ensureProducts(supabase, school.id);
    for (const cls of classes) {
      const supplyListId = await ensureSupplyList(supabase, school.id, cls, productIds);
      await ensurePack(supabase, school.id, cls, supplyListId, "essential", productIds);
      await ensurePack(supabase, school.id, cls, supplyListId, "recommended", productIds);
      await ensurePack(supabase, school.id, cls, supplyListId, "premium", productIds);
      classCount += 1;
    }
    orderCount += await seedOrders(supabase, school.id, classes);
    schoolCount += 1;
  }

  console.log(`[seed:store] Done: ${schoolCount} school(s), ${classCount} class list(s), ${orderCount} demo order(s).`);
}

main().catch((error) => {
  console.error("[seed:store] Fatal:", error);
  process.exit(1);
});
