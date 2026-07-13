import { useEffect, useState } from "react";
import { AppHeader } from "@/components/common/AppHeader";
import { PageContainer } from "@/components/layout/PageContainer";
import { MessageCard } from "@/components/cards/MessageCard";
import { EmptyState } from "@/components/common/EmptyState";
import { getMessages } from "@/services/messageService";
import type { MessagePreview } from "@/types/school";

export function ParentMessagesPage() {
  const [messages, setMessages] = useState<MessagePreview[]>([]);

  useEffect(() => { getMessages().then(setMessages); }, []);

  return (
    <PageContainer>
      <AppHeader title="Messages" subtitle="Communications de l'école" />
      <div className="space-y-3">
        {messages.length ? messages.map((m) => <MessageCard key={m.id} message={m} />) : (
          <EmptyState title="Aucun message" description="Les messages de l'école apparaîtront ici." />
        )}
      </div>
    </PageContainer>
  );
}
