import type { SupabaseClient } from "@supabase/supabase-js";

export type ParentInvoiceRow = {
  id: string;
  kind: "school_fee" | "store_order";
  invoiceNo: string;
  studentId: string;
  studentName: string;
  className: string;
  amount: number;
  method: string;
  paidAt: string;
  label: string;
  downloadHref: string;
};

const METHOD_LABELS: Record<string, string> = {
  mobile_money: "Mobile Money",
  card: "Carte bancaire",
  transfer: "Virement",
  cash: "Espèces",
};

function methodLabel(method: string, provider?: string | null) {
  const label = METHOD_LABELS[method] ?? method;
  const providerText = provider?.trim();
  return providerText ? `${label} (${providerText})` : label;
}

export async function getParentInvoices(
  admin: SupabaseClient,
  studentIds: string[],
): Promise<ParentInvoiceRow[]> {
  if (studentIds.length === 0) return [];

  const [{ data: payments }, { data: orders }] = await Promise.all([
    admin
      .from("payments")
      .select(
        `id, amount, method, payment_provider, receipt_no, paid_at, created_at, student_id,
         student:students!payments_student_id_fkey(full_name, class:classes!students_class_id_fkey(name))`,
      )
      .in("student_id", studentIds)
      .eq("status", "paid")
      .order("paid_at", { ascending: false, nullsFirst: false }),
    admin
      .from("store_orders")
      .select(
        `id, total_amount, payment_method, payment_provider, invoice_no, created_at, student_id, order_status,
         student:students!store_orders_student_id_fkey(full_name, class:classes!students_class_id_fkey(name))`,
      )
      .in("student_id", studentIds)
      .eq("payment_status", "paid")
      .neq("order_status", "cancelled")
      .order("created_at", { ascending: false }),
  ]);

  const rows: ParentInvoiceRow[] = [];

  for (const p of (payments ?? []) as Array<{
    id: string;
    amount: number;
    method: string;
    payment_provider: string | null;
    receipt_no: string | null;
    paid_at: string | null;
    created_at: string;
    student_id: string;
    student?: Array<{ full_name?: string; class?: Array<{ name?: string }> }> | { full_name?: string; class?: Array<{ name?: string }> };
  }>) {
    const student = Array.isArray(p.student) ? p.student[0] : p.student;
    const classRef = student?.class;
    const className = Array.isArray(classRef) ? classRef[0]?.name : (classRef as { name?: string } | undefined)?.name;
    rows.push({
      id: String(p.id),
      kind: "school_fee",
      invoiceNo: String(p.receipt_no ?? p.id.slice(0, 8)),
      studentId: String(p.student_id),
      studentName: String(student?.full_name ?? "Élève"),
      className: String(className ?? "—"),
      amount: Number(p.amount),
      method: methodLabel(p.method, p.payment_provider),
      paidAt: String(p.paid_at ?? p.created_at),
      label: "Frais de scolarité",
      downloadHref: `/api/finance/receipt/${p.id}`,
    });
  }

  for (const o of (orders ?? []) as Array<{
    id: string;
    total_amount: number;
    payment_method: string | null;
    payment_provider: string | null;
    invoice_no: string | null;
    created_at: string;
    student_id: string;
    order_status: string;
    student?: Array<{ full_name?: string; class?: Array<{ name?: string }> }> | { full_name?: string; class?: Array<{ name?: string }> };
  }>) {
    const student = Array.isArray(o.student) ? o.student[0] : o.student;
    const classRef = student?.class;
    const className = Array.isArray(classRef) ? classRef[0]?.name : (classRef as { name?: string } | undefined)?.name;
    rows.push({
      id: String(o.id),
      kind: "store_order",
      invoiceNo: String(o.invoice_no ?? o.id.slice(0, 8)),
      studentId: String(o.student_id),
      studentName: String(student?.full_name ?? "Élève"),
      className: String(className ?? "—"),
      amount: Number(o.total_amount),
      method: methodLabel(o.payment_method ?? "mobile_money", o.payment_provider),
      paidAt: String(o.created_at),
      label: "Fournitures scolaires",
      downloadHref: `/api/finance/receipt/store/${o.id}`,
    });
  }

  rows.sort((a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime());
  return rows;
}

export type ExistingStoreOrder = {
  orderId: string;
  invoiceNo: string;
  totalAmount: number;
  orderStatus: string;
  paymentMethod: string;
  createdAt: string;
  itemCount: number;
  items: Array<{ name: string; quantity: number; totalPrice: number }>;
  downloadHref: string;
};

export async function getExistingStoreOrderForStudent(
  admin: SupabaseClient,
  studentId: string,
  classId: string,
): Promise<ExistingStoreOrder | null> {
  const { data: order } = await admin
    .from("store_orders")
    .select("id, total_amount, invoice_no, order_status, payment_method, payment_provider, payment_status, created_at")
    .eq("student_id", studentId)
    .eq("class_id", classId)
    .eq("payment_status", "paid")
    .neq("order_status", "cancelled")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!order) return null;

  const orderId = String((order as { id: string }).id);
  const { data: items } = await admin
    .from("store_order_items")
    .select("name, quantity, total_price")
    .eq("order_id", orderId);

  const itemRows = ((items ?? []) as Array<{ name: string; quantity: number; total_price: number }>).map((i) => ({
    name: String(i.name),
    quantity: Number(i.quantity),
    totalPrice: Number(i.total_price),
  }));

  return {
    orderId,
    invoiceNo: String((order as { invoice_no?: string | null }).invoice_no ?? orderId.slice(0, 8)),
    totalAmount: Number((order as { total_amount: number }).total_amount),
    orderStatus: String((order as { order_status: string }).order_status),
    paymentMethod: methodLabel(
      String((order as { payment_method?: string | null }).payment_method ?? "mobile_money"),
      (order as { payment_provider?: string | null }).payment_provider,
    ),
    createdAt: String((order as { created_at: string }).created_at),
    itemCount: itemRows.length,
    items: itemRows,
    downloadHref: `/api/finance/receipt/store/${orderId}`,
  };
}
