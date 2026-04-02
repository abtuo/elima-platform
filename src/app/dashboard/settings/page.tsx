"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";

type Profile = {
  full_name: string;
  email: string | null;
  phone: string | null;
};

export default function DashboardSettingsPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function loadProfile() {
      const res = await fetch("/api/profile");
      if (!res.ok) return;
      const data = (await res.json().catch(() => null)) as { profile?: Profile } | null;
      if (isMounted && data?.profile) {
        setFullName(data.profile.full_name ?? "");
        setEmail(data.profile.email ?? "");
        setPhone(data.profile.phone ?? "");
      }
    }
    loadProfile();
    return () => {
      isMounted = false;
    };
  }, []);

  async function submit() {
    setLoading(true);
    setStatus(null);
    setError(null);

    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullName, email, phone }),
    });

    setLoading(false);
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { message?: string } | null;
      setError(body?.message ?? "Mise à jour impossible");
      return;
    }

    setStatus("Vos informations ont été mises à jour.");
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Paramètres" subtitle="Gérez vos informations personnelles." />

      <section className="elima-card space-y-4">
        <h2 className="text-lg font-semibold text-[var(--accent)]">Profil</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-slate-700">Nom complet</label>
            <input
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              placeholder="Nom complet"
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Email</label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="email@ecole.ci"
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Téléphone</label>
            <input
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="+225 01 23 45 67 89"
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
            />
          </div>
        </div>

        {error ? <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
        {status ? <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{status}</p> : null}

        <button
          onClick={submit}
          disabled={loading}
          className="rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {loading ? "Mise à jour…" : "Enregistrer"}
        </button>
      </section>
    </div>
  );
}
