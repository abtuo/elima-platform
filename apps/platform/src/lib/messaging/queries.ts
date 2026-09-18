import { createSupabaseAdminServerClient, createSupabaseServerClient } from "@/lib/supabase/server";
import { getPortalContext } from "@/lib/portal/queries";
import { conversationCategory } from "@/lib/messaging/conversation-styles";
import { PARENT_ONLY_MESSAGING_TYPES, type MessagingConversationType } from "@/lib/messaging/create";
import type { ConversationSummary, MessageRow } from "@/lib/messaging/types";
import type { AppRole } from "@/lib/types";
import type { SupabaseClient } from "@supabase/supabase-js";

export type { ConversationSummary, MessageRow } from "@/lib/messaging/types";
export type { ConversationCategory } from "@/lib/messaging/conversation-styles";
export { conversationTypeLabel, conversationTypeStyle, conversationCategory } from "@/lib/messaging/conversation-styles";

export type MessagingActor = {
  userId: string;
  role: AppRole;
  schoolId: string;
  fullName: string;
};

async function getActor(): Promise<MessagingActor | null> {
  const supabase = await createSupabaseServerClient();
  const admin = await createSupabaseAdminServerClient();
  const { data: authData, error } = await supabase.auth.getUser();
  if (error || !authData.user?.id) return null;
  const userId = authData.user.id;
  const { data: userRow } = await admin.from("users").select("id, role, school_id, full_name").eq("id", userId).maybeSingle();
  if (!userRow?.school_id) return null;
  return {
    userId,
    role: String((userRow as { role: AppRole }).role) as AppRole,
    schoolId: String((userRow as { school_id: string }).school_id),
    fullName: String((userRow as { full_name?: string | null }).full_name ?? ""),
  };
}

export async function getMessagingActor() {
  return getActor();
}

type AccessContext = {
  canReadSchool: boolean;
  allowedUserIds: Set<string>;
  allowedStudentIds: Set<string>;
  allowedClassIds: Set<string>;
};

async function buildAccessContext(actor: MessagingActor, admin: SupabaseClient): Promise<AccessContext> {
  const allowedUserIds = new Set<string>([actor.userId]);
  const allowedStudentIds = new Set<string>();
  const allowedClassIds = new Set<string>();
  const canReadSchool = actor.role === "SUPER_ADMIN" || actor.role === "SCHOOL_ADMIN";

  if (actor.role === "PARENT" || actor.role === "STUDENT") {
    const portal = await getPortalContext();
    for (const student of portal?.students ?? []) {
      allowedStudentIds.add(student.id);
      allowedClassIds.add(student.classId);
    }
  }

  if (actor.role === "TEACHER") {
    const { data: teacher } = await admin.from("teachers").select("id").eq("user_id", actor.userId).maybeSingle();
    if (teacher?.id) {
      const classIds = Array.from(
        new Set(
          (
            (await admin.from("class_teachers").select("class_id").eq("teacher_id", String((teacher as { id: string }).id))).data ??
            []
          ).map((row) => String((row as { class_id: string }).class_id)),
        ),
      );
      for (const classId of classIds) allowedClassIds.add(classId);
      if (classIds.length > 0) {
        const { data: classStudents } = await admin.from("students").select("id").in("class_id", classIds);
        for (const s of (classStudents ?? []) as Array<{ id: string }>) {
          allowedStudentIds.add(String(s.id));
        }
      }
    }
  }

  return { canReadSchool, allowedUserIds, allowedStudentIds, allowedClassIds };
}

function canAccessWithContext(
  conversation: { student_id?: string | null; type?: string | null },
  participants: Array<{ participant_type: string; user_id: string | null; class_id: string | null }>,
  ctx: AccessContext,
  actorRole?: AppRole,
) {
  if (ctx.canReadSchool) return true;

  const convType = String(conversation.type ?? "");
  const isExplicitParticipant = participants.some((p) => p.user_id && ctx.allowedUserIds.has(p.user_id));

  if (conversation.student_id && ctx.allowedStudentIds.has(conversation.student_id)) {
    if (
      actorRole === "TEACHER" &&
      PARENT_ONLY_MESSAGING_TYPES.has(convType as MessagingConversationType)
    ) {
      return isExplicitParticipant;
    }
    return true;
  }
  return participants.some((p) => {
    if (p.user_id && ctx.allowedUserIds.has(p.user_id)) return true;
    if (p.participant_type === "CLASS" && p.class_id && ctx.allowedClassIds.has(p.class_id)) return true;
    return false;
  });
}

