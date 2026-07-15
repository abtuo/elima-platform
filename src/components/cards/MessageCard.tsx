import { useState } from "react";
import { ChevronDown, LoaderCircle, Reply, Send, Trash2 } from "lucide-react";
import type { ConversationThreadMessage, MessagePreview } from "@/types/school";
import { ElimaCard } from "@/components/common/ElimaCard";
import { getConversationThread, sendMessageReply } from "@/services/messageService";

type MessageCardProps = {
  message: MessagePreview;
  onDelete?: (conversationId: string) => Promise<void>;
};

export function MessageCard({ message, onDelete }: MessageCardProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [reply, setReply] = useState("");
  const [error, setError] = useState("");
  const [thread, setThread] = useState<ConversationThreadMessage[]>([]);

  async function toggleThread() {
    const nextOpen = !open;
    setOpen(nextOpen);
    if (!nextOpen || thread.length) return;
    setLoading(true);
    setError("");
    try { setThread(await getConversationThread(message.conversationId)); }
    catch { setError("Impossible de charger la conversation."); }
    finally { setLoading(false); }
  }

  async function submitReply(event: React.FormEvent) {
    event.preventDefault();
    if (!reply.trim()) return;
    setSending(true);
    setError("");
    try {
      await sendMessageReply(message.conversationId, reply);
      setReply("");
      setThread(await getConversationThread(message.conversationId));
    } catch { setError("La réponse n’a pas pu être envoyée."); }
    finally { setSending(false); }
  }

  async function remove() {
    if (!onDelete || !window.confirm("Supprimer cette conversation de votre messagerie ?")) return;
    await onDelete(message.conversationId);
  }

  return (
    <ElimaCard>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className={`font-title truncate text-base font-semibold ${message.read ? "text-gray-600" : "text-accent"}`}>{message.subject}</h3>
            {!message.read ? <span className="h-2 w-2 shrink-0 rounded-full bg-primary" /> : null}
          </div>
          <p className="mt-1 truncate text-sm text-gray-500">{message.preview}</p>
          <p className="mt-2 text-xs text-gray-400">{message.sender} · {message.date}</p>
        </div>
        {onDelete ? <button type="button" onClick={remove} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-gray-400 hover:bg-red-50 hover:text-red-600" aria-label="Supprimer la conversation"><Trash2 className="h-4 w-4" /></button> : null}
      </div>

      {message.canReply !== false ? <button type="button" onClick={toggleThread} className="mt-4 flex items-center gap-2 text-sm font-semibold text-primary"><Reply className="h-4 w-4" />{open ? "Masquer la conversation" : "Voir et répondre"}<ChevronDown className={`h-4 w-4 transition ${open ? "rotate-180" : ""}`} /></button> : null}

      {open ? <div className="mt-4 border-t border-gray-100 pt-4">
        {loading ? <div className="flex items-center gap-2 text-sm text-gray-400"><LoaderCircle className="h-4 w-4 animate-spin" />Chargement...</div> : <div className="max-h-72 space-y-2 overflow-y-auto pr-1">{thread.map((item) => <div key={item.id} className={`flex ${item.sentByCurrentUser ? "justify-end" : "justify-start"}`}><div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${item.sentByCurrentUser ? "bg-primary text-white" : "bg-gray-100 text-accent"}`}><p>{item.content}</p><p className={`mt-1 text-[10px] ${item.sentByCurrentUser ? "text-white/60" : "text-gray-400"}`}>{item.sender}</p></div></div>)}</div>}
        {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}
        <form onSubmit={submitReply} className="mt-3 flex gap-2">
          <input value={reply} onChange={(event) => setReply(event.target.value)} maxLength={4000} placeholder="Écrire une réponse..." className="min-w-0 flex-1 rounded-2xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary" />
          <button type="submit" disabled={sending || !reply.trim()} className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-white disabled:opacity-40" aria-label="Envoyer la réponse">{sending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}</button>
        </form>
      </div> : null}
    </ElimaCard>
  );
}
