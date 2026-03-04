import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function ParentSettingsPage() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();

  return (
    <div className="space-y-6">
      <div className="elima-card">
        <h1 className="text-2xl font-bold text-[var(--accent)]">Paramètres</h1>
        <p className="mt-2 text-sm text-slate-600">Préférences parent (démo).</p>
      </div>

      <section className="elima-card space-y-3">
        <h2 className="text-lg font-semibold">Compte</h2>
        <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
          <p>
            <span className="font-semibold">Téléphone</span> : {data.user?.phone ?? "—"}
          </p>
          <p>
            <span className="font-semibold">User ID</span> : {data.user?.id ?? "—"}
          </p>
        </div>
        <p className="text-sm text-slate-600">
          Les préférences seront ajoutées plus tard (notifications WhatsApp, langue, etc.).
        </p>
      </section>
    </div>
  );
}
