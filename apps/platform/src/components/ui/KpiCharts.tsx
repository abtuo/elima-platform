"use client";

import type { ClassAttendanceSummary, ClassGradeDistribution, SubjectAverageSummary } from "@/lib/dashboard/kpis";

type Point = { date: string; value: number };

function ChartCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="min-w-0 rounded-3xl border border-slate-200/70 bg-white/70 p-5 shadow-sm backdrop-blur">
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
        {subtitle ? <p className="mt-1 text-xs text-slate-500">{subtitle}</p> : null}
      </div>
      <div className="h-64 w-full min-w-0 overflow-hidden">{children}</div>
    </section>
  );
}

const gradeBuckets: Array<{ key: keyof ClassGradeDistribution["buckets"]; label: string; color: string }> = [
  { key: "below8", label: "<8", color: "#ef4444" },
  { key: "from8To10", label: "8-10", color: "#f97316" },
  { key: "from10To12", label: "10-12", color: "#f59e0b" },
  { key: "from12To14", label: "12-14", color: "#84cc16" },
  { key: "from14To16", label: "14-16", color: "#22c55e" },
  { key: "above16", label: "16+", color: "#0f766e" },
];

export function GradeDistributionByClassChart({ rows }: { rows: ClassGradeDistribution[] }) {
  return (
    <ChartCard title="Distribution des notes par classe" subtitle="Part des notes faibles, moyennes et fortes sur la période">
      {rows.length === 0 ? (
        <p className="text-sm text-slate-500">Aucune note sur la période.</p>
      ) : (
        <div className="flex h-full min-h-0 flex-col">
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
            {rows.map((row) => {
              const total = Math.max(1, row.totalGrades);
              return (
                <div key={row.classId} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <span className="truncate font-semibold text-slate-700">{row.className}</span>
                    <span className="shrink-0 tabular-nums text-slate-500">
                      {row.average !== null ? `${row.average}/20` : "-"} · {row.totalGrades} notes
                    </span>
                  </div>
                  <div className="flex h-4 overflow-hidden rounded-full bg-slate-100">
                    {gradeBuckets.map((bucket) => {
                      const value = row.buckets[bucket.key];
                      if (value <= 0) return null;
                      return (
                        <div
                          key={bucket.key}
                          title={`${bucket.label}: ${value} note(s)`}
                          style={{ width: `${(value / total) * 100}%`, backgroundColor: bucket.color }}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-3 shrink-0 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-500">
            {gradeBuckets.map((bucket) => (
              <span key={bucket.key} className="inline-flex items-center gap-1">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: bucket.color }} />
                {bucket.label}
              </span>
            ))}
          </div>
        </div>
      )}
    </ChartCard>
  );
}

export function ClassAttendanceFocusChart({ rows }: { rows: ClassAttendanceSummary[] }) {
  return (
    <ChartCard title="Classes à suivre côté assiduité" subtitle="Absences et retards cumulés sur la période">
      {rows.length === 0 ? (
        <p className="text-sm text-slate-500">Aucune présence enregistrée.</p>
      ) : (
        <div className="h-full space-y-2 overflow-y-auto pr-1">
          {rows.slice(0, 5).map((row) => {
            const incidents = row.absent + row.late;
            const maxIncidents = Math.max(1, ...rows.map((r) => r.absent + r.late));
            return (
              <div key={row.classId} className="rounded-xl border border-slate-100 px-3 py-2">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="font-semibold text-slate-800">{row.className}</span>
                  <span className="text-xs font-semibold text-slate-500">{row.rate}% présence</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-amber-500" style={{ width: `${Math.max(4, (incidents / maxIncidents) * 100)}%` }} />
                </div>
                <div className="mt-1 flex justify-between text-[11px] text-slate-500">
                  <span>{row.absent} absences</span>
                  <span>{row.late} retards</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </ChartCard>
  );
}

export function SubjectAverageChart({ rows }: { rows: SubjectAverageSummary[] }) {
  return (
    <ChartCard title="Matières qui tirent la moyenne" subtitle="Moyenne par matière, de la plus fragile à la plus solide">
      {rows.length === 0 ? (
        <p className="text-sm text-slate-500">Aucune note sur la période.</p>
      ) : (
        <div className="h-full space-y-2.5 overflow-y-auto pr-1">
          {rows.slice(0, 6).map((row) => {
            const color = row.average < 10 ? "bg-rose-500" : row.average < 12 ? "bg-amber-500" : "bg-emerald-500";
            return (
              <div key={row.subjectId} className="space-y-1">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="truncate font-semibold text-slate-800">{row.subjectName}</span>
                  <span className="shrink-0 font-semibold tabular-nums text-slate-700">{row.average}/20</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(100, (row.average / 20) * 100)}%` }} />
                </div>
                <p className="text-[11px] text-slate-500">{row.gradesCount} note(s)</p>
              </div>
            );
          })}
        </div>
      )}
    </ChartCard>
  );
}

function buildMergedDaily(present: Point[], absent: Point[]) {
  const map = new Map<string, { date: string; present: number; absent: number }>();
  present.forEach((p) => map.set(p.date, { date: p.date, present: p.value, absent: 0 }));
  absent.forEach((p) => {
    const cur = map.get(p.date) ?? { date: p.date, present: 0, absent: 0 };
    cur.absent = p.value;
    map.set(p.date, cur);
  });
  return Array.from(map.values()).sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

/** Graphique léger (SVG) — évite Recharts + es-toolkit qui cassent avec Turbopack. */
export function AttendanceAreaChart({ present, absent }: { present: Point[]; absent: Point[] }) {
  const data = buildMergedDaily(present, absent);
  const w = 560;
  const h = 220;
  const padL = 36;
  const padR = 12;
  const padT = 12;
  const padB = 28;
  const innerW = w - padL - padR;
  const innerH = h - padT - padB;
  const maxY = Math.max(1, ...data.map((d) => Math.max(d.present, d.absent)));
  const n = Math.max(1, data.length);
  const step = n <= 1 ? 0 : innerW / (n - 1);

  const xAt = (i: number) => (n <= 1 ? padL + innerW / 2 : padL + i * step);
  const yAt = (v: number) => padT + innerH - (v / maxY) * innerH;

  const presentPts = data.map((d, i) => `${xAt(i)},${yAt(d.present)}`).join(" ");
  const absentPts = data.map((d, i) => `${xAt(i)},${yAt(d.absent)}`).join(" ");
  const baseY = padT + innerH;
  const presentLine = data.map((d, i) => `${xAt(i)},${yAt(d.present)}`).join(" L ");
  const absentLine = data.map((d, i) => `${xAt(i)},${yAt(d.absent)}`).join(" L ");
  const presentArea = `M ${padL},${baseY} L ${presentLine} L ${padL + innerW},${baseY} Z`;
  const absentArea = `M ${padL},${baseY} L ${absentLine} L ${padL + innerW},${baseY} Z`;

  const labelStep = Math.max(1, Math.ceil(n / 6));
  const xLabelIndices = data.map((_, i) => i).filter((i) => i % labelStep === 0 || i === n - 1);

  return (
    <ChartCard title="Présences vs absences (par jour)">
      {data.length === 0 ? (
        <p className="text-sm text-slate-500">Aucune donnée sur la période.</p>
      ) : (
        <svg viewBox={`0 0 ${w} ${h}`} className="h-full w-full" preserveAspectRatio="xMidYMid meet" aria-label="Graphique présences et absences">
          <defs>
            <linearGradient id="kpiColorPresent" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#2563eb" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#2563eb" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="kpiColorAbsent" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <rect x={padL} y={padT} width={innerW} height={innerH} fill="none" stroke="#e2e8f0" strokeWidth={1} rx={4} />
          {[0, 0.25, 0.5, 0.75, 1].map((t) => {
            const y = padT + innerH * (1 - t);
            return (
              <g key={t}>
                <line x1={padL} y1={y} x2={padL + innerW} y2={y} stroke="#f1f5f9" strokeWidth={1} />
                <text x={4} y={y + 4} fontSize={10} fill="#64748b">
                  {Math.round(maxY * t)}
                </text>
              </g>
            );
          })}
          <path d={presentArea} fill="url(#kpiColorPresent)" stroke="#2563eb" strokeWidth={1.5} />
          <path d={absentArea} fill="url(#kpiColorAbsent)" stroke="#ef4444" strokeWidth={1.5} />
          <polyline fill="none" stroke="#2563eb" strokeWidth={2} points={presentPts} />
          <polyline fill="none" stroke="#ef4444" strokeWidth={2} points={absentPts} />
          {xLabelIndices.map((i) => {
            const d = data[i];
            return (
              <text key={d.date} x={xAt(i)} y={h - 6} fontSize={9} fill="#64748b" textAnchor="middle">
                {d.date.slice(5)}
              </text>
            );
          })}
          <g transform={`translate(${w - 140}, ${padT + 4})`}>
            <rect x={0} y={0} width={10} height={10} fill="#2563eb" rx={2} />
            <text x={14} y={9} fontSize={11} fill="#334155">
              Présents
            </text>
            <rect x={0} y={18} width={10} height={10} fill="#ef4444" rx={2} />
            <text x={14} y={27} fontSize={11} fill="#334155">
              Absents
            </text>
          </g>
        </svg>
      )}
    </ChartCard>
  );
}

export function GradesBarChart({ averageByDay }: { averageByDay: Point[] }) {
  const data = [...averageByDay].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  const maxBars = 14;
  const slice = data.length > maxBars ? data.slice(-maxBars) : data;

  return (
    <ChartCard title="Moyenne des notes (/20) par jour">
      {slice.length === 0 ? (
        <p className="text-sm text-slate-500">Aucune note sur la période.</p>
      ) : (
        <div className="flex h-full min-h-0 flex-col gap-2">
          <div className="flex h-44 items-end justify-between gap-1.5 border-b border-slate-100 pb-1">
            {slice.map((d) => {
              const chartH = 160;
              const barH = Math.max(6, Math.round((d.value / 20) * chartH));
              return (
                <div key={d.date} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1">
                  <div
                    className="w-full max-w-[28px] rounded-t-md bg-emerald-500/90 transition-all"
                    style={{ height: barH }}
                    title={`${d.date}: ${d.value}/20`}
                  />
                  <span className="truncate text-[9px] font-medium text-slate-500">{d.date.slice(5)}</span>
                </div>
              );
            })}
          </div>
          <div className="flex justify-between text-[10px] text-slate-400">
            <span>0</span>
            <span>/20</span>
          </div>
        </div>
      )}
    </ChartCard>
  );
}
