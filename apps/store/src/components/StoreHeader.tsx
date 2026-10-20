"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Heart, Menu, Search, ShoppingBag, UserRound, X } from "lucide-react";
import { useStore } from "./StoreProvider";

const links = [{ href: "/", label: "Accueil" }, { href: "/catalogue", label: "Catalogue" }, { href: "/kits", label: "Kits scolaires" }, { href: "/catalogue?promotions=1", label: "Promotions" }, { href: "/catalogue?tri=nouveautes", label: "Nouveautés" }, { href: "/mes-enfants", label: "Mes enfants" }];

export function StoreHeader({ catalogMode }: { catalogMode: "database" | "demo" }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const { cartCount, favorites } = useStore();
  const pathname = usePathname();
  const router = useRouter();
  function submit(event: FormEvent) { event.preventDefault(); router.push(`/catalogue?q=${encodeURIComponent(query)}`); setOpen(false); }
  return <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
    <div className="bg-[#173f2e] py-2 text-center text-xs font-semibold text-white">{catalogMode === "demo" ? "Aperçu de développement · Catalogue de démonstration" : "Catalogue Elima Store en préparation"} · Aucun paiement activé</div>
    <div className="store-shell flex min-h-18 items-center gap-3 py-3">
      <Link href="/" className="shrink-0" aria-label="Accueil Elima Store"><Image src="/logo.png" alt="Elima" width={145} height={50} className="h-11 w-auto" priority /></Link>
      <span className="hidden border-l border-slate-200 pl-3 text-sm font-bold text-[#1a5f3f] sm:block">STORE</span>
      <form onSubmit={submit} className="mx-auto hidden w-full max-w-xl md:flex"><label htmlFor="store-search" className="sr-only">Rechercher un produit</label><input id="store-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cahiers, sac, calculatrice…" className="min-w-0 flex-1 rounded-l-xl border border-r-0 border-slate-300 bg-slate-50 px-4 text-sm" /><button className="grid h-12 w-13 place-items-center rounded-r-xl bg-[#2e8b57] text-white" aria-label="Rechercher"><Search size={20} /></button></form>
      <div className="ml-auto flex items-center gap-1">
        <Link href="/compte#favoris" className="relative grid h-11 w-11 place-items-center rounded-xl hover:bg-slate-100" aria-label="Favoris"><Heart size={21} /><span className="absolute right-1 top-0 text-[10px] font-bold text-[#2e8b57]">{favorites.length || ""}</span></Link>
        <Link href="/compte" className="hidden items-center gap-2 rounded-xl px-2 py-2 hover:bg-slate-100 sm:flex"><UserRound size={21} /><span className="text-xs"><b className="block">Mon compte</b>Connexion</span></Link>
        <Link href="/panier" className="relative grid h-11 w-11 place-items-center rounded-xl bg-[#edf8f1] text-[#1a5f3f]" aria-label={`Panier, ${cartCount} article(s)`}><ShoppingBag size={21} />{cartCount > 0 && <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-[#ffd700] px-1 text-[10px] font-extrabold text-slate-900">{cartCount}</span>}</Link>
        <button onClick={() => setOpen(!open)} className="grid h-11 w-11 place-items-center rounded-xl md:hidden" aria-label="Menu" aria-expanded={open}>{open ? <X /> : <Menu />}</button>
      </div>
    </div>
    <div className="store-shell pb-3 md:hidden"><form onSubmit={submit} className="flex"><input value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Rechercher" placeholder="Rechercher dans la boutique" className="h-11 min-w-0 flex-1 rounded-l-xl border border-r-0 border-slate-300 bg-slate-50 px-4 text-sm" /><button className="grid w-12 place-items-center rounded-r-xl bg-[#2e8b57] text-white"><Search size={19} /></button></form></div>
    <nav className={`${open ? "block" : "hidden"} border-t border-slate-100 md:block`}><div className="store-shell flex flex-col gap-1 py-2 text-sm font-semibold md:flex-row md:items-center md:gap-7 md:overflow-x-auto">{links.map((link) => <Link key={link.href} href={link.href} onClick={() => setOpen(false)} className={`whitespace-nowrap rounded-lg px-2 py-2 ${pathname === link.href ? "text-[#2e8b57]" : "text-slate-600 hover:text-slate-950"}`}>{link.label}</Link>)}<Link href="/catalogue?niveau=primaire" className="md:ml-auto rounded-lg px-2 py-2 text-slate-600">Primaire</Link><Link href="/catalogue?niveau=college" className="rounded-lg px-2 py-2 text-slate-600">Secondaire</Link></div></nav>
  </header>;
}
