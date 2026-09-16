import { PageHeader } from "@/components/ui/PageHeader";
import { ConversationInbox } from "@/components/messaging/ConversationInbox";
import { getConversationsForCurrentUser, getMessagingActor } from "@/lib/messaging/queries";

export default async function DashboardMessagesPage() {
  const [conversations, actor] = await Promise.all([getConversationsForCurrentUser(), getMessagingActor()]);
  return (
    <div className="space-y-6">
      <PageHeader title="Messagerie" subtitle="Messages de l'etablissement, annonces et echanges avec les familles." />
      <ConversationInbox conversations={conversations} userId={actor?.userId ?? ""} canReply />
    </div>
  );
}
