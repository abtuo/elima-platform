import { AdminShell } from "@/components/admin/AdminShell";
import { requireStorePage } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";
export default async function AdminLayout({ children }: { children: React.ReactNode }) { const { session } = await requireStorePage(); return <AdminShell role={session.role} phone={session.phone}>{children}</AdminShell>; }
