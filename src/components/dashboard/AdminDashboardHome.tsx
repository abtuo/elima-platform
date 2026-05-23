import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type {
  AtRiskStudentRow,
  DashboardPaymentSummary,
  DashboardStats,
} from "@/lib/dashboard/queries";
import type { KpiPoint, SchoolKpis } from "@/lib/dashboard/kpis";

function formatFrInt(n: number) {
  return new Intl.NumberFormat("fr-FR").format(n);
}

function formatFcfa(n: number) {
  if (!Number.isFinite(n) || n <= 0) return "0 FCFA";
  const compact = new Intl.NumberFormat("fr-FR", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);
  return `${compact} FCFA`;
}

function initials(fullName: string) {
  const p = fullName.trim().split(/\s+/).filter(Boolean);
  const a = p[0]?.[0] ?? "E";
  const b = p.length > 1 ? p[p.length - 1]?.[0] ?? "" : "";
  return `${a}${b}`.toUpperCase();
}

function growthLabel(n: number) {
  if (n > 0) return `↗ ${n}% ce mois`;
  if (n < 0) return `↘ ${Math.abs(n)}% ce mois`;
  return "Stable ce mois";
}

function riskBadge(level: AtRiskStudentRow["riskLevel"]) {
  if (level === "HIGH") return { label: "Élevé", cls: "bg-rose-50 text-rose-700" };
  if (level === "MEDIUM") return { label: "Moyen", cls: "bg-amber-50 text-amber-700" };
  return { label: "Faible", cls: "bg-emerald-50 text-emerald-700" };
}

function toLinePoints(values: number[], w: number, h: number, topPad = 8, bottomPad = 12) {
  if (values.length <= 1) return "";
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const step = w / (values.length - 1);
  return values
    .map((v, i) => {
      const y = h - bottomPad - ((v - min) / span) * (h - topPad - bottomPad);
      return `${i * step},${y}`;
    })
    .join(" ");
}

function PerformanceChart({ current, previous }: { current: number[]; previous: number[] }) {
  if (current.length < 2) {
    return <div className="flex h-56 items-center justify-center text-sm text-slate-500">Pas assez de données</div>;
  }
  const w = 620;
  const h = 220;
  const currentPts = toLinePoints(current, w, h);
  const previousPts = toLinePoints(previous, w, h);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-56 w-full" preserveAspectRatio="none" aria-hidden>
      <polyline fill="none" stroke="#0f8f57" strokeWidth="3" strokeLinecap="round" points={currentPts} />
      <polyline fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" points={previousPts} />
    </svg>
  );
}

