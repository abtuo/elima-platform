"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Bell, ChevronDown, ChevronRight, MessageSquare, Send } from "lucide-react";
import { canReplyToConversation, conversationTypeStyle } from "@/lib/messaging/conversation-styles";
import type { ConversationSummary } from "@/lib/messaging/types";
import { notifyMessagingUpdated } from "@/lib/messaging/unread-events";
import { EmptyState } from "@/components/dashboard/EmptyState";

function formatTime(value: string | null) {
  if (!value) return "";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function ConversationListItem({
  conversation,
  selected,
  onSelect,
}: {
  conversation: ConversationSummary;
  selected: boolean;
  onSelect: () => void;
}) {
  const style = conversationTypeStyle(conversation.type);
  const lastPreview = conversation.messages.at(-1)?.content ?? "Aucun message";

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full rounded-xl border px-3 py-2 text-left transition ${
        selected
          ? "border-[var(--primary)] bg-[var(--primary)]/10 shadow-sm"
          : "border-slate-200 bg-white hover:bg-slate-50"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 shrink-0 rounded-full ${style.dotClass}`} aria-hidden />
            <p className={`truncate text-sm font-semibold ${conversation.unreadCount > 0 ? "text-slate-900" : "text-slate-800"}`}>
              {conversation.title}
            </p>
          </div>
          <p className="mt-1 truncate text-xs text-slate-500">{lastPreview}</p>
          <p className="mt-1 text-[11px] text-slate-400">{formatTime(conversation.lastMessageAt)}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${style.badgeClass}`}>
            {style.label}
          </span>
          {conversation.unreadCount > 0 ? (
            <span className="rounded-full bg-[var(--primary)] px-1.5 py-0.5 text-[10px] font-bold text-white">
              {conversation.unreadCount}
            </span>
          ) : null}
        </div>
      </div>
    </button>
  );
}

