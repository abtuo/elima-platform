import { useCallback, useEffect, useState } from "react";
import { Bell, MessageSquare } from "lucide-react";
import { AlertCard } from "@/components/cards/AlertCard";
import { MessageCard } from "@/components/cards/MessageCard";
import { AppHeader } from "@/components/common/AppHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { LoadingState } from "@/components/common/LoadingState";
import { PageContainer } from "@/components/layout/PageContainer";
import { useAuth } from "@/features/auth/AuthProvider";
import type { CommunicationKind } from "@/lib/communications";
import { deleteCommunication, getAlerts, getMessages, markAllMessagesRead } from "@/services/messageService";
import type { MessageScope } from "@/services/mainDataService";
import type { MessagePreview } from "@/types/school";

export function CommunicationsPage({ kind }: { kind: CommunicationKind }) {
  const { profile } = useAuth();
  const canReadSchool = profile.role === "SCHOOL_ADMIN" || profile.role === "SUPER_ADMIN";
  const [scope, setScope] = useState<MessageScope>("mine");
  const [items, setItems] = useState<MessagePreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const next = await (kind === "alert" ? getAlerts(scope) : getMessages(scope));
    setItems(next);
    const unreadIds = next.filter((item) => !item.read).map((item) => item.conversationId);
    if (unreadIds.length) await markAllMessagesRead([...new Set(unreadIds)]);
    setLoading(false);
  }, [kind, scope]);

  useEffect(() => {
    void load();
    window.addEventListener("elima:communications-changed", load);
    return () => window.removeEventListener("elima:communications-changed", load);
  }, [load]);

  async function remove(conversationId: string) {
    setActionError("");
    try {
      await deleteCommunication(conversationId);
      setItems((current) => current.filter((item) => item.conversationId !== conversationId));
    } catch {
      setActionError("La suppression n’a pas pu être effectuée.");
    }
  }

  const isAlert = kind === "alert";
  return <PageContainer>
    <AppHeader title={isAlert ? "Alertes" : "Messages"} subtitle={isAlert ? "Absences, retards, notes et paiements" : "Conversations auxquelles vous pouvez répondre"} />
    {canReadSchool ? <div className="mb-4 grid grid-cols-2 rounded-2xl bg-gray-100 p-1"><button type="button" onClick={() => setScope("mine")} className={`rounded-xl px-3 py-2 text-sm font-semibold ${scope === "mine" ? "bg-white text-primary shadow-sm" : "text-gray-500"}`}>Pour moi</button><button type="button" onClick={() => setScope("school")} className={`rounded-xl px-3 py-2 text-sm font-semibold ${scope === "school" ? "bg-white text-primary shadow-sm" : "text-gray-500"}`}>Toute l’école</button></div> : null}
    {actionError ? <p className="mb-3 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{actionError}</p> : null}
    <div className="space-y-3">
      {loading ? <LoadingState label={isAlert ? "Chargement des alertes..." : "Chargement des conversations..."} /> : items.length ? items.map((item) => isAlert ? <AlertCard key={item.conversationId} alert={item} onDelete={remove} /> : <MessageCard key={item.conversationId} message={item} onDelete={remove} />) : <EmptyState icon={isAlert ? Bell : MessageSquare} title={isAlert ? "Aucune alerte" : "Aucune conversation"} description={isAlert ? "Les nouvelles alertes scolaires apparaîtront ici." : "Les échanges avec l’école et les familles apparaîtront ici."} />}
    </div>
  </PageContainer>;
}
