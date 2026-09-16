import { demoMessages } from "@/constants/demoData";
import type { ConversationThreadMessage } from "@/types/school";
import { getAlerts, getMessages } from "./mainDataService";
import { mainDbClient } from "./mainDbClient";
import { isDemoModeActive } from "./env";

export { getAlerts, getMessages };

export async function getMessageDetail(messageId: string) {
  const messages = await getMessages();
  return messages.find((m) => m.id === messageId) ?? null;
}

export async function markAllMessagesRead(conversationIds: string[]) {
  if (!conversationIds.length) return;
  if (!mainDbClient || isDemoModeActive()) {
    let read: string[] = [];
    try { read = JSON.parse(localStorage.getItem("elima_read_conversations") ?? "[]"); } catch { read = []; }
    localStorage.setItem("elima_read_conversations", JSON.stringify([...new Set([...read, ...conversationIds])]));
    window.dispatchEvent(new Event("elima:messages-read"));
    return;
  }
  const { error } = await mainDbClient.rpc("mobile_mark_messages_read", { target_conversation_ids: conversationIds });
  if (!error) {
    window.dispatchEvent(new Event("elima:messages-read"));
  }
}

function demoReplies() {
  try { return JSON.parse(localStorage.getItem("elima_demo_replies") ?? "{}") as Record<string, ConversationThreadMessage[]>; }
  catch { return {}; }
}

export async function getConversationThread(conversationId: string): Promise<ConversationThreadMessage[]> {
  if (!mainDbClient || isDemoModeActive()) {
    const preview = demoMessages.find((item) => item.conversationId === conversationId);
    const initial: ConversationThreadMessage[] = preview ? [{ id: preview.id, content: preview.preview, sender: preview.sender, senderId: null, sentByCurrentUser: false, date: preview.date }] : [];
    return [...initial, ...(demoReplies()[conversationId] ?? [])];
  }
  const { data: auth } = await mainDbClient.auth.getUser();
  const userId = auth.user?.id ?? "";
  const { data, error } = await mainDbClient
    .from("messages")
    .select("id, content, sender_id, created_at, sender:users(full_name)")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row: Record<string, unknown>) => ({
    id: String(row.id), content: String(row.content),
    sender: (row.sender as { full_name?: string } | null)?.full_name ?? "Établissement",
    senderId: row.sender_id ? String(row.sender_id) : null,
    sentByCurrentUser: String(row.sender_id ?? "") === userId,
    date: String(row.created_at),
  }));
}

export async function sendMessageReply(conversationId: string, content: string) {
  const cleaned = content.trim();
  if (!cleaned) throw new Error("Le message est vide.");
  if (!mainDbClient || isDemoModeActive()) {
    const replies = demoReplies();
    replies[conversationId] = [...(replies[conversationId] ?? []), {
      id: `demo-reply-${Date.now()}`, content: cleaned, sender: "Vous", senderId: "demo-user",
      sentByCurrentUser: true, date: new Date().toISOString(),
    }];
    localStorage.setItem("elima_demo_replies", JSON.stringify(replies));
  } else {
    const { error } = await mainDbClient.rpc("mobile_send_message", {
      target_conversation_id: conversationId,
      message_content: cleaned,
    });
    if (error) throw error;
  }
  window.dispatchEvent(new Event("elima:communications-changed"));
}

export async function deleteCommunication(conversationId: string) {
  if (!mainDbClient || isDemoModeActive()) {
    let hidden: string[] = [];
    try { hidden = JSON.parse(localStorage.getItem("elima_hidden_conversations") ?? "[]"); } catch { hidden = []; }
    localStorage.setItem("elima_hidden_conversations", JSON.stringify([...new Set([...hidden, conversationId])]));
  } else {
    const { error } = await mainDbClient.rpc("mobile_hide_conversation", { target_conversation_id: conversationId });
    if (error) throw error;
  }
  window.dispatchEvent(new Event("elima:communications-changed"));
}
