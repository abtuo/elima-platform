"use client";

import { useEffect, useState } from "react";
import { ProgressHeader } from "@/components/ui/ProgressHeader";
import { useTeacherContext } from "../TeacherContext";

type Profile = {
  full_name: string;
  email: string | null;
  phone: string | null;
};

export default function TeacherSettingsPage() {
  const { selectedClass, selectedSubject, selectedTerm } = useTeacherContext();
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
      <ProgressHeader
        title="Paramètres"
        subtitle="Gérez vos informations personnelles et votre contexte de démo."
      />

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

      <section className="elima-card space-y-3">
        <h2 className="text-lg font-semibold">Contexte par défaut</h2>
        <p className="text-sm text-slate-600">
          Pour la démo, le contexte est global et partagé via <span className="font-mono">TeacherContext</span>.
        </p>

        <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
          <p>
            <span className="font-semibold">Classe</span> : {selectedClass}
          </p>
          <p>
            <span className="font-semibold">Matière</span> : {selectedSubject}
          </p>
          <p>
            <span className="font-semibold">Période</span> : {selectedTerm}
          </p>
        </div>
      </section>
    </div>
  );
}
