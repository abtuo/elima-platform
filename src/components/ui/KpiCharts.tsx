"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Bar,
  BarChart,
} from "recharts";

type Point = { date: string; value: number };

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="min-w-0 rounded-3xl border border-slate-200/70 bg-white/70 p-5 shadow-sm backdrop-blur">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
      </div>
      <div className="h-64 w-full min-w-0">{children}</div>
    </section>
  );
}

export function AttendanceAreaChart({ present, absent }: { present: Point[]; absent: Point[] }) {
  const map = new Map<string, { date: string; present: number; absent: number }>();
  present.forEach((p) => map.set(p.date, { date: p.date, present: p.value, absent: 0 }));
  absent.forEach((p) => {
    const cur = map.get(p.date) ?? { date: p.date, present: 0, absent: 0 };
    cur.absent = p.value;
    map.set(p.date, cur);
  });
  const data = Array.from(map.values()).sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  return (
    <ChartCard title="Présences vs absences (par jour)">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorPresent" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#2563eb" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#2563eb" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="colorAbsent" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" opacity={0.35} />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
          <Tooltip />
          <Legend />
          <Area type="monotone" dataKey="present" name="Présents" stroke="#2563eb" fill="url(#colorPresent)" />
          <Area type="monotone" dataKey="absent" name="Absents" stroke="#ef4444" fill="url(#colorAbsent)" />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function GradesBarChart({ averageByDay }: { averageByDay: Point[] }) {
  return (
    <ChartCard title="Moyenne des notes (/20) par jour">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={averageByDay} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.35} />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} domain={[0, 20]} />
          <Tooltip />
          <Bar dataKey="value" name="Moyenne" fill="#16a34a" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
