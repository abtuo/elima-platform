import Link from "next/link";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminUI";
import { catalogRoles, requireStorePage } from "@/lib/admin-auth";

type Item = { id?: string; name?: string; sku?: string; count?: number };
type Report = Record<"productsWithoutImage"|"productsWithoutPrice"|"productsWithoutVariant"|"productsUnavailable"|"publishedInconsistencies"|"kitsWithMissingItems"|"duplicateSkus", Item[]>;
const sections: Array<[keyof Report,string,string]> = [
  ["publishedInconsistencies","Produits publiés incohérents","À corriger en priorité : image, variante, catégorie ou disponibilité."],
  ["productsWithoutImage","Produits sans image","Ajoutez une photographie autorisée et un texte alternatif."],
  ["productsWithoutPrice","Produits sans prix valide","Renseignez un prix commercial validé."],
  ["productsWithoutVariant","Produits sans variante valide","Ajoutez au moins une variante active."],
  ["productsUnavailable","Approvisionnement non validé","Ces produits ne sont pas considérés comme achetables."],
  ["kitsWithMissingItems","Kits sans composition","Ajoutez des produits existants au kit."],
  ["duplicateSkus","SKU dupliqués","Chaque SKU doit identifier une seule variante."],
];

export default async function QualityPage() {
  const { client } = await requireStorePage(catalogRoles); const { data, error } = await client.rpc("store_catalog_quality_report"); const report = (data ?? {}) as Partial<Report>;
  return <><AdminPageHeader title="Qualité du catalogue" description="Contrôles de complétude avant publication. Le statut et la disponibilité existants déterminent la préparation commerciale." />{error&&<div className="mb-4 rounded-xl bg-red-50 p-4 text-red-700">Le rapport nécessite la migration Phase 2C.</div>}<div className="grid gap-4 xl:grid-cols-2">{sections.map(([key,title,help])=>{const items=report[key]??[];return <section key={key} className="admin-panel"><div className="flex items-start justify-between gap-3"><div><h2 className="font-bold text-[#173f2e]">{title}</h2><p className="mt-1 text-sm text-slate-500">{help}</p></div>{items.length?<span className="flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-xs font-bold text-red-700"><AlertCircle size={14}/>{items.length}</span>:<CheckCircle2 className="text-emerald-600"/>}</div>{items.length>0&&<ul className="mt-4 divide-y text-sm">{items.slice(0,10).map((item,index)=><li key={item.id??item.sku??index} className="flex items-center justify-between gap-3 py-2"><span>{item.name??item.sku}</span>{item.id?<Link href={`${key==="kitsWithMissingItems"?"/admin/kits":"/admin/produits"}/${item.id}`} className="font-bold text-[#2e8b57]">Corriger</Link>:<span>{item.count}</span>}</li>)}</ul>}</section>})}</div></>;
}
