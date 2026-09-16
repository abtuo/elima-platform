"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Profile = {
  fullName: string;
  email: string;
  schoolName: string;
  classes: string[];
};

export default function TeacherOnboardingPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [mustChangeCode, setMustChangeCode] = useState(true);
  const [newCode, setNewCode] = useState("");
  const [confirmCode, setConfirmCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      const res = await fetch("/api/teacher/onboarding");
      const body = (await res.json().catch(() => null)) as
        | { message?: string; profile?: Profile; mustChangeCode?: boolean }
        | null;
      if (!res.ok) {
        if (active) {
          setError(body?.message ?? "Impossible de charger votre profil.");
          setLoading(false);
        }
        return;
      }
      if (!active) return;
      setProfile(body?.profile ?? null);
      setMustChangeCode(Boolean(body?.mustChangeCode));
      setLoading(false);
      if (!body?.mustChangeCode) {
        router.replace("/teacher");
      }
    }
    load().catch(() => {
      if (active) {
        setError("Impossible de charger votre profil.");
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, [router]);

  async function submit() {
    if (!/^\d{5}$/.test(newCode)) {
      setError("Le nouveau code doit contenir exactement 5 chiffres.");
      return;
    }
    if (newCode !== confirmCode) {
      setError("Les deux codes ne correspondent pas.");
      return;
    }
    setSaving(true);
    setError(null);
    const res = await fetch("/api/teacher/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newCode }),
    });
    setSaving(false);
    const body = (await res.json().catch(() => null)) as { message?: string; redirectTo?: string } | null;
    if (!res.ok) {
      setError(body?.message ?? "Impossible de mettre à jour votre code.");
      return;
    }
    router.replace(body?.redirectTo ?? "/teacher");
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl items-center px-4 py-8 md:px-8">
      <section className="elima-card mx-auto w-full max-w-2xl space-y-5">
        <h1 className="text-2xl font-bold">Premiere connexion enseignant</h1>
        <p className="text-sm text-slate-600">
          Verifiez vos informations puis remplacez le code provisoire par un nouveau code a 5 chiffres.
        </p>

        {loading ? <p className="text-sm text-slate-500">Chargement...</p> : null}
        {profile ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm">
            <p><span className="font-semibold">Nom:</span> {profile.fullName}</p>
            <p><span className="font-semibold">Email:</span> {profile.email}</p>
            <p><span className="font-semibold">Etablissement:</span> {profile.schoolName || "N/A"}</p>
            <p><span className="font-semibold">Classes:</span> {profile.classes.length ? profile.classes.join(", ") : "Aucune classe assignee"}</p>
          </div>
        ) : null}

        {mustChangeCode ? (
          <div className="space-y-3">
            <label className="block text-sm font-medium text-slate-700">Nouveau code (5 chiffres)</label>
            <input
              value={newCode}
              onChange={(e) => setNewCode(e.target.value)}
              maxLength={5}
              placeholder="12345"
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
            />

            <label className="block text-sm font-medium text-slate-700">Confirmer le nouveau code</label>
            <input
              value={confirmCode}
              onChange={(e) => setConfirmCode(e.target.value)}
              maxLength={5}
              placeholder="12345"
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
            />
          </div>
        ) : null}

        {error ? <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
        <button
          disabled={loading || saving || !mustChangeCode}
          onClick={submit}
          className="w-full rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {saving ? "Validation..." : "Valider et continuer"}
        </button>
      </section>
    </main>
  );
}
