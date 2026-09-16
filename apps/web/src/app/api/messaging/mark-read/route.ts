import { NextResponse } from "next/server";
import { canAccessConversation, getMessagingActor } from "@/lib/messaging/queries";
import { createSupabaseAdminServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const actor = await getMessagingActor();
    if (!actor) {
      return NextResponse.json({ message: "Non authentifié" }, { status: 401 });
    }

    const body = (await request.json().catch(() => null)) as { conversationId?: string } | null;
    const conversationId = body?.conversationId?.trim();
    if (!conversationId) {
      return NextResponse.json({ message: "conversationId requis" }, { status: 400 });
    }

    const admin = await createSupabaseAdminServerClient();
    const allowed = await canAccessConversation(admin, actor, conversationId);
    if (!allowed) {
      return NextResponse.json({ message: "Accès refusé" }, { status: 403 });
    }

    const { data: messages, error } = await admin
      .from("messages")
      .select("id, sender_id, read_by")
      .eq("conversation_id", conversationId);
    if (error) return NextResponse.json({ message: error.message }, { status: 400 });

    let updated = 0;
    for (const row of (messages ?? []) as Array<{ id: string; sender_id: string | null; read_by: unknown }>) {
      if (row.sender_id === actor.userId) continue;
      const readBy = Array.isArray(row.read_by) ? row.read_by.map(String) : [];
      if (readBy.includes(actor.userId)) continue;
      const { error: updateErr } = await admin
        .from("messages")
        .update({ read_by: [...readBy, actor.userId] } as never)
        .eq("id", row.id);
      if (!updateErr) updated += 1;
    }

    return NextResponse.json({ ok: true, updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur serveur";
    return NextResponse.json({ message }, { status: 500 });
  }
}
