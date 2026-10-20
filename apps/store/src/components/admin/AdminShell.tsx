import Image from "next/image";
import Link from "next/link";
import { Boxes, ChartNoAxesColumn, CircleCheckBig, ClipboardList, FolderTree, Gift, House, MapPinned, PackagePlus, Percent, Truck, Warehouse } from "lucide-react";
import type { StoreRole } from "@/lib/admin-auth";

const navigation = [
  { href: "/admin", label: "Vue d’ensemble", icon: ChartNoAxesColumn, roles: ["store_admin", "catalog_manager", "inventory_manager"] },
  { href: "/admin/produits", label: "Produits", icon: Boxes, roles: ["store_admin", "catalog_manager"] },
  { href: "/admin/categories", label: "Catégories", icon: FolderTree, roles: ["store_admin", "catalog_manager"] },
  { href: "/admin/kits", label: "Kits scolaires", icon: Gift, roles: ["store_admin", "catalog_manager"] },
  { href: "/admin/stocks", label: "Stocks", icon: Warehouse, roles: ["store_admin", "inventory_manager"] },
  { href: "/admin/promotions", label: "Promotions", icon: Percent, roles: ["store_admin", "catalog_manager"] },
  { href: "/admin/qualite", label: "Qualité catalogue", icon: CircleCheckBig, roles: ["store_admin", "catalog_manager"] },
  { href: "/admin/commandes", label: "Commandes", icon: ClipboardList, roles: ["store_admin", "order_manager"] },
  { href: "/admin/livraisons", label: "Livraisons", icon: Truck, roles: ["store_admin", "order_manager"] },
  { href: "/admin/zones-livraison", label: "Zones de livraison", icon: MapPinned, roles: ["store_admin", "order_manager"] },
] as const;

function Nav({ role }: { role: StoreRole }) { return <nav className="space-y-1">{navigation.filter((item) => (item.roles as readonly StoreRole[]).includes(role)).map(({ href, label, icon: Icon }) => <Link key={href} href={href} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-600 hover:bg-emerald-50 hover:text-[#1a5f3f]"><Icon size={19} />{label}</Link>)}</nav>; }

export function AdminShell({ children, role, phone }: { children: React.ReactNode; role: StoreRole; phone?: string }) {
  return <div className="min-h-screen bg-[#f4f6f3] lg:grid lg:grid-cols-[260px_1fr]">
    <aside className="hidden border-r border-slate-200 bg-white p-5 lg:flex lg:flex-col"><Link href="/admin" className="flex items-center gap-3"><Image src="/logo_wo_bg.png" alt="Elima" width={42} height={42} /><div><p className="font-bold text-[#173f2e]">Elima Store</p><p className="text-xs text-slate-500">Administration</p></div></Link><div className="my-6 border-t" /><Nav role={role} /><div className="mt-auto rounded-2xl bg-slate-50 p-3 text-xs text-slate-500"><p className="font-semibold text-slate-700">{phone || "Compte Elima"}</p><p className="mt-1">{role.replaceAll("_", " ")}</p></div></aside>
    <div className="min-w-0"><header className="sticky top-0 z-30 flex min-h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur lg:px-8"><details className="relative lg:hidden"><summary className="cursor-pointer list-none rounded-xl border px-3 py-2 text-sm font-bold">Menu</summary><div className="absolute left-0 top-12 w-64 rounded-2xl border bg-white p-3 shadow-xl"><Nav role={role} /></div></details><div className="hidden text-sm text-slate-500 sm:block">Gestion du catalogue commercial</div><div className="flex items-center gap-2"><Link href="/" className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-bold text-slate-600"><House size={17} />Boutique</Link>{(role === "store_admin" || role === "catalog_manager") && <Link href="/admin/produits/nouveau" className="hidden items-center gap-2 rounded-xl bg-[#2e8b57] px-3 py-2 text-sm font-bold text-white sm:inline-flex"><PackagePlus size={17} />Nouveau produit</Link>}</div></header><div className="p-4 sm:p-6 lg:p-8">{children}</div></div>
  </div>;
}
