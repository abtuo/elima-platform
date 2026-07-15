import { getMessages } from "./mainDataService";
import { mainDbClient } from "./mainDbClient";

export { getMessages };

export async function getMessageDetail(messageId: string) {
  const messages = await getMessages();
  return messages.find((m) => m.id === messageId) ?? null;
}

export async function markAllMessagesRead(conversationIds: string[]) {
  if (!mainDbClient || !conversationIds.length) return;
  const { error } = await mainDbClient.rpc("mobile_mark_messages_read", { target_conversation_ids: conversationIds });
  if (!error) window.dispatchEvent(new Event("elima:messages-read"));
}
