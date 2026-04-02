import { NextResponse } from "next/server";
import { createSupabaseAdminServerClient } from "@/lib/supabase/server";
import { sendNotificationEmail } from "@/lib/email";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as null | {
    name?: string;
    school?: string;
    city?: string;
    email?: string;
    phone?: string;
    message?: string;
  };

  const name = String(body?.name ?? "").trim();
  const school = String(body?.school ?? "").trim();
  const city = String(body?.city ?? "").trim();
  const email = String(body?.email ?? "").trim().toLowerCase();
  const phone = String(body?.phone ?? "").trim();
  const message = String(body?.message ?? "").trim();

  if (!name || !school || !email) {
    return NextResponse.json({ message: "Nom, établissement et email requis." }, { status: 400 });
  }

  const admin = await createSupabaseAdminServerClient();
  const { data, error } = await admin
    .from("demo_requests")
    .insert({
      name,
      school,
      city: city || null,
      email,
      phone: phone || null,
      message: message || null,
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }

  try {
    await sendNotificationEmail({
      subject: "Nouvelle demande de démo Elima",
      html: `
        <h2>Nouvelle demande de démo</h2>
        <p><strong>Nom:</strong> ${name}</p>
        <p><strong>Établissement:</strong> ${school}</p>
        ${city ? `<p><strong>Ville:</strong> ${city}</p>` : ""}
        <p><strong>Email:</strong> ${email}</p>
        ${phone ? `<p><strong>Téléphone:</strong> ${phone}</p>` : ""}
        ${message ? `<p><strong>Message:</strong> ${message}</p>` : ""}
      `,
      text: `Nouvelle démo: ${name} (${email}) - école ${school}`,
    });
  } catch (mailError) {
    console.error("Demo request email error", mailError);
  }

  return NextResponse.json({ ok: true, id: data?.id ?? null });
}