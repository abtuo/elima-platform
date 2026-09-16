import type { SupabaseClient } from "@supabase/supabase-js";
import { getAppNow } from "@/lib/app-date";
import { isDemoMode } from "@/lib/app-mode";

export type MessagingConversationType =
  | "payment_reminder"
  | "absence_notification"
  | "grade_notification"
  | "store_order"
  | "teacher_student"
  | "parent_teacher"
  | "parent_admin"
  | "class_announcement"
  | "schedule_update"
  | "supply_list_review";

/** Threads intended for parents/admins only — teachers need explicit participation. */
export const PARENT_ONLY_MESSAGING_TYPES = new Set<MessagingConversationType>([
  "store_order",
  "payment_reminder",
]);

export type ThreadMessageInput = {
  senderId: string | null;
  senderRole: string;
  content: string;
  type?: string;
  metadata?: Record<string, unknown> | null;
  createdAt?: string;
};

export type NotifyStudentThreadInput = {
  schoolId: string;
  studentId: string;
  classId?: string | null;
  type: MessagingConversationType;
  title: string;
  messages: ThreadMessageInput[];
  /** Extra participants beyond parents + school admins (e.g. teacher). */
  extraParticipantUserIds?: string[];
  /** Re-use an existing thread when school + student + type match. */
  reuseExisting?: boolean;
};

function isoNow() {
  return getAppNow().toISOString();
}

export async function resolveParentUserIds(admin: SupabaseClient, studentId: string): Promise<string[]> {
  const { data: links } = await admin.from("student_parents").select("parent_id").eq("student_id", studentId);
  const parentIds = ((links ?? []) as Array<{ parent_id: string }>).map((l) => String(l.parent_id));
  if (parentIds.length === 0) return [];

  const { data: parents } = await admin.from("parents").select("user_id").in("id", parentIds);
  return Array.from(
    new Set(
      ((parents ?? []) as Array<{ user_id: string | null }>)
        .map((p) => (p.user_id ? String(p.user_id) : null))
        .filter((id): id is string => Boolean(id)),
    ),
  );
}

export async function resolveSchoolAdminUserIds(admin: SupabaseClient, schoolId: string): Promise<string[]> {
  const { data: rows } = await admin
    .from("users")
    .select("id")
    .eq("school_id", schoolId)
    .in("role", ["SCHOOL_ADMIN", "SUPER_ADMIN"]);
  return ((rows ?? []) as Array<{ id: string }>).map((r) => String(r.id));
}

export async function resolveClassTeacherUserIds(admin: SupabaseClient, classId: string): Promise<string[]> {
  const { data: links } = await admin.from("class_teachers").select("teacher_id").eq("class_id", classId);
  const teacherIds = Array.from(
    new Set(((links ?? []) as Array<{ teacher_id: string }>).map((l) => String(l.teacher_id))),
  );
  if (teacherIds.length === 0) return [];

  const { data: teachers } = await admin.from("teachers").select("user_id").in("id", teacherIds);
  return Array.from(
    new Set(
      ((teachers ?? []) as Array<{ user_id: string | null }>)
        .map((t) => (t.user_id ? String(t.user_id) : null))
        .filter((id): id is string => Boolean(id)),
    ),
  );
}

async function ensureParticipants(admin: SupabaseClient, conversationId: string, userIds: string[]) {
  const unique = Array.from(new Set(userIds.filter(Boolean)));
  if (unique.length === 0) return;

  const { data: existing } = await admin
    .from("conversation_participants")
    .select("user_id")
    .eq("conversation_id", conversationId)
    .eq("participant_type", "USER");
  const have = new Set(((existing ?? []) as Array<{ user_id: string | null }>).map((p) => String(p.user_id ?? "")));
  const missing = unique.filter((id) => !have.has(id));
  if (missing.length === 0) return;

  await admin.from("conversation_participants").insert(
    missing.map((userId) => ({
      conversation_id: conversationId,
      participant_type: "USER",
      user_id: userId,
      class_id: null,
    })) as never,
  );
}

async function ensureClassParticipant(admin: SupabaseClient, conversationId: string, classId: string) {
  const { data: existing } = await admin
    .from("conversation_participants")
    .select("id")
    .eq("conversation_id", conversationId)
    .eq("participant_type", "CLASS")
    .eq("class_id", classId)
    .limit(1);
  if ((existing ?? []).length > 0) return;

  await admin.from("conversation_participants").insert({
    conversation_id: conversationId,
    participant_type: "CLASS",
    user_id: null,
    class_id: classId,
  } as never);
}

async function findExistingThread(
  admin: SupabaseClient,
  schoolId: string,
  studentId: string,
  type: MessagingConversationType,
) {
  const { data } = await admin
    .from("conversations")
    .select("id")
    .eq("school_id", schoolId)
    .eq("student_id", studentId)
    .eq("type", type)
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();
  return (data as { id?: string } | null)?.id ? String((data as { id: string }).id) : null;
}

