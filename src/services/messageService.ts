import { getMessages } from "./mainDataService";
import { mainDbClient } from "./mainDbClient";

export { getMessages };

export async function getMessageDetail(messageId: string) {
  const messages = await getMessages();
  return messages.find((m) => m.id === messageId) ?? null;
}

export async function markAllMessagesRead() {
  if (!mainDbClient) return;
  const { error } = await mainDbClient.rpc("mobile_mark_all_messages_read");
  if (!error) window.dispatchEvent(new Event("elima:messages-read"));
}
