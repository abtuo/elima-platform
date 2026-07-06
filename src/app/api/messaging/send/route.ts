import { NextResponse } from "next/server";
import { createSupabaseAdminServerClient } from "@/lib/supabase/server";
import { canAccessConversation, getMessagingActor } from "@/lib/messaging/queries";
import { sendConversationMessage } from "@/lib/messaging/create";

/** Post a reply in a conversation the current user can access. */
export async function POST(request: Request) {
  try {
    const actor = await getMessagingActor();
    if (!actor) return NextResponse.json({ message: "Non authentifié" }, { status: 401 });

    const body = (await request.json().catch(() => null)) as { conversationId?: string; content?: string } | null;
    const conversationId = body?.conversationId?.trim();
    const content = body?.content?.trim();
    if (!conversationId || !content || content.length < 2) {
      return NextResponse.json({ message: "Message requis (min. 2 caractères)." }, { status: 400 });
    }

    const admin = await createSupabaseAdminServerClient();
    const allowed = await canAccessConversation(admin, actor, conversationId);
    if (!allowed) return NextResponse.json({ message: "Accès refusé" }, { status: 403 });

    const messageId = await sendConversationMessage(admin, {
      conversationId,
      senderId: actor.userId,
      senderRole: actor.role,
      content,
      type: "text",
    });

    return NextResponse.json({ ok: true, messageId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur serveur";
    return NextResponse.json({ message }, { status: 500 });
  }
}