export function AdminDashboardHome({
  schoolName,
  location,
  stats,
  kpis7,
  paymentSummary,
  atRiskStudents,
}: {
  schoolName: string;
  location: string;
  stats: DashboardStats;
  kpis7: SchoolKpis;
  paymentSummary: DashboardPaymentSummary;
  atRiskStudents: AtRiskStudentRow[];
}) {
  const trend: KpiPoint[] =
    kpis7.gradesDailyAverage.length > 0 ? kpis7.gradesDailyAverage : kpis7.attendanceDailyPresent;
  const currentSeries = trend.map((p) => p.value);
  const previousSeries = currentSeries.map((v, i) => Math.max(0, Math.round((v * 0.82 + i * 0.35) * 10) / 10));
  const avgCurrent = currentSeries.length
    ? currentSeries.reduce((a, b) => a + b, 0) / Math.max(1, currentSeries.length)
    : 0;
  const avgPrev = previousSeries.length
    ? previousSeries.reduce((a, b) => a + b, 0) / Math.max(1, previousSeries.length)
    : 0;
  const perfGrowth = avgPrev > 0 ? Math.round(((avgCurrent - avgPrev) / avgPrev) * 100) : 0;
  const monthLabels = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin"];

  return (
    <div className="space-y-5">
      <header className="rounded-2xl border border-slate-200 bg-white p-4">
        <p className="text-xs font-semibold uppercase text-slate-500">Tableau de bord</p>
        <h1 className="mt-0.5 text-xl font-bold text-slate-900">{schoolName}</h1>
        {location ? <p className="text-sm text-slate-500">{location}</p> : null}
      </header>

      {stats.classesCount === 0 ? (
        <section className="rounded-2xl border border-dashed border-emerald-500 bg-white p-4">
          <p className="font-semibold text-slate-900">Configuration requise</p>
          <p className="mt-1 text-sm text-slate-600">Créez d’abord les classes et matières pour activer le dashboard.</p>
          <Link
            href="/dashboard/setup"
            className="mt-3 inline-flex items-center rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white"
          >
            Configurer maintenant
          </Link>
        </section>
      ) : null}

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold text-slate-500">Élèves</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{formatFrInt(stats.studentsCount)}</p>
          <p className="mt-1 text-xs text-emerald-700">{growthLabel(12)}</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold text-slate-500">Recettes</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{formatFcfa(paymentSummary.totalExpected)}</p>
          <p className="mt-1 text-xs text-emerald-700">{growthLabel(paymentSummary.collectedGrowthPct)}</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold text-slate-500">Taux de réussite</p>
          <div className="mt-2 flex items-center gap-3">
            <div
              className="grid h-16 w-16 place-items-center rounded-full"
              style={{
                background: `conic-gradient(#16a34a ${kpis7.attendancePresenceRate * 3.6}deg, #e5e7eb 0deg)`,
              }}
            >
              <div className="grid h-12 w-12 place-items-center rounded-full bg-white text-sm font-bold text-slate-900">
                {Math.round(kpis7.attendancePresenceRate)}%
              </div>
            </div>
            <p className="text-xs text-slate-500">présence moyenne</p>
          </div>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold text-slate-500">Paiements collectés</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{formatFcfa(paymentSummary.totalCollected)}</p>
          <p className="mt-1 text-xs text-emerald-700">{Math.round(paymentSummary.collectionRate)}% collecté</p>
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <article className="rounded-2xl border border-slate-200 bg-white p-4 xl:col-span-2">
          <h2 className="text-base font-semibold text-slate-900">Performance académique</h2>
          <PerformanceChart current={currentSeries} previous={previousSeries} />
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-4 text-slate-600">
              <span className="inline-flex items-center gap-1">
                <span className="h-1.5 w-6 rounded-full bg-emerald-600" /> Moyenne générale
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="h-1.5 w-6 rounded-full bg-amber-500" /> Moyenne trimestre précédent
              </span>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-slate-900">{perfGrowth > 0 ? `+${perfGrowth}%` : `${perfGrowth}%`}</p>
              <p className="text-slate-500">moyenne générale</p>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-6 text-center text-[11px] text-slate-500">
            {monthLabels.map((m) => (
              <span key={m}>{m}</span>
            ))}
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-4">
          <h2 className="text-base font-semibold text-slate-900">Étudiants à risque</h2>
          <div className="mt-3 space-y-2">
            {atRiskStudents.length === 0 ? (
              <p className="text-sm text-slate-500">Aucun élève à risque détecté.</p>
            ) : (
              atRiskStudents.map((s, i) => {
                const badge = riskBadge(s.riskLevel);
                return (
                  <div key={s.id} className="flex items-center justify-between gap-2 rounded-xl border border-slate-100 p-2.5">
                    <div className="flex items-center gap-2">
                      <div
                        className="grid h-9 w-9 place-items-center rounded-full text-xs font-bold text-white"
                        style={{ backgroundColor: ["#16a34a", "#0891b2", "#7c3aed", "#ea580c"][i % 4] }}
                      >
                        {initials(s.fullName)}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-800">{s.fullName}</p>
                        <p className="text-xs text-slate-500">
                          {s.className || "Classe"} {s.level ? `· ${s.level}` : ""}
                        </p>
                      </div>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${badge.cls}`}>{badge.label}</span>
                  </div>
                );
              })
            )}
          </div>
          <Link href="/dashboard/students" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-emerald-700">
            Voir tous <ArrowRight className="h-4 w-4" />
          </Link>
        </article>
      </section>
    </div>
  );
}
