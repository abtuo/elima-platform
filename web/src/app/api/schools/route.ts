import { NextResponse } from "next/server";
import { createSupabaseAdminServerClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createSupabaseAdminServerClient();
    const { data, error } = await supabase
      .from("schools")
      .select("id, name, city")
      .order("name", { ascending: true });

    if (error) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }

    return NextResponse.json({ schools: data ?? [] });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur serveur";
    return NextResponse.json({ message }, { status: 500 });
  }
}