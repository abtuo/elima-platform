export type SchoolLevel = "primaire" | "college" | "lycee";
export type Grade = "CP1" | "CP2" | "CE1" | "CE2" | "CM1" | "CM2" | "6e" | "5e" | "4e" | "3e" | "2nde" | "1re" | "Terminale";
export type Currency = "XOF";
export type Money = { amount: number; currency: Currency };
export type Availability = "in_stock" | "available_on_order" | "out_of_stock" | "unavailable" | "demo";

export type ProductVariant = {
  id: string;
  sku: string;
  name: string;
  attributes: Record<string, string>;
  price: Money;
  promotionalPrice?: Money;
  quantityAvailable: number;
  availability: Availability;
  isDefault: boolean;
  imageUrl?: string;
};

export type Category = {
  id: string;
  name: string;
  slug: string;
  description?: string;
  parentId?: string;
  icon?: string;
  sortOrder: number;
};

export type Seller = { id: string; name: string; slug: string; verified: boolean };
export type Product = {
  id: string;
  slug: string;
  name: string;
  description: string;
  shortDescription: string;
  category: Category;
  levels: SchoolLevel[];
  grades: Grade[];
  price: Money;
  promotionalPrice?: Money;
  imageUrl?: string;
  imageEmoji?: string;
  imageAlt: string;
  badge?: string;
  popularity: number;
  createdAt: string;
  variants: ProductVariant[];
  defaultVariantId: string;
  seller: Seller;
  availability: Availability;
  isDemo: boolean;
};

export type KitItem = { productId: string; variantId?: string; quantity: number };
export type Kit = {
  id: string;
  slug: string;
  name: string;
  grade: Grade;
  level: SchoolLevel;
  description: string;
  price?: Money;
  pricingStrategy: "fixed" | "sum_components";
  availability: Availability;
  imageUrl?: string;
  items: KitItem[];
  isCustomizableLater: boolean;
  isDemo: boolean;
};

export type CartItem = {
  itemType?: "product" | "kit";
  kitId?: string;
  productId: string;
  variantId: string;
  quantity: number;
  name: string;
  variantName: string;
  slug: string;
  unitPrice: Money;
  imageUrl?: string;
  imageEmoji?: string;
  availability: Availability;
  isDemo: boolean;
};

export type CustomerProfile = { id: string; firstName?: string; lastName?: string; email?: string; phone?: string; phoneVerified: boolean };
export type CustomerAddress = { id: string; label: string; recipientName: string; phone: string; countryCode: string; city: string; commune: string; neighborhood: string; addressDetails: string; landmark?: string; instructions?: string; deliveryZoneId?: string; isDefault: boolean };
export type SchoolSupplyList = { id: string; studentId: string; schoolId: string; grade: Grade; status: "available" | "unavailable" };
export type SchoolSupplyListItem = { id: string; listId: string; label: string; quantity: number; recommendedProductId?: string };
export type Order = { id: string; reference: string; customerId: string; total: Money; status: "pending_confirmation" | "confirmed" | "preparing" | "out_for_delivery" | "delivered" | "delivery_failed" | "not_collected" | "cancelled" };
export type OrderItem = { orderId: string; productId: string; variantId: string; unitPrice: Money; quantity: number };

export function effectiveVariantPrice(variant: ProductVariant): Money { return variant.promotionalPrice ?? variant.price; }
export function isPurchasable(availability: Availability) { return availability === "in_stock" || availability === "available_on_order" || availability === "demo"; }
export function formatMoney(money: Money): string {
  return new Intl.NumberFormat("fr-CI", { style: "currency", currency: money.currency, maximumFractionDigits: 0 }).format(money.amount);
}