/** Creates or reuses a student-scoped thread and appends messages + participants. */
export async function notifyStudentThread(
  admin: SupabaseClient,
  input: NotifyStudentThreadInput,
): Promise<{ conversationId: string; messageIds: string[] }> {
  const now = isoNow();
  const isDemo = isDemoMode();
  const parentIds = await resolveParentUserIds(admin, input.studentId);
  const adminIds = await resolveSchoolAdminUserIds(admin, input.schoolId);
  const participantIds = Array.from(
    new Set([...parentIds, ...adminIds, ...(input.extraParticipantUserIds ?? [])]),
  );

  let conversationId =
    input.reuseExisting !== false
      ? await findExistingThread(admin, input.schoolId, input.studentId, input.type)
      : null;

  if (!conversationId) {
    const { data: conv, error } = await admin
      .from("conversations")
      .insert({
        school_id: input.schoolId,
        title: input.title,
        type: input.type,
        student_id: input.studentId,
        class_id: input.classId ?? null,
        is_demo: isDemo,
        last_message_at: now,
        updated_at: now,
      } as never)
      .select("id")
      .single();
    if (error || !conv) throw new Error(error?.message ?? "conversation insert failed");
    conversationId = String((conv as { id: string }).id);
    if (participantIds.length > 0) {
      await admin.from("conversation_participants").insert(
        participantIds.map((userId) => ({
          conversation_id: conversationId,
          participant_type: "USER",
          user_id: userId,
          class_id: null,
        })) as never,
      );
    }
  } else {
    await ensureParticipants(admin, conversationId, participantIds);
    await admin
      .from("conversations")
      .update({ last_message_at: now, updated_at: now } as never)
      .eq("id", conversationId);
  }

  const messageIds: string[] = [];
  for (const message of input.messages) {
    const createdAt = message.createdAt ?? now;
    const { data: inserted, error: msgErr } = await admin
      .from("messages")
      .insert({
        conversation_id: conversationId,
        sender_id: message.senderId,
        sender_role: message.senderRole,
        content: message.content,
        type: message.type ?? "text",
        metadata: message.metadata ?? null,
        is_demo: isDemo,
        read_by: [],
        created_at: createdAt,
      } as never)
      .select("id")
      .single();
    if (msgErr || !inserted) throw new Error(msgErr?.message ?? "message insert failed");
    messageIds.push(String((inserted as { id: string }).id));
  }

  return { conversationId, messageIds };
}

export type NotifyClassThreadInput = {
  schoolId: string;
  classId: string;
  type: MessagingConversationType;
  title: string;
  messages: ThreadMessageInput[];
  extraParticipantUserIds?: string[];
  reuseExisting?: boolean;
};

async function findExistingClassThread(
  admin: SupabaseClient,
  schoolId: string,
  classId: string,
  type: MessagingConversationType,
) {
  const { data } = await admin
    .from("conversations")
    .select("id")
    .eq("school_id", schoolId)
    .eq("class_id", classId)
    .is("student_id", null)
    .eq("type", type)
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();
  return (data as { id?: string } | null)?.id ? String((data as { id: string }).id) : null;
}

/** Class-scoped thread for staff (e.g. supply list review) — notifies school admins. */
export async function notifyClassStaffThread(
  admin: SupabaseClient,
  input: NotifyClassThreadInput,
): Promise<{ conversationId: string; messageIds: string[] }> {
  const now = isoNow();
  const isDemo = isDemoMode();
  const adminIds = await resolveSchoolAdminUserIds(admin, input.schoolId);
  const participantIds = Array.from(new Set([...adminIds, ...(input.extraParticipantUserIds ?? [])]));

  let conversationId =
    input.reuseExisting !== false
      ? await findExistingClassThread(admin, input.schoolId, input.classId, input.type)
      : null;

  if (!conversationId) {
    const { data: conv, error } = await admin
      .from("conversations")
      .insert({
        school_id: input.schoolId,
        title: input.title,
        type: input.type,
        student_id: null,
        class_id: input.classId,
        is_demo: isDemo,
        last_message_at: now,
        updated_at: now,
      } as never)
      .select("id")
      .single();
    if (error || !conv) throw new Error(error?.message ?? "conversation insert failed");
    conversationId = String((conv as { id: string }).id);
    if (participantIds.length > 0) {
      await admin.from("conversation_participants").insert(
        participantIds.map((userId) => ({
          conversation_id: conversationId,
          participant_type: "USER",
          user_id: userId,
          class_id: null,
        })) as never,
      );
    }
  } else {
    await ensureParticipants(admin, conversationId, participantIds);
    await admin
      .from("conversations")
      .update({ last_message_at: now, updated_at: now } as never)
      .eq("id", conversationId);
  }

  const messageIds: string[] = [];
  for (const message of input.messages) {
    const createdAt = message.createdAt ?? now;
    const { data: inserted, error: msgErr } = await admin
      .from("messages")
      .insert({
        conversation_id: conversationId,
        sender_id: message.senderId,
        sender_role: message.senderRole,
        content: message.content,
        type: message.type ?? "text",
        metadata: message.metadata ?? null,
        is_demo: isDemo,
        read_by: [],
        created_at: createdAt,
      } as never)
      .select("id")
      .single();
    if (msgErr || !inserted) throw new Error(msgErr?.message ?? "message insert failed");
    messageIds.push(String((inserted as { id: string }).id));
  }

  return { conversationId, messageIds };
}

