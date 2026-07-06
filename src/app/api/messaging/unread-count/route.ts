import { NextResponse } from "next/server";
import { getUnreadMessageCountForCurrentUser } from "@/lib/messaging/queries";

export async function GET() {
  try {
    const total = await getUnreadMessageCountForCurrentUser();
    return NextResponse.json({ total });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur serveur";
    return NextResponse.json({ message }, { status: 500 });
  }
}
