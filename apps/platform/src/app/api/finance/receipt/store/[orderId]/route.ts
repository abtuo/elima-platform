import { NextResponse } from "next/server";
import { createSupabaseAdminServerClient } from "@/lib/supabase/server";
import { resolveFinanceActor } from "@/lib/finance/server";
import { assertStudentAccess } from "@/lib/portal/queries";
import { buildStoreOrderInvoicePdf } from "@/lib/finance/store-invoice-pdf";
import {
  SCHOOL_INVOICE_SELECT,
  currencyFromSchool,
  firstRelation,
  loadSchoolLogo,
  resolveSchoolForInvoice,
  schoolIdentityFromRow,
  type SchoolRelation,
} from "@/lib/finance/invoice-school";

type StudentRelation = {
  full_name?: string;
  class?: { name?: string } | Array<{ name?: string }> | null;
  school?: SchoolRelation | SchoolRelation[] | null;
};

export async function GET(_request: Request, { params }: { params: Promise<{ orderId: string }> }) {
  try {
    const { orderId } = await params;
    const admin = await createSupabaseAdminServerClient();

    const { data: order } = await admin
      .from("store_orders")
      .select(
        `id, total_amount, invoice_no, payment_method, payment_provider, payment_status, pickup_location, created_at, student_id, school_id,
         student:students!store_orders_student_id_fkey(
           full_name,
           class:classes!students_class_id_fkey(name),
           school:schools!students_school_id_fkey(${SCHOOL_INVOICE_SELECT})
         )`,
      )
      .eq("id", orderId)
      .maybeSingle();

    if (!order) return NextResponse.json({ message: "Commande introuvable" }, { status: 404 });
    if (String((order as { payment_status: string }).payment_status) !== "paid") {
      return NextResponse.json({ message: "Facture indisponible pour cette commande." }, { status: 400 });
    }

    const studentId = String((order as { student_id: string }).student_id);
    const schoolId = String((order as { school_id: string }).school_id);

    const actor = await resolveFinanceActor();
    const isFinanceStaff = !("error" in actor) && actor.schoolId === schoolId;
    if (!isFinanceStaff) {
      const access = await assertStudentAccess(studentId);
      if (!access) return NextResponse.json({ message: "Acces refuse" }, { status: 403 });
    }

    const { data: items } = await admin
      .from("store_order_items")
      .select("name, quantity, unit_price, total_price")
      .eq("order_id", orderId);

    const studentWrap = firstRelation((order as { student?: StudentRelation | StudentRelation[] }).student);
    const classRow = firstRelation(studentWrap?.class);
    const schoolRow = await resolveSchoolForInvoice(admin, schoolId, firstRelation(studentWrap?.school));
    const currency = currencyFromSchool(schoolRow);
    const logo = await loadSchoolLogo(admin, schoolRow, _request.url);

    const invoiceNo = String((order as { invoice_no?: string | null }).invoice_no ?? orderId.slice(0, 8));
    const pdfBytes = await buildStoreOrderInvoicePdf({
      school: schoolIdentityFromRow(schoolRow),
      studentName: String(studentWrap?.full_name ?? "\u00c9l\u00e8ve"),
      className: classRow?.name ? String(classRow.name) : undefined,
      invoiceNo,
      totalAmount: Number((order as { total_amount: number }).total_amount),
      currency,
      method: String((order as { payment_method?: string | null }).payment_method ?? "mobile_money"),
      provider: (order as { payment_provider?: string | null }).payment_provider,
      paidAt: String((order as { created_at: string }).created_at),
      pickupLocation: String((order as { pickup_location?: string }).pickup_location ?? "Retrait \u00e0 l'\u00e9cole"),
      items: ((items ?? []) as Array<{ name: string; quantity: number; unit_price: number; total_price: number }>).map(
        (i) => ({
          name: String(i.name),
          quantity: Number(i.quantity),
          unitPrice: Number(i.unit_price),
          totalPrice: Number(i.total_price),
        }),
      ),
      logo,
    });

    const safe = new Uint8Array(pdfBytes);
    return new NextResponse(new Blob([safe], { type: "application/pdf" }), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="facture-${invoiceNo}.pdf"`,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur serveur";
    return NextResponse.json({ message }, { status: 500 });
  }
}