export async function canAccessConversation(
  admin: SupabaseClient,
  actor: MessagingActor,
  conversationId: string,
): Promise<boolean> {
  const { data: conv } = await admin
    .from("conversations")
    .select("id, school_id, student_id, type")
    .eq("id", conversationId)
    .maybeSingle();
  if (!conv || String((conv as { school_id: string }).school_id) !== actor.schoolId) return false;

  const { data: participants } = await admin
    .from("conversation_participants")
    .select("participant_type, user_id, class_id")
    .eq("conversation_id", conversationId);

  const ctx = await buildAccessContext(actor, admin);
  return canAccessWithContext(
    conv as { student_id?: string | null; type?: string | null },
    (participants ?? []) as Array<{ participant_type: string; user_id: string | null; class_id: string | null }>,
    ctx,
    actor.role,
  );
}

function parseReadBy(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String) : [];
}

export async function getConversationsForCurrentUser(): Promise<ConversationSummary[]> {
  const actor = await getActor();
  if (!actor) return [];
  const admin = await createSupabaseAdminServerClient();
  const ctx = await buildAccessContext(actor, admin);

  const { data: convRows, error: convErr } = await admin
    .from("conversations")
    .select("id, title, type, student_id, class_id, last_message_at, created_at")
    .eq("school_id", actor.schoolId)
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .limit(100);
  if (convErr) throw convErr;
  const conversations = (convRows ?? []) as Array<{
    id: string;
    title: string | null;
    type?: string | null;
    student_id?: string | null;
    class_id?: string | null;
    last_message_at?: string | null;
    created_at: string;
  }>;
  if (conversations.length === 0) return [];

  const ids = conversations.map((c) => c.id);
  const [{ data: participants }, { data: messages }] = await Promise.all([
    admin.from("conversation_participants").select("conversation_id, participant_type, user_id, class_id").in("conversation_id", ids),
    admin
      .from("messages")
      .select("id, conversation_id, sender_id, sender_role, content, type, metadata, read_by, created_at")
      .in("conversation_id", ids)
      .order("created_at", { ascending: true }),
  ]);

  const participantRows = (participants ?? []) as Array<{
    conversation_id: string;
    participant_type: string;
    user_id: string | null;
    class_id: string | null;
  }>;
  const messageRows = (messages ?? []) as Array<{
    id: string;
    conversation_id: string;
    sender_id: string | null;
    sender_role?: string | null;
    content: string;
    type?: string | null;
    metadata?: { href?: string } | null;
    read_by?: unknown;
    created_at: string;
  }>;

  const userIds = new Set<string>();
  for (const p of participantRows) if (p.user_id) userIds.add(p.user_id);
  for (const m of messageRows) if (m.sender_id) userIds.add(m.sender_id);
  const { data: userRows } = userIds.size
    ? await admin.from("users").select("id, full_name, role").in("id", Array.from(userIds))
    : { data: [] };
  const usersById = new Map(((userRows ?? []) as Array<{ id: string; full_name: string; role: string }>).map((u) => [String(u.id), u]));

  const participantsByConv = new Map<string, typeof participantRows>();
  for (const p of participantRows) {
    const list = participantsByConv.get(p.conversation_id) ?? [];
    list.push(p);
    participantsByConv.set(p.conversation_id, list);
  }
  const messagesByConv = new Map<string, typeof messageRows>();
  for (const m of messageRows) {
    const list = messagesByConv.get(m.conversation_id) ?? [];
    list.push(m);
    messagesByConv.set(m.conversation_id, list);
  }

  return conversations
    .filter((c) => canAccessWithContext(c, participantsByConv.get(c.id) ?? [], ctx, actor.role))
    .map((c) => {
      const convType = c.type ?? "parent_admin";
      const convMessages = messagesByConv.get(c.id) ?? [];
      const mappedMessages: MessageRow[] = convMessages.map((m) => {
        const sender = m.sender_id ? usersById.get(m.sender_id) : null;
        const readBy = parseReadBy(m.read_by);
        const isRead = m.sender_id === actor.userId || readBy.includes(actor.userId);
        return {
          id: m.id,
          senderId: m.sender_id,
          senderName: sender?.full_name ?? (m.sender_id ? "Utilisateur" : "Message Elima"),
          senderRole: m.sender_role ?? sender?.role ?? "SYSTEM",
          content: m.content,
          type: m.type ?? "text",
          createdAt: m.created_at,
          href: m.metadata?.href ?? null,
          isRead,
        };
      });
      const unreadCount = mappedMessages.filter((m) => !m.isRead && m.senderId !== actor.userId).length;

      return {
        id: c.id,
        title: c.title ?? "Conversation",
        type: convType,
        category: conversationCategory(convType),
        lastMessageAt: c.last_message_at ?? c.created_at,
        participants: (participantsByConv.get(c.id) ?? [])
          .map((p) => (p.user_id ? usersById.get(p.user_id)?.full_name ?? "Utilisateur" : "Classe"))
          .filter(Boolean),
        messages: mappedMessages,
        unreadCount,
      } satisfies ConversationSummary;
    });
}

export async function getUnreadMessageCountForCurrentUser(): Promise<number> {
  const conversations = await getConversationsForCurrentUser();
  return conversations.reduce((sum, conversation) => sum + conversation.unreadCount, 0);
}
