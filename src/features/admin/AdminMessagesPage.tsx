import { useEffect, useState } from "react";
import { AppHeader } from "@/components/common/AppHeader";
import { PageContainer } from "@/components/layout/PageContainer";
import { MessageCard } from "@/components/cards/MessageCard";
import { EmptyState } from "@/components/common/EmptyState";
import { getMessages, markAllMessagesRead } from "@/services/messageService";
import type { MessagePreview } from "@/types/school";
import { useAuth } from "@/features/auth/AuthProvider";
import type { MessageScope } from "@/services/mainDataService";

export function AdminMessagesPage() {
  const { profile } = useAuth();
  const canReadSchool = profile.role === "SCHOOL_ADMIN" || profile.role === "SUPER_ADMIN";
  const [scope, setScope] = useState<MessageScope>("mine");
  const [messages, setMessages] = useState<MessagePreview[]>([]);
  useEffect(() => { getMessages(scope).then((items) => { setMessages(items); const ids = [...new Set(items.filter((item) => !item.read).map((item) => item.conversationId).filter(Boolean))]; if (ids.length) markAllMessagesRead(ids); }); }, [scope]);

  return (
    <PageContainer>
      <AppHeader title="Messages" subtitle="Centre de communication" />
      {canReadSchool ? <div className="mb-4 grid grid-cols-2 rounded-2xl bg-gray-100 p-1"><button type="button" onClick={() => setScope("mine")} className={`rounded-xl px-3 py-2 text-sm font-semibold ${scope === "mine" ? "bg-white text-primary shadow-sm" : "text-gray-500"}`}>Mes échanges</button><button type="button" onClick={() => setScope("school")} className={`rounded-xl px-3 py-2 text-sm font-semibold ${scope === "school" ? "bg-white text-primary shadow-sm" : "text-gray-500"}`}>Toute l’école</button></div> : null}
      <div className="space-y-3">
        {messages.length ? messages.map((m) => <MessageCard key={m.id} message={m} />) : (
          <EmptyState title="Aucun message" description="Les messages apparaîtront ici." />
        )}
      </div>
    </PageContainer>
  );
}
