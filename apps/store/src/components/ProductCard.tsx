"use client";

import Link from "next/link";
import { Heart, ShoppingBag } from "lucide-react";
import type { Product } from "@/lib/domain";
import { effectiveVariantPrice, formatMoney, isPurchasable } from "@/lib/domain";
import { useStore } from "./StoreProvider";
import { ProductVisual } from "./ProductVisual";

export function ProductCard({ product }: { product: Product }) {
  const { addToCart, favorites, toggleFavorite } = useStore();
  const liked = favorites.includes(product.id); const variant = product.variants.find((item) => item.id === product.defaultVariantId) ?? product.variants[0];
  const purchasable = variant && isPurchasable(variant.availability);
  const add = () => variant && addToCart({ productId: product.id, variantId: variant.id, name: product.name, variantName: variant.name, slug: product.slug, unitPrice: effectiveVariantPrice(variant), imageUrl: variant.imageUrl ?? product.imageUrl, imageEmoji: product.imageEmoji, availability: variant.availability, isDemo: product.isDemo });
  return <article className="store-card group overflow-hidden"><div className="product-art relative aspect-[4/3]"><Link href={`/produit/${product.slug}`} className="block h-full w-full" aria-label={product.name}><ProductVisual imageUrl={product.imageUrl} emoji={product.imageEmoji} alt={product.imageAlt} className="h-full w-full text-6xl transition-transform group-hover:scale-105" /></Link>{product.badge && <span className="absolute left-3 top-3 rounded-full bg-white px-3 py-1 text-[11px] font-bold text-[#1a5f3f] shadow-sm">{product.badge}</span>}<button onClick={() => toggleFavorite(product.id)} className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-white shadow-sm" aria-label={liked ? "Retirer des favoris" : "Ajouter aux favoris"}><Heart size={18} className={liked ? "fill-[#2e8b57] text-[#2e8b57]" : "text-slate-500"} /></button></div><div className="p-4">{product.isDemo && <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-amber-700">Démonstration</p>}<Link href={`/produit/${product.slug}`}><h3 className="line-clamp-2 min-h-12 font-semibold leading-6 text-slate-900 hover:text-[#2e8b57]">{product.name}</h3></Link><p className={`mt-1 text-xs font-semibold ${purchasable ? "text-emerald-700" : "text-slate-400"}`}>{variant?.availability === "in_stock" ? "En stock" : variant?.availability === "available_on_order" ? "Disponible sur commande" : variant?.availability === "demo" ? "Aperçu" : "Indisponible"}</p><div className="mt-3 flex items-center justify-between gap-2"><span className="font-bold text-[#173f2e]">{formatMoney(product.promotionalPrice ?? product.price)}</span><button onClick={add} disabled={!purchasable} className="grid h-10 w-10 place-items-center rounded-xl bg-[#2e8b57] text-white hover:scale-105 disabled:cursor-not-allowed disabled:bg-slate-200" aria-label={`Ajouter ${product.name} au panier`}><ShoppingBag size={18} /></button></div></div></article>;
}
