"use client";

import type { ClassPerformanceRow, MonthlyPerformancePoint } from "@/lib/dashboard/cockpit";

/** Monthly evolution of the school average — current period vs previous term. */
export function MonthlyAverageChart({ series }: { series: MonthlyPerformancePoint[] }) {
  if (series.length < 2) {
    return (
      <div className="flex h-56 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 text-sm text-slate-500">
        Pas assez de données pour tracer l&apos;évolution.
      </div>
    );
  }

  const w = 680;
  const h = 240;
  const padL = 28;
  const padB = 26;
  const padT = 14;
  const padR = 12;
  const innerW = w - padL - padR;
  const innerH = h - padT - padB;

  const all = series.flatMap((p) => [p.current, p.previous].filter((v): v is number => v !== null));
  const min = Math.max(0, Math.floor(Math.min(...all) - 1));
  const max = Math.min(20, Math.ceil(Math.max(...all) + 1));
  const span = max - min || 1;
  const step = innerW / (series.length - 1);

  const xAt = (i: number) => padL + i * step;
  const yAt = (v: number) => padT + innerH - ((v - min) / span) * innerH;

  const lineFor = (key: "current" | "previous") =>
    series
      .map((p, i) => (p[key] === null ? null : `${xAt(i)},${yAt(p[key] as number)}`))
      .filter(Boolean)
      .join(" ");

  const gridValues = [min, min + span / 2, max];

  return (
    <div>
      <svg viewBox={`0 0 ${w} ${h}`} className="h-56 w-full" preserveAspectRatio="xMidYMid meet" aria-label="Évolution de la moyenne">
        {gridValues.map((v) => {
          const y = yAt(v);
          return (
            <g key={v}>
              <line x1={padL} y1={y} x2={padL + innerW} y2={y} stroke="#f1f5f9" strokeWidth={1} />
              <text x={2} y={y + 3} fontSize={9} fill="#94a3b8">
                {Math.round(v)}
              </text>
            </g>
          );
        })}
        <polyline fill="none" stroke="#FFD700" strokeWidth={2} strokeDasharray="6 4" points={lineFor("previous")} />
        <polyline fill="none" stroke="#2E8B57" strokeWidth={2.5} strokeLinecap="round" points={lineFor("current")} />
        {series.map((p, i) =>
          p.current === null ? null : (
            <circle key={p.label} cx={xAt(i)} cy={yAt(p.current)} r={3} fill="#2E8B57" />
          ),
        )}
        {series.map((p, i) => (
          <text key={`${p.label}-x`} x={xAt(i)} y={h - 8} fontSize={9} fill="#64748b" textAnchor="middle">
            {p.label}
          </text>
        ))}
      </svg>
      <div className="mt-2 flex flex-wrap gap-4 text-xs text-slate-600">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-0.5 w-5 rounded bg-[var(--primary)]" /> Période courante
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-0.5 w-5 rounded bg-[var(--secondary)]" /> Trimestre précédent
        </span>
      </div>
    </div>
  );
}

/** Horizontal bars for class rankings (top / watch). */
export function ClassPerformanceBars({
  classes,
  tone,
}: {
  classes: ClassPerformanceRow[];
  tone: "good" | "watch";
}) {
  if (classes.length === 0) {
    return <p className="text-sm text-slate-500">Aucune donnée disponible.</p>;
  }
  const barColor = tone === "good" ? "bg-emerald-500" : "bg-amber-500";
  const textColor = tone === "good" ? "text-emerald-700" : "text-amber-700";

  return (
    <ul className="space-y-2.5">
      {classes.map((c) => (
        <li key={c.classId} className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-slate-800">{c.className}</span>
            <span className={`font-semibold tabular-nums ${textColor}`}>{c.average}/20</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div className={`h-full rounded-full ${barColor}`} style={{ width: `${Math.min(100, (c.average / 20) * 100)}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
