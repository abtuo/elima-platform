import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createSupabaseAdminServerClient } from "@/lib/supabase/server";
import { resolveCurrentSchoolId } from "@/lib/finance/queries";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { StatCard } from "@/components/dashboard/StatCard";

type Row = {
  status: "ABSENT" | "LATE";
  reason: string | null;
  student: { full_name: string; parent_phone: string | null } | { full_name: string; parent_phone: string | null }[] | null;
  class: { name: string } | { name: string }[] | null;
};

function pickOne<T>(v: T[] | T | null | undefined): T | null {
  return Array.isArray(v) ? (v[0] ?? null) : (v ?? null);
}

export default async function DashboardAttendancePage() {
  const schoolId = await resolveCurrentSchoolId();
  const todayStr = new Date().toISOString().slice(0, 10);

  let rows: Row[] = [];
  if (schoolId) {
    const admin = await createSupabaseAdminServerClient();
    const { data } = await admin
      .from("attendance")
      .select("status, reason, student:students(full_name, parent_phone), class:classes(name)")
      .eq("school_id", schoolId)
      .eq("date", todayStr)
      .in("status", ["ABSENT", "LATE"])
      .range(0, 5000);
    rows = (data as Row[]) ?? [];
  }

  const items = rows
    .map((r) => ({
      status: r.status,
      reason: r.reason,
      fullName: String(pickOne(r.student)?.full_name ?? "Élève"),
      parentPhone: pickOne(r.student)?.parent_phone ?? null,
      className: String(pickOne(r.class)?.name ?? ""),
    }))
    .sort((a, b) => a.className.localeCompare(b.className, "fr") || a.fullName.localeCompare(b.fullName, "fr"));

  const absentCount = items.filter((i) => i.status === "ABSENT").length;
  const lateCount = items.filter((i) => i.status === "LATE").length;

  return (
    <div className="space-y-6">
      <header className="elima-card">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-[var(--accent)]">Assiduité du jour</h1>
            <p className="mt-1 text-sm text-slate-600">
              Élèves absents ou en retard aujourd&apos;hui ({todayStr}).
            </p>
          </div>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            <ArrowLeft size={16} /> Tableau de bord
          </Link>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard title="Absents aujourd'hui" value={absentCount} status={absentCount > 0 ? "danger" : "success"} />
        <StatCard title="Retards aujourd'hui" value={lateCount} status={lateCount > 0 ? "warning" : "default"} />
        <StatCard title="Total signalé" value={items.length} />
      </section>

      <section className="elima-card space-y-3">
        <h2 className="text-lg font-semibold">Détail</h2>
        {items.length === 0 ? (
          <EmptyState
            title="Aucune absence ni retard aujourd'hui"
            description="Les appels enregistrés par les enseignants apparaîtront ici."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="py-2 pr-3">Élève</th>
                  <th className="py-2 pr-3">Classe</th>
                  <th className="py-2 pr-3">Statut</th>
                  <th className="py-2 pr-3">Motif</th>
                  <th className="py-2 pr-3">Téléphone parent</th>
                </tr>
              </thead>
              <tbody>
                {items.map((i, idx) => (
                  <tr key={`${i.fullName}-${idx}`} className="border-b border-slate-100">
                    <td className="py-2 pr-3 font-semibold text-slate-800">{i.fullName}</td>
                    <td className="py-2 pr-3 text-slate-600">{i.className}</td>
                    <td className="py-2 pr-3">
                      <span
                        className={
                          i.status === "ABSENT"
                            ? "rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-700"
                            : "rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700"
                        }
                      >
                        {i.status === "ABSENT" ? "Absent" : "Retard"}
                      </span>
                    </td>
                    <td className="py-2 pr-3 text-slate-600">{i.reason || "—"}</td>
                    <td className="py-2 pr-3 text-slate-600">{i.parentPhone || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
