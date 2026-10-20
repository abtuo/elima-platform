import { NextResponse } from "next/server";
import { createIdentityClient, isIdentityConfigured } from "@/lib/supabase-server";
export async function POST() { if (isIdentityConfigured()) { const supabase = await createIdentityClient(); await supabase.auth.signOut(); } return NextResponse.json({ ok: true }); }
