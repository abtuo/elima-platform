import { useEffect, useState } from "react";
import { AppHeader } from "@/components/common/AppHeader";
import { PageContainer } from "@/components/layout/PageContainer";
import { MessageCard } from "@/components/cards/MessageCard";
import { EmptyState } from "@/components/common/EmptyState";
import { getMessages, markAllMessagesRead } from "@/services/messageService";
import type { MessagePreview } from "@/types/school";

export function AdminMessagesPage() {
  const [messages, setMessages] = useState<MessagePreview[]>([]);
  useEffect(() => { getMessages().then((items) => { setMessages(items); if (items.some((item) => !item.read)) markAllMessagesRead(); }); }, []);

  return (
    <PageContainer>
      <AppHeader title="Messages" subtitle="Centre de communication" />
      <div className="space-y-3">
        {messages.length ? messages.map((m) => <MessageCard key={m.id} message={m} />) : (
          <EmptyState title="Aucun message" description="Les messages apparaîtront ici." />
        )}
      </div>
    </PageContainer>
  );
}
