import type { CartItem } from "./domain";

function isCartItem(value: unknown): value is CartItem {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<CartItem>;
  return typeof item.productId === "string"
    && typeof item.variantId === "string"
    && typeof item.quantity === "number"
    && Number.isInteger(item.quantity)
    && item.quantity > 0
    && typeof item.name === "string"
    && typeof item.variantName === "string"
    && typeof item.slug === "string"
    && typeof item.unitPrice?.amount === "number"
    && item.unitPrice.currency === "XOF"
    && typeof item.availability === "string"
    && typeof item.isDemo === "boolean";
}

export function parseStoredCart(raw: string | null): CartItem[] {
  if (!raw) return [];
  try {
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value) ? value.filter(isCartItem).map((item) => ({ ...item, quantity: Math.min(99, item.quantity) })) : [];
  } catch {
    return [];
  }
}

export function addCartItem(items: CartItem[], item: Omit<CartItem, "quantity">, quantity = 1): CartItem[] {
  const safeQuantity = Math.min(99, Math.max(1, quantity));
  const existing = items.find((line) => line.productId === item.productId && line.variantId === item.variantId);
  if (!existing) return [...items, { ...item, quantity: safeQuantity }];
  return items.map((line) => line.productId === item.productId && line.variantId === item.variantId ? { ...line, quantity: Math.min(99, line.quantity + safeQuantity) } : line);
}

export function updateCartQuantity(items: CartItem[], productId: string, variantId: string, quantity: number): CartItem[] {
  if (quantity <= 0) return items.filter((item) => item.productId !== productId || item.variantId !== variantId);
  return items.map((item) => item.productId === productId && item.variantId === variantId ? { ...item, quantity: Math.min(99, quantity) } : item);
}
