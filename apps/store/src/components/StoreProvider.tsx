"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { CartItem } from "@/lib/domain";
import { addCartItem, parseStoredCart, updateCartQuantity } from "@/lib/cart";

type StoreContextValue = {
  cart: CartItem[];
  favorites: string[];
  cartCount: number;
  addToCart: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  setQuantity: (productId: string, variantId: string, quantity: number) => void;
  removeFromCart: (productId: string, variantId: string) => void;
  clearCart: () => void;
  toggleFavorite: (productId: string) => void;
};
const StoreContext = createContext<StoreContextValue | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    queueMicrotask(() => {
      try {
        setCart(parseStoredCart(localStorage.getItem("elima-store-cart")));
        const storedFavorites: unknown = JSON.parse(localStorage.getItem("elima-store-favorites") || "[]");
        setFavorites(Array.isArray(storedFavorites) ? storedFavorites.filter((id): id is string => typeof id === "string") : []);
      } catch { /* ignore corrupt browser data */ }
      setReady(true);
    });
  }, []);
  useEffect(() => { if (ready) localStorage.setItem("elima-store-cart", JSON.stringify(cart)); }, [cart, ready]);
  useEffect(() => { if (ready) localStorage.setItem("elima-store-favorites", JSON.stringify(favorites)); }, [favorites, ready]);
  const value = useMemo<StoreContextValue>(() => ({
    cart,
    favorites,
    cartCount: cart.reduce((sum, item) => sum + item.quantity, 0),
    addToCart: (item, quantity = 1) => setCart((items) => addCartItem(items, item, quantity)),
    setQuantity: (productId, variantId, quantity) => setCart((items) => updateCartQuantity(items, productId, variantId, quantity)),
    removeFromCart: (productId, variantId) => setCart((items) => items.filter((item) => item.productId !== productId || item.variantId !== variantId)),
    clearCart: () => setCart([]),
    toggleFavorite: (productId) => setFavorites((ids) => ids.includes(productId) ? ids.filter((id) => id !== productId) : [...ids, productId]),
  }), [cart, favorites]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const value = useContext(StoreContext);
  if (!value) throw new Error("useStore must be used within StoreProvider");
  return value;
}
