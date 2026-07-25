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
  if (all.length === 0) {
    return (
      <div className="flex h-56 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 text-sm text-slate-500">
        Aucune note disponible sur les années scolaires comparées.
      </div>
    );
  }
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

  const currentPoints = series
    .map((p, i) => (p.current === null ? null : { x: xAt(i), y: yAt(p.current), label: p.label }))
    .filter((p): p is { x: number; y: number; label: string } => p !== null);
  const previousPoints = series
    .map((p, i) => (p.previous === null ? null : { x: xAt(i), y: yAt(p.previous), label: p.label }))
    .filter((p): p is { x: number; y: number; label: string } => p !== null);
  const currentArea =
    currentPoints.length > 1
      ? `M ${currentPoints[0].x},${padT + innerH} L ${currentPoints.map((p) => `${p.x},${p.y}`).join(" L ")} L ${
          currentPoints[currentPoints.length - 1].x
        },${padT + innerH} Z`
      : "";
  const currentMonthIndex = series.findIndex((p) => p.isCurrentMonth);
  const currentMonthX = currentMonthIndex >= 0 ? xAt(currentMonthIndex) : null;

  const gridValues = [min, min + span / 2, max];

  return (
    <div>
      <svg viewBox={`0 0 ${w} ${h}`} className="h-56 w-full" preserveAspectRatio="xMidYMid meet" aria-label="Évolution de la moyenne">
        <defs>
          <linearGradient id="monthlyCurrentFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2E8B57" stopOpacity={0.18} />
            <stop offset="100%" stopColor="#2E8B57" stopOpacity={0.02} />
          </linearGradient>
        </defs>
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
        {currentMonthX !== null ? (
          <g>
            <line x1={currentMonthX} y1={padT} x2={currentMonthX} y2={padT + innerH} stroke="#0f172a" strokeOpacity={0.18} strokeDasharray="3 4" />
            <text x={Math.min(currentMonthX + 6, w - 86)} y={padT + 10} fontSize={9} fill="#475569">
              Nous sommes ici
            </text>
          </g>
        ) : null}
        {currentArea ? <path d={currentArea} fill="url(#monthlyCurrentFill)" /> : null}
        <polyline fill="none" stroke="#EAB308" strokeWidth={3} strokeDasharray="6 4" strokeLinecap="round" strokeLinejoin="round" points={lineFor("previous")} />
        <polyline fill="none" stroke="#166534" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" points={lineFor("current")} />
        {previousPoints.map((p) => (
          <g key={`${p.label}-previous`}>
            <circle cx={p.x} cy={p.y} r={5} fill="#ffffff" stroke="#EAB308" strokeWidth={2} />
            <circle cx={p.x} cy={p.y} r={2} fill="#EAB308" />
          </g>
        ))}
        {currentPoints.map((p) => (
          <g key={p.label}>
            <circle cx={p.x} cy={p.y} r={6} fill="#ffffff" stroke="#166534" strokeWidth={2.5} />
            <circle cx={p.x} cy={p.y} r={2.5} fill="#166534" />
          </g>
        ))}
        {series.map((p, i) => (
          <text key={`${p.label}-x`} x={xAt(i)} y={h - 8} fontSize={9} fill="#64748b" textAnchor="middle">
            {p.label}
          </text>
        ))}
      </svg>
      <div className="mt-2 flex flex-wrap gap-4 text-xs text-slate-600">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-0.5 w-5 rounded bg-[var(--primary)]" /> Année courante
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-0.5 w-5 rounded bg-[var(--secondary)]" /> Année précédente
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
