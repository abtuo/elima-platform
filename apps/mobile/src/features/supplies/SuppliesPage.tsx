import { useEffect, useState } from "react";
import { CheckCircle2, ClipboardList, PackageCheck, ShoppingBag } from "lucide-react";
import { AppHeader } from "@/components/common/AppHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { WebLinkButton } from "@/components/common/WebLinkButton";
import { PageContainer } from "@/components/layout/PageContainer";
import { useAuth } from "@/features/auth/AuthProvider";
import { getStoreOrders, getSupplyLists } from "@/services/supplyService";
import type { StoreOrderSummary, SupplyListSummary } from "@/types/school";

const labels = { draft: "Brouillon", pending_validation: "À valider", published: "Publiée" } as const;

export function SuppliesPage() {
  const { profile } = useAuth();
  const [lists, setLists] = useState<SupplyListSummary[]>([]);
  const [orders, setOrders] = useState<StoreOrderSummary[]>([]);
  useEffect(() => { Promise.all([getSupplyLists(), getStoreOrders()]).then(([nextLists, nextOrders]) => { setLists(nextLists); setOrders(nextOrders); }); }, []);
  const admin = ["SCHOOL_ADMIN", "SUPER_ADMIN"].includes(profile.role);
  const teacher = profile.role === "TEACHER";

  return <PageContainer>
    <AppHeader title="Fournitures" subtitle={admin ? "Listes, packs et commandes" : teacher ? "Listes à préparer pour vos classes" : "Listes et commandes de vos enfants"} />
    <section className="rounded-[2rem] bg-[#173f31] p-6 text-white"><ShoppingBag className="h-6 w-6 text-secondary" /><h2 className="mt-4 font-title text-2xl font-semibold">La rentrée, sans friction.</h2><p className="mt-2 text-sm text-white/65">Centralisez les listes et suivez leur préparation depuis un seul espace.</p></section>
    <section className="mt-6">
      <h2 className="mb-3 font-title text-lg font-semibold text-accent">Listes de fournitures</h2>
      {lists.length ? <div className="grid gap-3 md:grid-cols-2">{lists.map((list) => <article key={list.id} className="rounded-3xl bg-white p-5 shadow-sm"><div className="flex items-start justify-between gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary"><ClipboardList className="h-5 w-5" /></span><span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">{labels[list.status]}</span></div><h3 className="mt-4 font-semibold text-accent">{list.title}</h3><p className="mt-1 text-sm text-gray-500">{list.className} · {list.academicYear}</p><p className="mt-3 text-xs text-gray-400">{list.itemCount} article{list.itemCount > 1 ? "s" : ""}</p></article>)}</div> : <EmptyState icon={ClipboardList} title="Aucune liste disponible" description="Les listes publiées pour les classes apparaîtront ici." />}
    </section>
    {admin ? <section className="mt-6"><h2 className="mb-3 font-title text-lg font-semibold text-accent">Commandes récentes</h2>{orders.length ? <div className="space-y-3">{orders.slice(0, 5).map((order) => <article key={order.id} className="flex items-center gap-3 rounded-3xl bg-white p-4 shadow-sm"><PackageCheck className="h-5 w-5 text-primary" /><div className="min-w-0 flex-1"><p className="truncate font-semibold text-accent">{order.studentName}</p><p className="text-xs capitalize text-gray-500">{order.orderStatus.replace(/_/g, " ")}</p></div><p className="text-sm font-bold text-accent">{order.totalAmount.toLocaleString("fr-FR")} {profile.currency}</p></article>)}</div> : <div className="rounded-3xl bg-white p-5 text-sm text-gray-500"><CheckCircle2 className="mb-2 h-5 w-5 text-primary" />Aucune commande récente.</div>}</section> : null}
    <div className="mt-6"><WebLinkButton path={admin ? "/dashboard/supplies" : teacher ? "/teacher/supplies" : "/parent/store"} label={admin ? "Gérer les fournitures" : teacher ? "Préparer une liste" : "Voir les packs disponibles"} /></div>
  </PageContainer>;
}
