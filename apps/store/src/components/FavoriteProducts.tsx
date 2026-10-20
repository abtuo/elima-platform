"use client";
import { useEffect, useState } from "react";
import { Heart, LoaderCircle } from "lucide-react";
import { ProductCard } from "./ProductCard";
import type { Product } from "@/lib/domain";

export function FavoriteProducts({ ids }: { ids: string[] }) {
  const [items, setItems] = useState<Product[]>([]); const [loading, setLoading] = useState(ids.length > 0); const [failed, setFailed] = useState(false);
  useEffect(() => { if (!ids.length) return; const controller = new AbortController(); fetch(`/api/catalogue/products?ids=${encodeURIComponent(ids.join(","))}`, { signal: controller.signal }).then((response) => { if (!response.ok) throw new Error("catalog"); return response.json(); }).then((data) => setItems(data.items ?? [])).catch((error) => { if (error.name !== "AbortError") setFailed(true); }).finally(() => setLoading(false)); return () => controller.abort(); }, [ids]);
  return <section id="favoris" className="mt-14 scroll-mt-40"><div className="mb-5 flex items-center gap-3"><Heart className="text-[#2e8b57]" /><h2 className="text-2xl font-bold">Mes favoris</h2></div>{loading ? <div className="store-card grid place-items-center p-8"><LoaderCircle className="animate-spin" /></div> : failed ? <div className="store-card p-8 text-center text-slate-500">Les favoris ne peuvent pas être chargés actuellement.</div> : items.length ? <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">{items.map((item) => <ProductCard key={item.id} product={item} />)}</div> : <div className="store-card p-8 text-center text-slate-500">Vous n’avez pas encore ajouté de favori disponible.</div>}</section>;
}
