export function AdminDashboardSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-24 rounded-2xl bg-slate-200/70" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-28 rounded-2xl bg-slate-200/70" />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        <div className="h-96 rounded-2xl bg-slate-200/70 xl:col-span-2" />
        <div className="h-96 rounded-2xl bg-slate-200/70" />
      </div>
    </div>
  );
}
