"use client";

import { FileText, LayoutDashboard, MessageCircleMore, ShoppingBag, WalletCards } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessagerieNavLabel } from "@/components/messaging/MessagerieNavLabel";
import { useMessagingUnreadCount } from "@/hooks/useMessagingUnreadCount";
import { hasFeature, PARENT_NAV_GATES, type SchoolPlan } from "@/lib/plans";

export function PortalNavTabs({
  basePath,
  effectivePlan = "basic",
}: {
  basePath: "/parent" | "/student";
  effectivePlan?: SchoolPlan;
}) {
  const pathname = usePathname();
  const unreadMessages = useMessagingUnreadCount(true);
  const messagesHref = `${basePath}/messages`;

  const allItems =
    basePath === "/parent"
      ? [
          { href: basePath, label: "Tableau de bord", icon: LayoutDashboard },
          { href: messagesHref, label: "Messagerie", icon: MessageCircleMore, isMessaging: true },
          { href: `${basePath}/pay`, label: "Paiement", icon: WalletCards },
          { href: `${basePath}/store`, label: "Fournitures", icon: ShoppingBag },
          { href: `${basePath}/invoices`, label: "Factures", icon: FileText },
        ]
      : [
          { href: basePath, label: "Tableau de bord", icon: LayoutDashboard },
          { href: `${basePath}/reports`, label: "Bulletins", icon: FileText },
          { href: `${basePath}/reviser`, label: "Révision", icon: FileText },
          { href: messagesHref, label: "Messagerie", icon: MessageCircleMore, isMessaging: true },
        ];

  const items = allItems.filter((item) => {
    const feature = PARENT_NAV_GATES[item.href];
    if (!feature) return true;
    return hasFeature(effectivePlan, feature);
  });

  return (
    <nav className="mb-5 flex gap-2 overflow-x-auto rounded-2xl border border-slate-200/80 bg-white p-1 shadow-sm">
      {items.map((item) => {
        const active = pathname === item.href || (item.href !== basePath && pathname.startsWith(item.href));
        return (
          <Link
            key={item.href}
            href={item.href}
            className={
              active
                ? "inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl bg-[var(--primary)] px-3 py-2 text-sm font-semibold text-white"
                : "inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            }
          >
            <item.icon size={16} />
            {"isMessaging" in item && item.isMessaging ? (
              <MessagerieNavLabel count={unreadMessages} variant={active ? "tab-active" : "tab-inactive"} />
            ) : (
              item.label
            )}
          </Link>
        );
      })}
    </nav>
  );
}
