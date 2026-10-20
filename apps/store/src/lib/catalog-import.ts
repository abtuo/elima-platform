import ExcelJS from "exceljs";
import { importFields, MAX_IMPORT_BYTES, MAX_IMPORT_ROWS, type ColumnMapping, type ImportField } from "./catalog-import-fields";
export { importFields, MAX_IMPORT_BYTES, MAX_IMPORT_ROWS } from "./catalog-import-fields";
export type { ColumnMapping, ImportField } from "./catalog-import-fields";
export const allowedGradeSlugs = ["cp1", "cp2", "ce1", "ce2", "cm1", "cm2", "6e", "5e", "4e", "3e", "2nde", "1re", "terminale"] as const;
export const availabilityValues = ["in_stock", "available_on_order", "out_of_stock", "unavailable"] as const;

export type NormalizedImportRow = {
  rowNumber: number; productName: string; productSlug: string; description: string; categorySlug: string; brand?: string;
  productType: "physical" | "book" | "digital"; sku: string; variantName: string; price: number; promotion?: number;
  purchaseCost?: number; stock: number; availability: typeof availabilityValues[number]; status: "draft"; gradeSlugs: string[];
  imageReference?: string; errors: string[]; warnings: string[];
};
export type NormalizedKitRow = { rowNumber: number; slug: string; name: string; description: string; gradeSlug: string; pricingStrategy: "fixed"|"sum_components"; fixedPrice?: number; availability: typeof availabilityValues[number]; items: Array<{ sku:string; quantity:number }>; errors:string[] };
export type NormalizedCategoryRow = { slug:string; name:string; parentSlug?:string; description:string; sortOrder:number; active:boolean };

export type ParsedImport = { headers: string[]; rows: NormalizedImportRow[]; kits: NormalizedKitRow[]; categories:NormalizedCategoryRow[]; mapping: ColumnMapping; formulaCells: string[]; format: "csv" | "xlsx" };

const aliases: Record<ImportField, string[]> = {
  product_name: ["nom", "nom_produit", "produit", "product_name"], product_slug: ["slug", "product_slug", "slug_produit"],
  description: ["description"], category_slug: ["categorie", "catégorie", "category", "category_slug", "categorie_slug"],
  brand: ["marque", "brand"], product_type: ["type", "product_type"], sku: ["sku", "reference", "référence"],
  variant_name: ["variante", "variant_name", "nom_variante"], price_xof: ["prix", "prix_public", "prix_xof", "price_xof"],
  promotion_xof: ["prix_promotionnel", "promotion_xof", "promo"], purchase_cost_xof: ["cout_achat", "coût_achat", "purchase_cost_xof"],
  stock: ["stock", "quantite", "quantité"], availability: ["disponibilite", "disponibilité", "availability"],
  status: ["statut", "status"], grade_slugs: ["classes", "niveaux", "grade_slugs"], image_reference: ["image", "image_reference", "reference_image"],
};

