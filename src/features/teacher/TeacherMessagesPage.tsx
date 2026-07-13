import { useEffect, useState } from "react";
import { AppHeader } from "@/components/common/AppHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { MessageCard } from "@/components/cards/MessageCard";
import { PageContainer } from "@/components/layout/PageContainer";
import { getMessages } from "@/services/messageService";
import type { MessagePreview } from "@/types/school";
import { MessageSquare } from "lucide-react";

export function TeacherMessagesPage() {
  const [messages, setMessages] = useState<MessagePreview[]>([]);

  useEffect(() => { getMessages().then(setMessages); }, []);

  return (
    <PageContainer>
      <AppHeader title="Messages" subtitle="École, familles et annonces" />
      <div className="space-y-3">
        {messages.length ? messages.map((message) => <MessageCard key={message.id} message={message} />) : (
          <EmptyState icon={MessageSquare} title="Messagerie à jour" description="Les nouveaux échanges apparaîtront ici." />
        )}
      </div>
    </PageContainer>
  );
}
