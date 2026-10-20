import ExcelJS from "exceljs";
import { catalogCandidates, kitCandidates, slugify } from "@/data/initial-catalog";
import { safeSpreadsheetText } from "./catalog-import";

const categories = [
  ["cahiers-et-papiers", "Cahiers et papiers"], ["ecriture", "Écriture"], ["geometrie", "Géométrie"],
  ["calculatrices", "Calculatrices"], ["dessin-et-arts", "Dessin et arts"], ["classement-et-accessoires", "Classement et accessoires"],
  ["sacs-et-accessoires", "Sacs et trousses"], ["livres-et-manuels", "Manuels et annales"],
] as const;

function addSheet(workbook:ExcelJS.Workbook,name:string,rows:Record<string,unknown>[]){
  const worksheet=workbook.addWorksheet(name,{views:[{state:"frozen",ySplit:1}]}); const keys=Object.keys(rows[0]??{});worksheet.columns=keys.map((key)=>({header:key,key,width:Math.min(55,Math.max(14,key.length+3))}));worksheet.addRows(rows);worksheet.autoFilter={from:{row:1,column:1},to:{row:Math.max(1,worksheet.rowCount),column:Math.max(1,keys.length)}};worksheet.getRow(1).font={bold:true,color:{argb:"FFFFFFFF"}};worksheet.getRow(1).fill={type:"pattern",pattern:"solid",fgColor:{argb:"FF2E8B57"}};return worksheet;
}

export async function buildCatalogTemplate():Promise<Buffer>{
  const workbook=new ExcelJS.Workbook();workbook.creator="Elima Store";workbook.created=new Date(0);
  addSheet(workbook,"Instructions",[
    { Étape: 1, Instruction: "Compléter prix, stock et disponibilité avec des données commerciales validées." },
    { Étape: 2, Instruction: "Conserver les SKU uniques. Les références CAND-xxx sont provisoires et peuvent être remplacées avant import." },
    { Étape: 3, Instruction: "Ne jamais saisir de formule. Les produits importés restent en brouillon." },
    { Étape: 4, Instruction: "Téléverser le fichier dans Administration > Produits > Importer." },
    { Étape: 5, Instruction: "Choisir explicitement Ignorer ou Mettre à jour pour les SKU existants." },
    { Étape: 6, Instruction: "Les kits proposés sont génériques et ne constituent pas des listes officielles d’établissement." },
  ]);
  addSheet(workbook,"Produits",catalogCandidates.map((product)=>({product_slug:slugify(product.name),name:safeSpreadsheetText(product.name),description:safeSpreadsheetText(product.description),short_description:"",category_slug:product.categorySlug,brand:"",product_type:product.productType,status:"draft",seller_slug:"elima-store"})));
  addSheet(workbook,"Variantes",catalogCandidates.map((product)=>({product_slug:slugify(product.name),sku:product.sku,variant_name:"Variante à préciser",price_xof:"",promotion_xof:"",purchase_cost_xof:"",stock:"",availability:"",low_stock_threshold:"",image_reference:""})));
  addSheet(workbook,"Catégories",categories.map(([slug,name],index)=>({slug,name,parent_slug:"fournitures-scolaires",description:"",sort_order:(index+1)*10,active:true})));
  addSheet(workbook,"Compatibilités scolaires",catalogCandidates.flatMap((product)=>product.gradeSlugs.map((grade)=>({product_slug:slugify(product.name),grade_slug:grade,series_slug:""}))));
  addSheet(workbook,"Kits",kitCandidates.map((kit)=>({kit_slug:kit.slug,name:kit.name,description:kit.description,grade_slug:kit.gradeSlug,series_slug:"",pricing_strategy:"sum_components",fixed_price_xof:"",availability:"unavailable",status:"draft"})));
  addSheet(workbook,"Composition des kits",kitCandidates.flatMap((kit)=>kit.items.map((entry,index)=>({kit_slug:kit.slug,sku:entry.sku,quantity:entry.quantity,sort_order:index+1}))));
  const data=await workbook.xlsx.writeBuffer({useStyles:true,useSharedStrings:true});return Buffer.from(data);
}
