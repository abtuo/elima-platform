import { AlertTriangle, BarChart3, BookOpen, CheckCircle2, MessageCircleMore, School } from "lucide-react";
import { demoMetrics, demoStudents } from "@/lib/demo-data";

export default function DashboardPage() {
  const highRisk = demoMetrics.filter((m) => m.riskLevel === "HIGH").length;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-4 py-8 md:px-8">
      <header className="elima-card">
        <h1 className="text-2xl font-bold text-[var(--accent)]">Dashboard Direction</h1>
        <p className="text-sm text-slate-600">Suivi des performances, élèves à risque, et opérations académiques.</p>
        <form action="/api/auth/logout" method="POST" className="mt-3">
          <button className="rounded-lg border border-slate-300 px-3 py-1 text-xs">Se déconnecter</button>
        </form>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Écoles pilotes", value: 12, icon: School },
          { label: "Élèves suivis", value: 1320, icon: BookOpen },
          { label: "Notifications envoyées", value: 486, icon: MessageCircleMore },
          { label: "Élèves à risque élevé", value: highRisk, icon: AlertTriangle },
        ].map((kpi) => (
          <article className="elima-card" key={kpi.label}>
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">{kpi.label}</p>
              <kpi.icon size={18} className="text-[var(--primary)]" />
            </div>
            <p className="mt-2 text-2xl font-bold">{kpi.value}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="elima-card">
          <h2 className="mb-3 text-lg font-semibold">Élèves à risque</h2>
          <div className="space-y-3">
            {demoStudents.map((student) => {
              const metric = demoMetrics.find((m) => m.studentId === student.id);
              return (
                <div key={student.id} className="flex items-center justify-between rounded-xl border border-slate-200 p-3">
                  <div>
                    <p className="font-medium">{student.fullName}</p>
                    <p className="text-xs text-slate-500">
                      {student.className} • Moy: {student.average}/20 • Présence: {student.attendanceRate}%
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-semibold ${
                      metric?.riskLevel === "HIGH"
                        ? "bg-red-100 text-red-700"
                        : metric?.riskLevel === "MEDIUM"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-emerald-100 text-emerald-700"
                    }`}
                  >
                    {metric?.riskLevel}
                  </span>
                </div>
              );
            })}
          </div>
        </article>

        <article className="elima-card">
          <h2 className="mb-3 text-lg font-semibold">Suivi opérations MVP</h2>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-600" /> Présences quotidiennes</li>
            <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-600" /> Saisie notes & calcul moyennes</li>
            <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-600" /> Bulletin PDF par élève</li>
            <li className="flex items-center gap-2"><BarChart3 size={16} className="text-[var(--primary)]" /> Intelligence académique (risk_level / trend)</li>
          </ul>
        </article>
      </section>
    </main>
  );
}
