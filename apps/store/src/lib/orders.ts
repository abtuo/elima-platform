export type CheckoutCartLine = { itemType: "product" | "kit"; productId?: string; variantId?: string; kitId?: string; quantity: number };
export type CheckoutQuoteLine = { itemType: "product" | "kit"; productId?: string; variantId?: string; kitId?: string; name: string; variantName?: string; sku: string; quantity: number; unitPrice: number; lineTotal: number };
export type CheckoutQuote = { currency: "XOF"; subtotal: number; deliveryFee: number; total: number; deliveryMode: "home_delivery" | "pickup"; deliveryZoneName?: string; lines: CheckoutQuoteLine[] };

export const orderStatusLabels: Record<string,string> = {
  pending_confirmation: "À confirmer", confirmed: "Confirmée", preparing: "En préparation",
  out_for_delivery: "En livraison", delivered: "Livrée", delivery_failed: "Livraison échouée",
  not_collected: "Non récupérée", cancelled: "Annulée",
};
export const paymentStatusLabels: Record<string,string> = { unpaid: "Non encaissé", partial: "Écart enregistré", paid: "Encaissé" };

export function parseCheckoutCart(value: unknown): CheckoutCartLine[] | null {
  if (!Array.isArray(value) || !value.length || value.length > 100) return null;
  const lines: CheckoutCartLine[] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== "object") return null;
    const item = raw as Record<string,unknown>; const quantity = Number(item.quantity); const itemType = item.itemType === "kit" ? "kit" : "product";
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) return null;
    if (itemType === "kit") { if (!isUuid(item.kitId)) return null; lines.push({ itemType, kitId: String(item.kitId), quantity }); }
    else { if (!isUuid(item.productId) || !isUuid(item.variantId)) return null; lines.push({ itemType, productId: String(item.productId), variantId: String(item.variantId), quantity }); }
  }
  return lines;
}
export function isUuid(value: unknown) { return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value); }
export function checkoutErrorMessage(message: string) {
  if (message.includes("AUTH_REQUIRED")) return "Connectez-vous pour continuer.";
  if (message.includes("CHECKOUT_CHANGED")) return "Le prix ou les frais ont changé. Vérifiez le nouveau récapitulatif avant de confirmer.";
  if (message.includes("INSUFFICIENT_STOCK") || message.includes("KIT_COMPONENT_UNAVAILABLE")) return "Un article n’est plus disponible dans la quantité demandée. Actualisez votre panier.";
  if (message.includes("ADDRESS_NOT_AUTHORIZED")) return "Cette adresse ne vous appartient pas.";
  if (message.includes("DELIVERY_ZONE_UNAVAILABLE") || message.includes("DELIVERY_METHOD_UNAVAILABLE")) return "Cette destination n’est pas desservie ou aucun tarif n’est configuré.";
  if (message.includes("PICKUP_POINT_UNAVAILABLE")) return "Aucun point de collecte n’est actuellement disponible.";
  return "La commande n’a pas pu être traitée. Vérifiez les informations et réessayez.";
}
