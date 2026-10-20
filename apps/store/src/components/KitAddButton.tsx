"use client";
import { ShoppingBag } from "lucide-react";
import { useStore } from "./StoreProvider";
import type { Kit } from "@/lib/domain";

export function KitAddButton({ kit }: { kit: Kit }) {
  const { addToCart } = useStore();
  const active = kit.availability === "in_stock" || kit.availability === "available_on_order";
  return <button disabled={!active || kit.isDemo} onClick={() => addToCart({ itemType: "kit", kitId: kit.id, productId: kit.id, variantId: `kit:${kit.id}`, name: kit.name, variantName: `Kit ${kit.grade}`, slug: kit.slug, unitPrice: kit.price ?? { amount: 0, currency: "XOF" }, imageUrl: kit.imageUrl, imageEmoji: "📦", availability: kit.availability, isDemo: kit.isDemo })} className="inline-flex items-center gap-2 rounded-xl bg-[#2e8b57] px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-200"><ShoppingBag size={17} />Ajouter</button>;
}
