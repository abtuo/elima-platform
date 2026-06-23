import Link from "next/link";
import type { AtRiskStudentDetail } from "@/lib/dashboard/cockpit";

function riskBadge(level: AtRiskStudentDetail["riskLevel"]) {
  if (level === "HIGH") return { label: "Élevé", cls: "bg-rose-100 text-rose-700" };
  if (level === "MEDIUM") return { label: "Moyen", cls: "bg-amber-100 text-amber-700" };
  return { label: "Faible", cls: "bg-emerald-100 text-emerald-700" };
}

function initials(fullName: string) {
  const p = fullName.trim().split(/\s+/).filter(Boolean);
  const a = p[0]?.[0] ?? "E";
  const b = p.length > 1 ? p[p.length - 1]?.[0] ?? "" : "";
  return `${a}${b}`.toUpperCase();
}

export function RiskStudentCard({ student }: { student: AtRiskStudentDetail }) {
  const badge = riskBadge(student.riskLevel);

  return (
    <div className="flex items-start justify-between gap-3 rounded-xl border border-slate-100 p-3">
      <div className="flex min-w-0 items-start gap-3">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--primary)]/10 text-xs font-bold text-[var(--primary)]">
          {initials(student.fullName)}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900">{student.fullName}</p>
          <p className="text-xs text-slate-500">
            {[student.className, student.level].filter(Boolean).join(" · ") || "Classe non renseignée"}
          </p>
          <p className="mt-1 text-xs text-slate-600">{student.reason}</p>
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-2">
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${badge.cls}`}>{badge.label}</span>
        <Link
          href={`/dashboard/students?student=${student.id}`}
          className="text-xs font-semibold text-[var(--primary)] hover:underline"
        >
          Voir profil
        </Link>
      </div>
    </div>
  );
}
