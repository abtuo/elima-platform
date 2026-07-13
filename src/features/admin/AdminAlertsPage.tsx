import { useEffect, useState } from "react";
import { AlertTriangle, Bell, CheckCircle2, CreditCard, UserX } from "lucide-react";
import { AppHeader } from "@/components/common/AppHeader";
import { PageContainer } from "@/components/layout/PageContainer";
import { ElimaCard } from "@/components/common/ElimaCard";
import { WebLinkButton } from "@/components/common/WebLinkButton";
import { getAdminStats, getMessages } from "@/services/mainDataService";

export function AdminAlertsPage() {
  const [stats, setStats] = useState({ students: 0, teachers: 0, absencesToday: 0, pendingPayments: 0 });
  const [messageCount, setMessageCount] = useState(0);
  useEffect(() => { Promise.all([getAdminStats(), getMessages()]).then(([nextStats, messages]) => { setStats(nextStats); setMessageCount(messages.filter((message) => !message.read).length); }); }, []);
  const alerts = [
    ...(stats.absencesToday ? [{ id: "attendance", icon: UserX, title: `${stats.absencesToday} absence${stats.absencesToday > 1 ? "s" : ""} ou retard${stats.absencesToday > 1 ? "s" : ""} aujourd’hui`, desc: "Consultez le suivi d’assiduité", color: "text-amber-600 bg-amber-50" }] : []),
    ...(stats.pendingPayments ? [{ id: "payments", icon: CreditCard, title: `${stats.pendingPayments} paiement${stats.pendingPayments > 1 ? "s" : ""} en attente`, desc: "Échéances à examiner", color: "text-red-600 bg-red-50" }] : []),
    ...(messageCount ? [{ id: "messages", icon: Bell, title: `${messageCount} message${messageCount > 1 ? "s" : ""} non lu${messageCount > 1 ? "s" : ""}`, desc: "Échanges à traiter", color: "text-primary bg-primary/10" }] : []),
  ];
  return <PageContainer><AppHeader title="Alertes" subtitle="Points d’attention calculés aujourd’hui" /><div className="space-y-3">{alerts.length ? alerts.map((alert) => { const Icon = alert.icon; return <ElimaCard key={alert.id}><div className="flex items-start gap-3"><div className={`flex h-10 w-10 items-center justify-center rounded-xl ${alert.color}`}><Icon className="h-5 w-5" /></div><div><h3 className="font-title text-base font-semibold text-accent">{alert.title}</h3><p className="text-sm text-gray-500">{alert.desc}</p></div></div></ElimaCard>; }) : <ElimaCard><div className="flex items-center gap-3"><CheckCircle2 className="h-6 w-6 text-primary" /><div><h3 className="font-semibold text-accent">Aucune alerte prioritaire</h3><p className="text-sm text-gray-500">Les indicateurs du jour sont à jour.</p></div></div></ElimaCard>}</div><div className="mt-5"><WebLinkButton path="/dashboard" label="Voir le rapport détaillé" /></div></PageContainer>;
}
