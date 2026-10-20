import Link from "next/link";
import { ArrowRight, BadgeCheck, Headphones, PackageCheck, ShieldCheck, Truck } from "lucide-react";
import { ProductCard } from "@/components/ProductCard";
import { SectionTitle } from "@/components/SectionTitle";
import { CatalogUnavailableError, listCategories, listKits, listProducts } from "@/lib/catalog-repository";
import { formatMoney, type Category, type Kit, type Product } from "@/lib/domain";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let unavailable = false;
  let source: "database" | "demo" = "database";
  let categories: Category[] = [];
  let popular: Product[] = [];
  let newest: Product[] = [];
  let promotions: Product[] = [];
  let kits: Kit[] = [];
  try {
    const [categoryData, popularData, newestData, promotionData, kitData] = await Promise.all([
      listCategories(),
      listProducts({ sort: "popularite", page: 1, pageSize: 4 }),
      listProducts({ sort: "nouveautes", page: 1, pageSize: 4 }),
      listProducts({ promotions: true, sort: "nouveautes", page: 1, pageSize: 4 }),
      listKits(),
    ]);
    categories = categoryData; popular = popularData.items; newest = newestData.items; promotions = promotionData.items; kits = kitData.items.slice(0, 3); source = popularData.source;
  } catch (error) {
    if (!(error instanceof CatalogUnavailableError)) throw error;
    unavailable = true;
  }

  return <>
    <section className="store-shell pt-6 md:pt-10">
      <div className="store-hero relative isolate overflow-hidden rounded-[2rem] border border-emerald-950/5 shadow-[0_24px_70px_rgba(23,63,46,.12)]">
        <div className="store-hero-overlay absolute inset-0 -z-10" aria-hidden="true" />
        <div className="max-w-[650px] px-6 pb-[21rem] pt-9 sm:px-10 md:px-14 md:py-16 lg:py-[4.5rem]">
          <p className="text-xs font-extrabold uppercase tracking-[.22em] text-[#1a5f3f]">Elima Store</p>
          <h1 className="mt-4 max-w-[620px] text-4xl font-bold leading-[1.06] text-[#173f2e] sm:text-5xl lg:text-[3.65rem]">
            Tout pour une<br /><span className="text-[#2e8b57]">rentrée réussie.</span>
          </h1>
          <p className="mt-5 max-w-[540px] text-base leading-7 text-slate-700 sm:text-lg">Fournitures, kits scolaires, manuels et ressources pour le primaire et le secondaire.</p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link href="/catalogue" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#2e8b57] px-5 py-3 font-bold text-white shadow-[0_10px_24px_rgba(46,139,87,.22)] hover:-translate-y-0.5 hover:bg-[#247548]">Explorer le catalogue <ArrowRight size={18} aria-hidden="true" /></Link>
            <Link href="/kits" className="inline-flex min-h-12 items-center justify-center rounded-xl border-2 border-[#2e8b57] bg-white/70 px-5 py-3 font-bold text-[#1a5f3f] backdrop-blur-sm hover:bg-[#edf8f1]">Voir les kits</Link>
          </div>
          <div className="mt-7 grid gap-3 border-t border-[#1a5f3f]/15 pt-5 text-sm font-semibold text-slate-700 sm:grid-cols-3">
            <span className="flex items-center gap-2"><Truck size={18} className="shrink-0 text-[#2e8b57]" aria-hidden="true" />Livraison à Abidjan</span>
            <span className="flex items-center gap-2"><BadgeCheck size={18} className="shrink-0 text-[#2e8b57]" aria-hidden="true" />Produits de qualité</span>
            <span className="flex items-center gap-2"><Headphones size={18} className="shrink-0 text-[#2e8b57]" aria-hidden="true" />Une équipe à votre écoute</span>
          </div>
        </div>
      </div>
    </section>
    {unavailable ? <Unavailable /> : <>
      <section className="store-shell py-16"><SectionTitle eyebrow={source === "demo" ? "Aperçu de développement" : "Explorer"} title="Catégories populaires" /><div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">{categories.filter((category) => category.parentId).slice(0, 6).map((category) => <Link key={category.id} href={`/catalogue?categorie=${category.slug}`} className="store-card group p-4 text-center hover:-translate-y-1"><span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-[#edf8f1] text-3xl">{category.icon ?? "📦"}</span><span className="mt-3 block text-sm font-semibold">{category.name}</span></Link>)}</div></section>
      <section className="bg-white py-16"><div className="store-shell"><SectionTitle eyebrow="Les incontournables" title="Produits populaires" href="/catalogue" />{popular.length ? <div className="grid grid-cols-2 gap-4 md:grid-cols-4">{popular.map((product) => <ProductCard key={product.id} product={product} />)}</div> : <EmptyCatalogue />}</div></section>
      <section className="store-shell py-16"><SectionTitle eyebrow="Prêts pour la classe" title="Kits scolaires par niveau" href="/kits" />{kits.length ? <div className="grid gap-4 md:grid-cols-3">{kits.map((kit) => <article key={kit.id} className="store-card p-6"><span className="text-4xl">📦</span>{kit.isDemo && <p className="mt-3 text-xs font-bold uppercase text-amber-700">Démonstration</p>}<h3 className="mt-3 text-xl font-bold">{kit.name}</h3><p className="mt-2 text-sm text-slate-600">{kit.description}</p>{kit.price && <p className="mt-5 text-xl font-bold text-[#173f2e]">{formatMoney(kit.price)}</p>}</article>)}</div> : <EmptyCatalogue />}</section>
      {newest.length > 0 && <section className="store-shell pb-16"><SectionTitle eyebrow="Nouveautés" title="Derniers produits publiés" /><div className="grid grid-cols-2 gap-4 md:grid-cols-4">{newest.map((product) => <ProductCard key={product.id} product={product} />)}</div></section>}
      {promotions.length > 0 && <section className="store-shell pb-16"><SectionTitle eyebrow="Offres actives" title="Promotions" href="/catalogue?promotions=1" /><div className="grid grid-cols-2 gap-4 md:grid-cols-4">{promotions.map((product) => <ProductCard key={product.id} product={product} />)}</div></section>}
    </>}
    <Benefits />
  </>;
}

function EmptyCatalogue() { return <div className="store-card p-8 text-center text-slate-500">Aucun article publié pour le moment.</div>; }
function Unavailable() { return <section className="store-shell py-16"><div className="store-card p-10 text-center"><h2 className="text-2xl font-bold">Le catalogue est temporairement indisponible</h2><p className="mt-3 text-slate-600">Aucune offre fictive n’est substituée aux données commerciales.</p></div></section>; }
function Benefits() { const items = [[Truck, "Livraison préparée", "Architecture prête pour la future logistique"], [ShieldCheck, "Catalogue sécurisé", "Lecture publique, écritures réservées"], [PackageCheck, "Kits par niveau", "Composition persistante et prix explicite"], [BadgeCheck, "Vendeur Elima", "Modèle prêt pour le multi-vendeurs"]] as const; return <section className="border-y border-slate-200 bg-white py-12"><div className="store-shell grid gap-8 sm:grid-cols-2 lg:grid-cols-4">{items.map(([Icon, title, text]) => <div key={title} className="flex gap-3"><Icon className="shrink-0 text-[#2e8b57]" /><div><h3 className="font-bold">{title}</h3><p className="mt-1 text-sm text-slate-500">{text}</p></div></div>)}</div></section>; }
