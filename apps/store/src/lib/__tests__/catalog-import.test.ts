import assert from "node:assert/strict";
import test from "node:test";
import ExcelJS from "exceljs";
import { catalogCandidates, kitCandidates } from "../../data/initial-catalog";
import { buildCatalogTemplate } from "../catalog-template";
import { parseCatalogFile, safeSpreadsheetText } from "../catalog-import";

const encoder = new TextEncoder();
const header = "product_name,category_slug,sku,variant_name,price_xof,stock,availability,grade_slugs";

test("le catalogue de travail contient exactement 100 références et 15 kits candidats", () => {
  assert.equal(catalogCandidates.length, 100); assert.equal(new Set(catalogCandidates.map((item) => item.sku)).size, 100);
  assert.equal(kitCandidates.length, 15); assert.ok(catalogCandidates.every((item) => item.name && item.categorySlug && item.gradeSlugs.length));
  assert.ok(kitCandidates.every((kit) => kit.items.length > 0 && kit.description.includes("non officielle") || kit.description.includes("valider") || kit.description.includes("sans caractère officiel")));
});

test("le modèle XLSX expose les sept onglets et conserve les données commerciales vides", async () => {
  const buffer = await buildCatalogTemplate(); const workbook = new ExcelJS.Workbook(); await workbook.xlsx.load(buffer.buffer.slice(buffer.byteOffset,buffer.byteOffset+buffer.byteLength) as ArrayBuffer);
  assert.deepEqual(workbook.worksheets.map((sheet)=>sheet.name), ["Instructions","Produits","Variantes","Catégories","Compatibilités scolaires","Kits","Composition des kits"]);
  const variants=workbook.getWorksheet("Variantes")!; assert.equal(variants.actualRowCount-1,100);
  for(let row=2;row<=variants.actualRowCount;row++){assert.equal(variants.getRow(row).getCell(4).value,"");assert.equal(variants.getRow(row).getCell(7).value,"");assert.equal(variants.getRow(row).getCell(8).value,"");}
  const parsed=await parseCatalogFile(buffer,"modele.xlsx"); assert.equal(parsed.rows.length,100); assert.equal(parsed.kits.length,15); assert.ok(parsed.rows.every((row)=>row.errors.length>0));
});

test("un CSV valide est normalisé sans publication automatique", async () => {
  const csv=`${header}\nCahier test,cahiers-et-papiers,SKU-001,100 pages,1000,4,in_stock,cm1;cm2`;
  const parsed=await parseCatalogFile(encoder.encode(csv),"catalogue.csv"); assert.equal(parsed.rows.length,1); assert.deepEqual(parsed.rows[0].errors,[]); assert.equal(parsed.rows[0].status,"draft"); assert.deepEqual(parsed.rows[0].gradeSlugs,["cm1","cm2"]);
});

test("les erreurs, niveaux inconnus et SKU dupliqués sont signalés", async () => {
  const csv=`${header}\nProduit,cahiers-et-papiers,DUP,Simple,1000,0,in_stock,inconnu\nProduit 2,ecriture,DUP,Simple,,2,in_stock,cp1`;
  const parsed=await parseCatalogFile(encoder.encode(csv),"catalogue.csv"); assert.equal(parsed.rows.filter((row)=>row.errors.length).length,2); assert.ok(parsed.rows.every((row)=>row.errors.some((error)=>error.includes("dupliqué"))));
});

test("les formules et injections tableur sont refusées ou neutralisées", async () => {
  const csv=`${header}\n=CMD(),ecriture,SKU-002,Simple,1000,2,in_stock,cp1`; const parsed=await parseCatalogFile(encoder.encode(csv),"catalogue.csv");
  assert.ok(parsed.rows[0].errors.some((error)=>error.includes("formule"))); assert.equal(safeSpreadsheetText("=2+2"),"'=2+2");
});

test("la validation de 100 références reste bornée", async () => {
  const lines=Array.from({length:100},(_,index)=>`Produit ${index},ecriture,PERF-${index},Simple,1000,2,in_stock,cp1`); const start=performance.now(); const parsed=await parseCatalogFile(encoder.encode([header,...lines].join("\n")),"catalogue.csv");
  assert.equal(parsed.rows.length,100); assert.ok(performance.now()-start<2000);
});
