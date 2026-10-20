import Image from "next/image";
import Link from "next/link";
import { FileUp, Plus } from "lucide-react";
import { AdminEmpty, AdminPageHeader, StatusBadge } from "@/components/admin/AdminUI";
import { ProductActions } from "@/components/admin/ProductActions";
import { catalogRoles, requireStorePage } from "@/lib/admin-auth";
import { formatMoney } from "@/lib/domain";

type Params = Record<string, string | string[] | undefined>;
type Row = { id:string; name:string; slug:string; status:string; updatedAt:string; category:string; imagePath?:string; imageUrl?:string; sku?:string; price?:number; promotion?:number; stock?:number; availability?:string };

export default async function ProductsPage({ searchParams }: { searchParams: Promise<Params> }) {
  const raw = await searchParams; const q = String(raw.q ?? "").trim().slice(0, 100);
  const status = ["draft", "active", "archived"].includes(String(raw.statut)) ? String(raw.statut) : null;
  const categoryId = typeof raw.categorie === "string" && /^[0-9a-f-]{36}$/i.test(raw.categorie) ? raw.categorie : null;
  const sort = ["updated_desc", "created_desc", "name_asc"].includes(String(raw.tri)) ? String(raw.tri) : "updated_desc";
  const page = Math.max(1, Number(raw.page) || 1); const pageSize = 20; const { client } = await requireStorePage(catalogRoles);
  const [{ data }, { data: categories }] = await Promise.all([
    client.rpc("store_admin_products", { p_search:q||null, p_status:status, p_category_id:categoryId, p_sort:sort, p_offset:(page-1)*pageSize, p_limit:pageSize }),
    client.from("store_categories").select("id,name").order("name"),
  ]);
  const payload = (data ?? { items:[], total:0 }) as { items:Row[]; total:number }; const pageCount = Math.ceil(Number(payload.total) / pageSize);
  const href = (next:number) => { const params = new URLSearchParams(); if(q)params.set("q",q); if(status)params.set("statut",status); if(categoryId)params.set("categorie",categoryId); if(sort)params.set("tri",sort); params.set("page",String(next)); return `/admin/produits?${params}`; };
  return <>
    <AdminPageHeader title="Produits" description="Recherchez, publiez et maintenez le catalogue commercial." action={<div className="flex flex-wrap gap-2"><Link href="/admin/produits/importer" className="admin-secondary"><FileUp size={18}/>Importer des produits</Link><Link href="/admin/produits/nouveau" className="admin-primary"><Plus size={18}/>Nouveau produit</Link></div>}/>
    <form className="mb-5 grid gap-3 rounded-2xl border bg-white p-4 md:grid-cols-[1fr_auto_auto_auto]"><input name="q" defaultValue={q} placeholder="Nom ou SKU" className="admin-input"/><select name="categorie" defaultValue={categoryId??""} className="admin-input"><option value="">Toutes les catégories</option>{categories?.map((category)=><option key={category.id} value={category.id}>{category.name}</option>)}</select><select name="statut" defaultValue={status??""} className="admin-input"><option value="">Tous les statuts</option><option value="active">Publié</option><option value="draft">Brouillon</option><option value="archived">Archivé</option></select><button className="rounded-xl bg-slate-900 px-4 font-bold text-white">Filtrer</button></form>
    {payload.items.length ? <div className="overflow-x-auto rounded-2xl border bg-white"><table className="w-full min-w-[980px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-4">Produit</th><th>SKU</th><th>Catégorie</th><th>Prix</th><th>Disponibilité</th><th>Stock</th><th>Statut</th><th>Modification</th><th>Actions</th></tr></thead><tbody>{payload.items.map((row)=><tr key={row.id} className="border-t"><td className="p-4"><div className="flex items-center gap-3"><div className="relative h-11 w-11 overflow-hidden rounded-lg bg-slate-100">{(row.imageUrl||row.imagePath)&&<Image src={row.imageUrl||`/api/catalogue/media?path=${encodeURIComponent(row.imagePath!)}`} alt="" fill className="object-cover"/>}</div><strong>{row.name}</strong></div></td><td>{row.sku??"—"}</td><td>{row.category}</td><td>{row.price===undefined?"—":formatMoney({amount:Number(row.promotion??row.price),currency:"XOF"})}</td><td><StatusBadge status={row.availability??"unavailable"}/></td><td>{row.stock??"—"}</td><td><StatusBadge status={row.status}/></td><td>{new Intl.DateTimeFormat("fr-FR",{dateStyle:"short"}).format(new Date(row.updatedAt))}</td><td><ProductActions id={row.id} status={row.status}/></td></tr>)}</tbody></table></div> : <AdminEmpty>Aucun produit ne correspond à ces critères.</AdminEmpty>}
    {pageCount>1&&<div className="mt-5 flex justify-center gap-3">{page>1&&<Link href={href(page-1)} className="rounded-xl border bg-white px-4 py-2 text-sm font-bold">Précédent</Link>}<span className="py-2 text-sm text-slate-500">Page {page} sur {pageCount}</span>{page<pageCount&&<Link href={href(page+1)} className="rounded-xl border bg-white px-4 py-2 text-sm font-bold">Suivant</Link>}</div>}
  </>;
}
