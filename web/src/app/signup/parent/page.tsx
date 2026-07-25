"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type SchoolOption = { id: string; name: string; city?: string | null };

export default function SignupParentPage() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [schools, setSchools] = useState<SchoolOption[]>([]);
  const [schoolsLoading, setSchoolsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function loadSchools() {
      setSchoolsLoading(true);
      const res = await fetch("/api/schools");
      if (!res.ok) {
        setSchoolsLoading(false);
        return;
      }
      const data = (await res.json().catch(() => null)) as { schools?: SchoolOption[] } | null;
      if (isMounted) {
        setSchools(Array.isArray(data?.schools) ? data!.schools : []);
        setSchoolsLoading(false);
      }
    }
    loadSchools();
    return () => {
      isMounted = false;
    };
  }, []);

  async function submit() {
    setLoading(true);
    setError(null);
    setSuccess(null);

    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName,
        lastName,
        email,
        password,
        role: "PARENT",
        schoolName,
        phone,
      }),
    });

    setLoading(false);
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { message?: string } | null;
      setError(body?.message ?? "Inscription impossible");
      return;
    }

    setSuccess("Inscription envoyée ! Vous pouvez maintenant vous connecter.");
    setFirstName("");
    setLastName("");
    setEmail("");
    setPassword("");
    setSchoolName("");
    setPhone("");
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl items-center px-4 py-10 md:px-8">
      <section className="elima-card mx-auto w-full max-w-2xl space-y-6">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase text-[var(--primary)]">Inscription</p>
          <h1 className="text-2xl font-bold text-[var(--accent)]">Parent d’élève</h1>
          <p className="text-sm text-slate-600">Associez votre compte à l’école de vos enfants.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-slate-700">Nom</label>
            <input
              value={lastName}
              onChange={(event) => setLastName(event.target.value)}
              placeholder="Nom"
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Prénom</label>
            <input
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
              placeholder="Prénom"
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Email</label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="nom@ecole.ci"
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Mot de passe</label>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Établissement</label>
            <select
              value={schoolName}
              onChange={(event) => setSchoolName(event.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
              disabled={schoolsLoading}
            >
              <option value="">Sélectionnez une école</option>
              {schools.map((school) => (
                <option key={school.id} value={school.name}>
                  {school.name}{school.city ? ` • ${school.city}` : ""}
                </option>
              ))}
            </select>
            {schoolsLoading ? (
              <p className="mt-2 text-xs text-slate-500">Chargement des écoles...</p>
            ) : null}
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
        {success ? <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{success}</p> : null}

        <button
          onClick={submit}
          disabled={loading}
          className="w-full rounded-xl bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
        >
          {loading ? "Inscription…" : "Créer mon compte"}
        </button>

        <p className="text-center text-sm text-slate-600">
          Déjà un compte ?{" "}
          <Link href="/login" className="font-semibold text-[var(--primary)]">
            Se connecter
          </Link>
        </p>
      </section>
    </main>
  );
}