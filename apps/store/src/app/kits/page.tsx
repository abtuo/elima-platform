import Link from "next/link";
import { Check } from "lucide-react";
import { KitAddButton } from "@/components/KitAddButton";
import { CatalogUnavailableError, listKits } from "@/lib/catalog-repository";
import { formatMoney, type Kit, type SchoolLevel } from "@/lib/domain";

export const dynamic = "force-dynamic";
const labels: Record<SchoolLevel, string> = { primaire: "Primaire", college: "Collège", lycee: "Lycée" };

async function load(level: SchoolLevel): Promise<{ items: Kit[] } | null> {
  try { return await listKits(level); } catch (error) { if (error instanceof CatalogUnavailableError) return null; throw error; }
}

export default async function KitsPage({ searchParams }: { searchParams: Promise<{ niveau?: string }> }) {
  const raw = (await searchParams).niveau;
  const level: SchoolLevel = ["primaire", "college", "lycee"].includes(raw || "") ? raw as SchoolLevel : "primaire";
  const result = await load(level);
  if (!result) return <div className="store-shell py-20 text-center"><h1 className="text-3xl font-bold">Kits temporairement indisponibles</h1><p className="mt-3 text-slate-500">Notre équipe fait le nécessaire pour les rendre à nouveau accessibles.</p></div>;
  return <div className="store-shell py-10">
    <p className="text-xs font-bold uppercase tracking-[.2em] text-[#2e8b57]">Kits scolaires</p><h1 className="mt-2 text-4xl font-bold">Une base claire pour chaque classe</h1><p className="mt-3 max-w-2xl text-slate-600">Des compositions prêtes à commander, avec prix et disponibilité revérifiés avant confirmation.</p>
    <nav className="my-8 flex gap-2 overflow-x-auto pb-2">{(Object.keys(labels) as SchoolLevel[]).map((key) => <Link key={key} href={`/kits?niveau=${key}`} className={`rounded-full px-5 py-2.5 text-sm font-bold ${level === key ? "bg-[#2e8b57] text-white" : "border border-slate-200 bg-white"}`}>{labels[key]}</Link>)}</nav>
    {result.items.length ? <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">{result.items.map((kit) => <article key={kit.id} className="store-card p-6"><span className="grid h-14 w-14 place-items-center rounded-2xl bg-[#edf8f1] text-3xl">📦</span><h2 className="mt-5 text-xl font-bold">{kit.name}</h2><p className="mt-2 text-sm leading-6 text-slate-600">{kit.description}</p><p className="mt-4 flex gap-2 text-sm text-slate-600"><Check size={17} className="text-[#2e8b57]" />{kit.items.length} référence(s) dans la composition</p><div className="mt-6 flex items-center justify-between gap-3"><span className="text-xl font-bold text-[#173f2e]">{kit.price ? formatMoney(kit.price) : "Calculé au panier"}</span><KitAddButton kit={kit} /></div></article>)}</div> : <div className="store-card p-12 text-center"><h2 className="text-xl font-bold">Aucun kit disponible</h2><p className="mt-2 text-slate-500">Revenez bientôt pour découvrir les kits de ce niveau.</p></div>}
  </div>;
}
