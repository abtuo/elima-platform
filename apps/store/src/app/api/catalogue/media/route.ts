import { NextResponse } from "next/server";
import { createIdentityClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const path = new URL(request.url).searchParams.get("path")?.trim();
  if (!path || path.length > 500 || path.includes("..") || !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return NextResponse.json({ message: "Image indisponible." }, { status: 404 });
  const client = await createIdentityClient();
  const { data, error } = await client.storage.from("store-product-media").createSignedUrl(path, 60);
  if (error || !data?.signedUrl) return NextResponse.json({ message: "Image indisponible." }, { status: 404 });
  return NextResponse.redirect(data.signedUrl, { headers: { "Cache-Control": "public, max-age=45" } });
}