const cleanHeader = (value: unknown) => String(value ?? "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
const cleanText = (value: unknown, max = 5000) => String(value ?? "").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "").trim().slice(0, max);
export function safeSpreadsheetText(value: unknown) { const text = cleanText(value); return /^[\s]*[=+@]/.test(text) || /^[\s]*-[^0-9]/.test(text) ? `'${text}` : text; }
const looksLikeFormula = (value: unknown) => typeof value === "string" && (/^[\s]*[=+@]/.test(value) || /^[\s]*-[^0-9]/.test(value));
export function slugifyImport(value: string) { return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[’']/g, "-").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 120); }

export function suggestMapping(headers: string[]): ColumnMapping {
  const result: ColumnMapping = {};
  for (const [field] of importFields) {
    const accepted = new Set(aliases[field].map(cleanHeader));
    const header = headers.find((candidate) => accepted.has(cleanHeader(candidate)));
    if (header) result[field] = header;
  }
  return result;
}

function integer(value: unknown): number | undefined {
  if (value === "" || value === null || value === undefined) return undefined;
  const number = typeof value === "number" ? value : Number(String(value).replace(/\s/g, "").replace(",", "."));
  return Number.isSafeInteger(number) ? number : undefined;
}

function normalizeFlatRows(rawRows: Record<string, unknown>[], _headers: string[], mapping: ColumnMapping): NormalizedImportRow[] {
  const get = (row: Record<string, unknown>, field: ImportField) => mapping[field] ? row[mapping[field]!] : undefined;
  const duplicateSkus = new Set<string>(); const seen = new Set<string>();
  const rows: NormalizedImportRow[] = rawRows.slice(0, MAX_IMPORT_ROWS).map((raw, index): NormalizedImportRow => {
    const productName = cleanText(get(raw, "product_name"), 160); const sku = cleanText(get(raw, "sku"), 80).toUpperCase();
    const price = integer(get(raw, "price_xof")); const promotion = integer(get(raw, "promotion_xof")); const stock = integer(get(raw, "stock"));
    const purchaseCost = integer(get(raw, "purchase_cost_xof")); const availability = cleanText(get(raw, "availability"), 40);
    const grades = cleanText(get(raw, "grade_slugs"), 300).split(/[;,|]/).map((v) => v.trim().toLowerCase()).filter(Boolean);
    const imageReference = cleanText(get(raw, "image_reference"), 500); const errors: string[] = []; const warnings: string[] = [];
    if (Object.values(raw).some(looksLikeFormula)) errors.push("Les valeurs de type formule ne sont pas acceptées.");
    if (!productName) errors.push("Nom du produit requis."); if (!sku) errors.push("SKU requis.");
    if (sku && seen.has(sku)) duplicateSkus.add(sku); seen.add(sku);
    const categorySlug = slugifyImport(cleanText(get(raw, "category_slug"), 120)); if (!categorySlug) errors.push("Catégorie requise.");
    const variantName = cleanText(get(raw, "variant_name"), 120); if (!variantName) errors.push("Nom de variante requis.");
    if (price === undefined || price < 0) errors.push("Prix public entier en FCFA requis.");
    if (promotion !== undefined && (promotion < 0 || (price !== undefined && promotion >= price))) errors.push("Le prix promotionnel doit être inférieur au prix public.");
    if (purchaseCost !== undefined && purchaseCost < 0) errors.push("Coût d’achat invalide.");
    if (stock === undefined || stock < 0) errors.push("Quantité entière positive ou nulle requise.");
    if (!availabilityValues.includes(availability as typeof availabilityValues[number])) errors.push("Disponibilité invalide.");
    if (availability === "in_stock" && stock === 0) errors.push("Un produit en stock doit avoir une quantité positive.");
    if (availability === "out_of_stock" && stock !== 0) errors.push("Une rupture doit avoir une quantité nulle.");
    const invalidGrades = grades.filter((grade) => !allowedGradeSlugs.includes(grade as typeof allowedGradeSlugs[number])); if (invalidGrades.length) errors.push(`Classes inconnues : ${invalidGrades.join(", ")}.`);
    if (imageReference && !/^(products\/[a-zA-Z0-9/_ .-]+\.(?:jpe?g|png|webp|avif)|https:\/\/[^\s]+)$/i.test(imageReference)) errors.push("Référence image invalide (chemin products/ ou URL HTTPS attendue).");
    if (!imageReference) warnings.push("Image manquante.");
    if (cleanText(get(raw, "status"), 20) && cleanText(get(raw, "status"), 20) !== "draft") warnings.push("Le statut est forcé à brouillon à l’import.");
    const productTypeRaw = cleanText(get(raw, "product_type"), 20) || "physical";
    const productType = (["physical", "book", "digital"].includes(productTypeRaw) ? productTypeRaw : "physical") as NormalizedImportRow["productType"];
    if (productTypeRaw !== productType) errors.push("Type de produit invalide.");
    return { rowNumber: index + 2, productName, productSlug: slugifyImport(cleanText(get(raw, "product_slug"), 120) || productName), description: cleanText(get(raw, "description")), categorySlug, brand: cleanText(get(raw, "brand"), 120) || undefined, productType, sku, variantName, price: price ?? -1, promotion, purchaseCost, stock: stock ?? -1, availability: availability as NormalizedImportRow["availability"], status: "draft" as const, gradeSlugs: [...new Set(grades)], imageReference: imageReference || undefined, errors, warnings };
  });
  for (const row of rows) if (duplicateSkus.has(row.sku)) row.errors.push("SKU dupliqué dans le fichier.");
  if (rawRows.length > MAX_IMPORT_ROWS) rows.push({ rowNumber: MAX_IMPORT_ROWS + 2, productName: "", productSlug: "", description: "", categorySlug: "", productType: "physical", sku: "", variantName: "", price: -1, stock: -1, availability: "unavailable", status: "draft", gradeSlugs: [], errors: [`Le fichier dépasse la limite de ${MAX_IMPORT_ROWS} lignes.`], warnings: [] });
  return rows;
}

function cellValue(value:ExcelJS.CellValue):unknown{
  if(value===null||value===undefined)return ""; if(value instanceof Date)return value.toISOString(); if(typeof value!=="object")return value;
  if("richText" in value)return value.richText.map((part)=>part.text).join(""); if("text" in value)return value.text; if("result" in value)return value.result??""; return String(value);
}

function sheetRows(worksheet?:ExcelJS.Worksheet):Record<string,unknown>[] {
  if(!worksheet||worksheet.actualRowCount<1)return[]; const headers:string[]=[];
  for(let column=1;column<=worksheet.actualColumnCount;column++)headers.push(cleanText(cellValue(worksheet.getRow(1).getCell(column).value),160));
  const result:Record<string,unknown>[]=[];
  for(let rowNumber=2;rowNumber<=worksheet.actualRowCount;rowNumber++){const record:Record<string,unknown>={};let populated=false;for(let column=1;column<=headers.length;column++){if(!headers[column-1])continue;const value=cellValue(worksheet.getRow(rowNumber).getCell(column).value);record[headers[column-1]]=value;if(value!=="")populated=true;}if(populated)result.push(record);} return result;
}

function formulas(workbook:ExcelJS.Workbook){const result:string[]=[];workbook.eachSheet((worksheet)=>worksheet.eachRow((row)=>row.eachCell((cell)=>{const value=cell.value;if(value&&typeof value==="object"&&"formula" in value)result.push(`${worksheet.name}!${cell.address}`);})));return result.slice(0,20);}

function parseCsv(text:string):Record<string,unknown>[] {
  const firstLine=text.split(/\r?\n/,1)[0]??"";const delimiter=(firstLine.match(/;/g)?.length??0)>(firstLine.match(/,/g)?.length??0)?";":",";const matrix:string[][]=[];let row:string[]=[];let value="";let quoted=false;
  for(let index=0;index<text.length;index++){const char=text[index];if(char==='"'){if(quoted&&text[index+1]==='"'){value+='"';index++;}else quoted=!quoted;}else if(char===delimiter&&!quoted){row.push(value);value="";}else if((char==='\n'||char==='\r')&&!quoted){if(char==='\r'&&text[index+1]==='\n')index++;row.push(value);if(row.some((cell)=>cell!==""))matrix.push(row);row=[];value="";}else value+=char;}row.push(value);if(row.some((cell)=>cell!==""))matrix.push(row);if(!matrix.length)return[];const headers=matrix[0].map((item)=>cleanText(item,160));return matrix.slice(1).map((cells)=>Object.fromEntries(headers.map((header,index)=>[header,cells[index]??""])));
}

function rowsFromTemplate(workbook:ExcelJS.Workbook) {
  const products = sheetRows(workbook.getWorksheet("Produits"));
  const variants = sheetRows(workbook.getWorksheet("Variantes"));
  const compat = sheetRows(workbook.getWorksheet("Compatibilités scolaires"));
  const bySlug = new Map(products.map((row) => [cleanText(row.product_slug), row]));
  const grades = new Map<string, string[]>();
  for (const row of compat) { const slug = cleanText(row.product_slug); const grade = cleanText(row.grade_slug); if (slug && grade) grades.set(slug, [...(grades.get(slug) ?? []), grade]); }
  return variants.map((variant: Record<string, unknown>) => { const product = (bySlug.get(cleanText(variant.product_slug)) ?? {}) as Record<string, unknown>; const slug = cleanText(variant.product_slug); return {
    product_name: product.name, product_slug: slug, description: product.description, category_slug: product.category_slug, brand: product.brand,
    product_type: product.product_type, sku: variant.sku, variant_name: variant.variant_name, price_xof: variant.price_xof,
    promotion_xof: variant.promotion_xof, purchase_cost_xof: variant.purchase_cost_xof, stock: variant.stock, availability: variant.availability,
    status: product.status, grade_slugs: (grades.get(slug) ?? []).join(";"), image_reference: variant.image_reference,
  }; });
}

function kitsFromTemplate(workbook:ExcelJS.Workbook): NormalizedKitRow[] {
  const rawKits = sheetRows(workbook.getWorksheet("Kits"));
  const rawItems = sheetRows(workbook.getWorksheet("Composition des kits"));
  return rawKits.slice(0, MAX_IMPORT_ROWS).map((raw, index) => {
    const slug = slugifyImport(cleanText(raw.kit_slug,120)); const name=cleanText(raw.name,160); const gradeSlug=cleanText(raw.grade_slug,30).toLowerCase();
    const strategy = cleanText(raw.pricing_strategy,30) as "fixed"|"sum_components"; const fixedPrice=integer(raw.fixed_price_xof); const availability=cleanText(raw.availability,40) as NormalizedKitRow["availability"];
    const items = rawItems.filter((entry)=>cleanText(entry.kit_slug)===slug).map((entry)=>({sku:cleanText(entry.sku,80).toUpperCase(),quantity:integer(entry.quantity)??-1})); const errors:string[]=[];
    if(!slug||!name)errors.push("Slug et nom du kit requis."); if(!allowedGradeSlugs.includes(gradeSlug as typeof allowedGradeSlugs[number]))errors.push("Classe du kit invalide.");
    if(!["fixed","sum_components"].includes(strategy))errors.push("Stratégie de prix du kit invalide."); if(strategy==="fixed"&&(fixedPrice===undefined||fixedPrice<0))errors.push("Prix fixe du kit requis.");
    if(!availabilityValues.includes(availability))errors.push("Disponibilité du kit invalide."); if(!items.length)errors.push("Composition du kit requise."); if(items.some((entry)=>!entry.sku||entry.quantity<1))errors.push("SKU et quantité positive requis dans la composition.");
    return {rowNumber:index+2,slug,name,description:cleanText(raw.description),gradeSlug,pricingStrategy:strategy,fixedPrice,availability,items,errors};
  });
}

function categoriesFromTemplate(workbook:ExcelJS.Workbook):NormalizedCategoryRow[]{
  return sheetRows(workbook.getWorksheet("Catégories")).slice(0,MAX_IMPORT_ROWS).map((row,index)=>({slug:slugifyImport(cleanText(row.slug,120)),name:cleanText(row.name,160),parentSlug:slugifyImport(cleanText(row.parent_slug,120))||undefined,description:cleanText(row.description),sortOrder:integer(row.sort_order)??(index+1)*10,active:String(row.active).toLowerCase()!=="false"})).filter((row)=>row.slug&&row.name);
}

export async function parseCatalogFile(buffer: ArrayBuffer | Uint8Array, filename: string, customMapping?: ColumnMapping):Promise<ParsedImport> {
  const extension = filename.toLowerCase().split(".").pop(); if (extension !== "csv" && extension !== "xlsx") throw new Error("Format attendu : .csv ou .xlsx.");
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer); if (bytes.byteLength > MAX_IMPORT_BYTES) throw new Error("Le fichier dépasse 5 Mo.");
  if(extension==="xlsx"&&(bytes[0]!==0x50||bytes[1]!==0x4b))throw new Error("Le contenu ne correspond pas à un fichier XLSX.");
  if(extension==="csv"&&bytes.includes(0))throw new Error("Le contenu ne correspond pas à un fichier CSV texte.");
  let workbook:ExcelJS.Workbook|undefined;let formulaCells:string[]=[];let rawRows:Record<string,unknown>[];
  if(extension==="xlsx"){workbook=new ExcelJS.Workbook();const data=bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength) as ArrayBuffer;await workbook.xlsx.load(data);formulaCells=formulas(workbook);if(formulaCells.length)throw new Error(`Les formules ne sont pas acceptées (${formulaCells.join(", ")}).`);rawRows=workbook.getWorksheet("Produits")&&workbook.getWorksheet("Variantes")?rowsFromTemplate(workbook):sheetRows(workbook.worksheets[0]);}
  else rawRows=parseCsv(new TextDecoder("utf-8",{fatal:true}).decode(bytes));
  const headers = rawRows.length ? Object.keys(rawRows[0]) : [];
  const mapping = customMapping ?? suggestMapping(headers);
  const missing = importFields.filter((field) => field[2] && !mapping[field[0]]).map((field) => field[1]);
  if (missing.length) throw new Error(`Colonnes requises non associées : ${missing.join(", ")}.`);
  return { headers, mapping, rows: normalizeFlatRows(rawRows, headers, mapping), kits: workbook ? kitsFromTemplate(workbook) : [], categories:workbook?categoriesFromTemplate(workbook):[], formulaCells, format: extension };
}
