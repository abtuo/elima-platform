import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminServerClient, createSupabaseServerClient } from "@/lib/supabase/server";
import { assertStudentAccess } from "@/lib/portal/queries";
import { getSupplyListForClass } from "@/lib/store/queries";
import { notifyStudentThread, recordInternalNotification } from "@/lib/messaging/create";
import { generateInvoiceNo } from "@/lib/finance/server";
import { getExistingStoreOrderForStudent } from "@/lib/finance/parent-invoices";
import { getAppNow } from "@/lib/app-date";
import { checkSchoolFeature } from "@/lib/plans-server";

const orderSchema = z.object({
  studentId: z.string().uuid(),
  packId: z.string().uuid(),
  itemIds: z.array(z.string().uuid()).min(1),
  paymentMethod: z.enum(["mobile_money", "card"]).optional(),
  provider: z.string().optional(),
});

function money(value: number) {
  return `${value.toLocaleString("fr-FR").replace(/[\u202f\u00a0]/g, " ")} FCFA`;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const studentId = url.searchParams.get("studentId")?.trim();
    if (!studentId) return NextResponse.json({ message: "studentId requis" }, { status: 400 });

    const student = await assertStudentAccess(studentId);
    if (!student) return NextResponse.json({ message: "Accès refusé" }, { status: 403 });

    const planErr = await checkSchoolFeature(student.schoolId, "store");
    if (planErr) return planErr;

    const admin = await createSupabaseAdminServerClient();
    const list = await getSupplyListForClass(admin, student.schoolId, student.classId, { publishedOnly: true });
    const existingOrder = await getExistingStoreOrderForStudent(admin, student.id, student.classId);

    if (!list) {
      return NextResponse.json({
        student,
        list: null,
        existingOrder,
        message: "Liste de fournitures non publiée.",
      });
    }

    return NextResponse.json({ student, list, existingOrder });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur serveur";
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: authData } = await supabase.auth.getUser();
    const userId = authData.user?.id;
    if (!userId) return NextResponse.json({ message: "Non authentifié" }, { status: 401 });

    const json = await request.json();
    const parsed = orderSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ message: "Données invalides" }, { status: 400 });
    }

    const student = await assertStudentAccess(parsed.data.studentId);
    if (!student) return NextResponse.json({ message: "Accès refusé" }, { status: 403 });

    const planErr = await checkSchoolFeature(student.schoolId, "store");
    if (planErr) return planErr;

    const admin = await createSupabaseAdminServerClient();

    const existingOrder = await getExistingStoreOrderForStudent(admin, student.id, student.classId);
    if (existingOrder) {
      return NextResponse.json(
        { message: "Une commande a déjà été passée pour cet élève.", existingOrder },
        { status: 409 },
      );
    }

    const list = await getSupplyListForClass(admin, student.schoolId, student.classId, { publishedOnly: true });
    if (!list?.packId) {
      return NextResponse.json({ message: "Liste ou pack indisponible." }, { status: 400 });
    }

    const selected = list.items.filter((item) => parsed.data.itemIds.includes(item.id));
    if (selected.length === 0) {
      return NextResponse.json({ message: "Sélectionnez au moins un article." }, { status: 400 });
    }

    const { data: parentRow } = await admin.from("parents").select("id").eq("user_id", userId).maybeSingle();
    const parentId = (parentRow as { id?: string } | null)?.id;
    if (!parentId) return NextResponse.json({ message: "Profil parent introuvable." }, { status: 400 });

    const totalAmount = selected.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    const paymentMethod = parsed.data.paymentMethod ?? "mobile_money";
    const providerLabel = parsed.data.provider?.trim() || (paymentMethod === "card" ? "Visa / Mastercard" : "Orange Money");
    const invoiceNo = generateInvoiceNo();

    const { data: order, error: orderErr } = await admin
      .from("store_orders")
      .insert({
        school_id: student.schoolId,
        parent_id: parentId,
        student_id: student.id,
        class_id: student.classId,
        pack_id: parsed.data.packId,
        total_amount: totalAmount,
        payment_status: "paid",
        order_status: "confirmed",
        pickup_location: "Retrait à l'école",
        invoice_no: invoiceNo,
        payment_method: paymentMethod,
        payment_provider: providerLabel,
      } as never)
      .select("id")
      .single();
    if (orderErr || !order) return NextResponse.json({ message: orderErr?.message ?? "Commande échouée" }, { status: 400 });

    const orderId = String((order as { id: string }).id);
    await admin.from("store_order_items").insert(
      selected.map((item) => ({
        order_id: orderId,
        product_id: item.productId,
        name: item.name,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        total_price: item.unitPrice * item.quantity,
      })) as never,
    );

    const itemSummary = selected.map((i) => `${i.quantity}× ${i.name}`).join(", ");
    const systemText = `Commande confirmée pour ${student.fullName} : ${itemSummary}. Total : ${money(totalAmount)}. Retrait à l'école sous 48h. Facture ${invoiceNo}.`;
    const parentText = `Commande passée (${money(totalAmount)}) via ${paymentMethod === "card" ? "Carte bancaire" : `Mobile Money (${providerLabel})`}).`;

    const { conversationId } = await notifyStudentThread(admin, {
      schoolId: student.schoolId,
      studentId: student.id,
      classId: student.classId,
      type: "store_order",
      title: `Fournitures — ${student.fullName}`,
      extraParticipantUserIds: [userId],
      messages: [
        { senderId: userId, senderRole: "PARENT", content: parentText, type: "text" },
        {
          senderId: null,
          senderRole: "SYSTEM",
          content: systemText,
          type: "store_link",
          metadata: { href: `/parent/invoices` },
        },
      ],
    });

    await recordInternalNotification(admin, {
      schoolId: student.schoolId,
      studentId: student.id,
      type: "STORE_ORDER",
      message: systemText,
    });

    return NextResponse.json({
      ok: true,
      orderId,
      invoiceNo,
      downloadHref: `/api/finance/receipt/store/${orderId}`,
      conversationId,
      totalAmount,
      itemCount: selected.length,
      createdAt: getAppNow().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur serveur";
    return NextResponse.json({ message }, { status: 500 });
  }
}
