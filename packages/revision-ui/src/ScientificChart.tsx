import type { ScientificChartBlock } from "@elima/pedagogy";
import { buildChartGeometry } from "@elima/pedagogy";
import React from "react";

const colors = ["#19734b", "#6d42c7", "#d97706", "#0369a1", "#be123c"];

export function ScientificChart({ block, className }: { block: ScientificChartBlock; className?: string }) {
  const geometry = buildChartGeometry(block);
  const yUnit = block.yAxis.unit ? ` (${block.yAxis.unit})` : "";
  const xUnit = block.xAxis.unit ? ` (${block.xAxis.unit})` : "";
  return <figure className={className} aria-labelledby={`${block.id}-title`}>
    <h3 id={`${block.id}-title`} className="font-bold text-slate-900">{block.title}</h3>
    <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200 bg-white p-2" role="img" aria-label={`${block.title}. Axe horizontal ${block.xAxis.label}${xUnit}; axe vertical ${block.yAxis.label}${yUnit}.`}>
      <svg viewBox={`0 0 ${geometry.width} ${geometry.height}`} className="min-w-[36rem] w-full" aria-hidden="true">
        <rect width={geometry.width} height={geometry.height} fill="#fff" />
        {geometry.yTicks.map((tick) => { const y = geometry.plot.bottom - ((tick - geometry.yMin) / (geometry.yMax - geometry.yMin)) * (geometry.plot.bottom - geometry.plot.top); return <g key={tick}><line x1={geometry.plot.left} x2={geometry.plot.right} y1={y} y2={y} stroke="#e2e8f0" /><text x={geometry.plot.left - 8} y={y + 4} textAnchor="end" fontSize="11" fill="#64748b">{Number(tick.toPrecision(3))}</text></g>; })}
        <line x1={geometry.plot.left} x2={geometry.plot.left} y1={geometry.plot.top} y2={geometry.plot.bottom} stroke="#334155" />
        <line x1={geometry.plot.left} x2={geometry.plot.right} y1={geometry.plot.bottom} y2={geometry.plot.bottom} stroke="#334155" />
        {geometry.xTicks.map((tick, index) => <g key={`${tick.label}-${index}`}><line x1={tick.x} x2={tick.x} y1={geometry.plot.bottom} y2={geometry.plot.bottom + 5} stroke="#334155" /><text x={tick.x} y={geometry.plot.bottom + 19} textAnchor="middle" fontSize="11" fill="#64748b">{tick.label}</text></g>)}
        {geometry.series.map((series, index) => { const color = colors[index % colors.length]; const points = series.points.map((point) => `${point.x},${point.y}`).join(" "); return <g key={series.id}>{block.chartType !== "scatter" ? <polyline points={points} fill="none" stroke={color} strokeWidth="3" strokeLinejoin="round" /> : null}{series.points.map((point, pointIndex) => block.chartType === "bar" ? <rect key={pointIndex} x={point.x - 10 + index * 7} y={point.y} width="16" height={geometry.plot.bottom - point.y} rx="2" fill={color} opacity="0.82" /> : <circle key={pointIndex} cx={point.x} cy={point.y} r="4" fill={color}><title>{`${series.label}: ${point.value}`}</title></circle>)}</g>; })}
        <text x={(geometry.plot.left + geometry.plot.right) / 2} y={geometry.height - 12} textAnchor="middle" fontSize="12" fontWeight="600" fill="#334155">{block.xAxis.label}{xUnit}</text>
        <text x="15" y={(geometry.plot.top + geometry.plot.bottom) / 2} textAnchor="middle" fontSize="12" fontWeight="600" fill="#334155" transform={`rotate(-90 15 ${(geometry.plot.top + geometry.plot.bottom) / 2})`}>{block.yAxis.label}{yUnit}</text>
      </svg>
    </div>
    <div className="mt-2 flex flex-wrap gap-3 text-xs">{geometry.series.map((series, index) => <span key={series.id} className="inline-flex items-center gap-1"><i className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colors[index % colors.length] }} />{series.label}</span>)}</div>
    {block.caption ? <figcaption className="mt-2 text-xs text-slate-500">{block.caption}</figcaption> : null}
  </figure>;
}