export async function notifyClassAudienceThread(
  admin: SupabaseClient,
  input: NotifyClassThreadInput,
): Promise<{ conversationId: string; messageIds: string[] }> {
  const now = isoNow();
  const isDemo = isDemoMode();
  const adminIds = await resolveSchoolAdminUserIds(admin, input.schoolId);
  const participantIds = Array.from(new Set([...adminIds, ...(input.extraParticipantUserIds ?? [])]));

  let conversationId =
    input.reuseExisting !== false
      ? await findExistingClassThread(admin, input.schoolId, input.classId, input.type)
      : null;

  if (!conversationId) {
    const { data: conv, error } = await admin
      .from("conversations")
      .insert({
        school_id: input.schoolId,
        title: input.title,
        type: input.type,
        student_id: null,
        class_id: input.classId,
        is_demo: isDemo,
        last_message_at: now,
        updated_at: now,
      } as never)
      .select("id")
      .single();
    if (error || !conv) throw new Error(error?.message ?? "conversation insert failed");
    conversationId = String((conv as { id: string }).id);
    await admin.from("conversation_participants").insert([
      {
        conversation_id: conversationId,
        participant_type: "CLASS",
        user_id: null,
        class_id: input.classId,
      },
      ...participantIds.map((userId) => ({
        conversation_id: conversationId,
        participant_type: "USER",
        user_id: userId,
        class_id: null,
      })),
    ] as never);
  } else {
    await ensureClassParticipant(admin, conversationId, input.classId);
    await ensureParticipants(admin, conversationId, participantIds);
    await admin
      .from("conversations")
      .update({ last_message_at: now, updated_at: now } as never)
      .eq("id", conversationId);
  }

  const messageIds: string[] = [];
  for (const message of input.messages) {
    const createdAt = message.createdAt ?? now;
    const { data: inserted, error: msgErr } = await admin
      .from("messages")
      .insert({
        conversation_id: conversationId,
        sender_id: message.senderId,
        sender_role: message.senderRole,
        content: message.content,
        type: message.type ?? "text",
        metadata: message.metadata ?? null,
        is_demo: isDemo,
        read_by: [],
        created_at: createdAt,
      } as never)
      .select("id")
      .single();
    if (msgErr || !inserted) throw new Error(msgErr?.message ?? "message insert failed");
    messageIds.push(String((inserted as { id: string }).id));
  }

  return { conversationId, messageIds };
}

export async function recordSchoolNotification(
  admin: SupabaseClient,
  params: {
    schoolId: string;
    type: string;
    message: string;
  },
) {
  const now = isoNow();
  await admin.from("notifications").insert({
    school_id: params.schoolId,
    student_id: null,
    type: params.type,
    channel: "INTERNAL",
    message: params.message,
    status: "SENT",
    sent_at: now,
    created_at: now,
  } as never);
}

/** Append a single message to an existing thread and bump last_message_at. */
export async function sendConversationMessage(
  admin: SupabaseClient,
  params: {
    conversationId: string;
    senderId: string | null;
    senderRole: string;
    content: string;
    type?: string;
    metadata?: Record<string, unknown> | null;
  },
): Promise<string> {
  const now = isoNow();
  const isDemo = isDemoMode();
  const { data: inserted, error } = await admin
    .from("messages")
    .insert({
      conversation_id: params.conversationId,
      sender_id: params.senderId,
      sender_role: params.senderRole,
      content: params.content,
      type: params.type ?? "text",
      metadata: params.metadata ?? null,
      is_demo: isDemo,
      read_by: params.senderId ? [params.senderId] : [],
      created_at: now,
    } as never)
    .select("id")
    .single();
  if (error || !inserted) throw new Error(error?.message ?? "message insert failed");

  await admin
    .from("conversations")
    .update({ last_message_at: now, updated_at: now } as never)
    .eq("id", params.conversationId);

  return String((inserted as { id: string }).id);
}

export async function recordInternalNotification(
  admin: SupabaseClient,
  params: {
    schoolId: string;
    studentId: string;
    type: string;
    message: string;
  },
) {
  const now = isoNow();
  await admin.from("notifications").insert({
    school_id: params.schoolId,
    student_id: params.studentId,
    type: params.type,
    channel: "INTERNAL",
    message: params.message,
    status: "SENT",
    sent_at: now,
    created_at: now,
  } as never);
}