function ConversationSection({
  title,
  icon,
  items,
  selectedId,
  onSelect,
  expanded,
  onToggle,
  accentClass,
}: {
  title: string;
  icon: ReactNode;
  items: ConversationSummary[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  expanded: boolean;
  onToggle: () => void;
  accentClass?: string;
}) {
  if (items.length === 0) return null;

  const unreadTotal = items.reduce((sum, c) => sum + c.unreadCount, 0);

  return (
    <div className={`overflow-hidden rounded-xl border border-slate-200 bg-slate-50/60 ${accentClass ?? ""}`}>
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left transition hover:bg-slate-100/80"
        aria-expanded={expanded}
      >
        {expanded ? (
          <ChevronDown size={16} className="shrink-0 text-slate-500" aria-hidden />
        ) : (
          <ChevronRight size={16} className="shrink-0 text-slate-500" aria-hidden />
        )}
        <span className="text-slate-500">{icon}</span>
        <span className="flex-1 text-xs font-semibold uppercase tracking-wide text-slate-600">{title}</span>
        <span className="rounded-full bg-white px-1.5 py-0.5 text-[10px] font-bold text-slate-600 shadow-sm">
          {items.length}
        </span>
        {!expanded && unreadTotal > 0 ? (
          <span className="rounded-full bg-[var(--primary)] px-1.5 py-0.5 text-[10px] font-bold text-white">
            {unreadTotal}
          </span>
        ) : null}
      </button>

      {expanded ? (
        <div className="space-y-2 border-t border-slate-200 bg-white p-2">
          {items.map((conversation) => (
            <ConversationListItem
              key={conversation.id}
              conversation={conversation}
              selected={conversation.id === selectedId}
              onSelect={() => onSelect(conversation.id)}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function ConversationInbox({
  conversations,
  userId,
  canReply = false,
}: {
  conversations: ConversationSummary[];
  userId: string;
  canReply?: boolean;
}) {
  const router = useRouter();
  const notifications = useMemo(
    () => conversations.filter((c) => c.category === "notification"),
    [conversations],
  );
  const chats = useMemo(
    () => conversations.filter((c) => c.category === "conversation"),
    [conversations],
  );

  const defaultId = useMemo(() => {
    const firstUnread = conversations.find((c) => c.unreadCount > 0);
    return firstUnread?.id ?? conversations[0]?.id ?? null;
  }, [conversations]);

  const [selectedId, setSelectedId] = useState<string | null>(defaultId);
  const [notificationsOpen, setNotificationsOpen] = useState(true);
  const [conversationsOpen, setConversationsOpen] = useState(true);
  const [localUnread, setLocalUnread] = useState<Record<string, number>>(() =>
    Object.fromEntries(conversations.map((c) => [c.id, c.unreadCount])),
  );
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    setSelectedId(defaultId);
    setLocalUnread(Object.fromEntries(conversations.map((c) => [c.id, c.unreadCount])));
    setDraft("");
  }, [conversations, defaultId]);

  const sendReply = useCallback(async () => {
    if (!selectedId || !draft.trim() || sending) return;
    setSending(true);
    try {
      const res = await fetch("/api/messaging/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: selectedId, content: draft.trim() }),
      });
      if (!res.ok) throw new Error("send failed");
      setDraft("");
      router.refresh();
      notifyMessagingUpdated();
    } catch {
      /* best-effort */
    } finally {
      setSending(false);
    }
  }, [selectedId, draft, sending, router]);

  const markRead = useCallback(
    async (conversationId: string) => {
      setLocalUnread((prev) => ({ ...prev, [conversationId]: 0 }));
      if (!userId) return;
      try {
        await fetch("/api/messaging/mark-read", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ conversationId }),
        });
        notifyMessagingUpdated();
      } catch {
        /* best-effort */
      }
    },
    [userId],
  );

  const handleSelect = useCallback((id: string) => {
    setSelectedId(id);
    setLocalUnread((prev) => ({ ...prev, [id]: 0 }));
    setDraft("");
  }, []);

  useEffect(() => {
    if (selectedId) void markRead(selectedId);
  }, [selectedId, markRead]);

  const selected = conversations.find((c) => c.id === selectedId) ?? null;
  const showComposer = Boolean(canReply && selected && canReplyToConversation(selected.type));

  const quickReplies =
    selected?.type === "absence_notification"
      ? [
          "Bonjour, mon enfant était malade ce matin. Je transmets le justificatif médical dès que possible.",
          "Bonjour, nous avons eu un problème de transport ce matin. Merci pour votre compréhension.",
        ]
      : [];

  if (conversations.length === 0) {
    return <EmptyState title="Aucun message" description="Les conversations apparaîtront ici." />;
  }

  return (
    <section className="grid gap-4 lg:grid-cols-[320px_1fr]">
      <aside className="elima-card max-h-[70vh] space-y-4 overflow-y-auto">
        <h2 className="text-base font-semibold text-[var(--accent)]">Messagerie</h2>
        <ConversationSection
          title="Notifications"
          icon={<Bell size={14} />}
          items={notifications.map((c) => ({ ...c, unreadCount: localUnread[c.id] ?? c.unreadCount }))}
          selectedId={selectedId}
          onSelect={handleSelect}
          expanded={notificationsOpen}
          onToggle={() => setNotificationsOpen((v) => !v)}
          accentClass="border-l-4 border-l-amber-400 pl-0"
        />
        <ConversationSection
          title="Conversations"
          icon={<MessageSquare size={14} />}
          items={chats.map((c) => ({ ...c, unreadCount: localUnread[c.id] ?? c.unreadCount }))}
          selectedId={selectedId}
          onSelect={handleSelect}
          expanded={conversationsOpen}
          onToggle={() => setConversationsOpen((v) => !v)}
          accentClass="border-l-4 border-l-teal-500 pl-0"
        />
      </aside>

      <div className="min-h-[320px]">
        {selected ? (
          <article className="elima-card space-y-4">
            <header className="border-b border-slate-100 pb-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-bold text-[var(--accent)]">{selected.title}</h2>
                <span
                  className={`rounded-full border px-3 py-1 text-xs font-semibold ${conversationTypeStyle(selected.type).badgeClass}`}
                >
                  {conversationTypeStyle(selected.type).label}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500">{selected.participants.join(", ")}</p>
            </header>
            <div className="max-h-[55vh] space-y-3 overflow-y-auto pr-1">
              {selected.messages.map((message) => {
                const system = message.senderRole === "SYSTEM" || !message.senderId;
                const mine = message.senderId === userId;
                return (
                  <div
                    key={message.id}
                    className={
                      system
                        ? "rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-sm text-amber-950"
                        : mine
                          ? "ml-8 rounded-xl border border-[var(--primary)]/20 bg-[var(--primary)]/5 px-3 py-2 text-sm"
                          : "mr-8 rounded-xl border border-slate-100 bg-white px-3 py-2 text-sm"
                    }
                  >
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <p className="font-semibold text-slate-800">
                        {system ? "Message Elima" : message.senderName}
                      </p>
                      <p className="text-[11px] text-slate-400">{formatTime(message.createdAt)}</p>
                    </div>
                    <p className="text-slate-700">{message.content}</p>
                    {message.href ? (
                      <Link
                        href={message.href}
                        className="mt-2 inline-flex rounded-lg bg-[var(--primary)] px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
                      >
                        Ouvrir le lien
                      </Link>
                    ) : null}
                  </div>
                );
              })}
            </div>
            {showComposer ? (
              <div className="space-y-2 border-t border-slate-100 pt-3">
                {quickReplies.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {quickReplies.map((text) => (
                      <button
                        key={text.slice(0, 24)}
                        type="button"
                        onClick={() => setDraft(text)}
                        className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-left text-xs text-slate-600 hover:bg-slate-100"
                      >
                        {text.slice(0, 72)}…
                      </button>
                    ))}
                  </div>
                ) : null}
                <div className="flex gap-2">
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    rows={2}
                    placeholder={
                      selected?.type === "absence_notification"
                        ? "Justifier l'absence ou le retard…"
                        : "Votre message…"
                    }
                    className="min-h-[44px] flex-1 resize-y rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                  <button
                    type="button"
                    disabled={sending || draft.trim().length < 2}
                    onClick={() => void sendReply()}
                    className="inline-flex shrink-0 items-center gap-1 self-end rounded-xl bg-[var(--primary)] px-3 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
                  >
                    <Send size={14} />
                    {sending ? "…" : "Envoyer"}
                  </button>
                </div>
              </div>
            ) : null}
          </article>
        ) : (
          <div className="elima-card grid min-h-[320px] place-items-center text-sm text-slate-500">
            Sélectionnez une conversation
          </div>
        )}
      </div>
    </section>
  );
}
