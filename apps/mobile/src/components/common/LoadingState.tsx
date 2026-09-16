export function LoadingState({ label = "Chargement..." }: { label?: string }) {
  return (
    <div className="card flex items-center justify-center gap-3 px-6 py-12">
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      <span className="text-sm text-gray-500">{label}</span>
    </div>
  );
}
