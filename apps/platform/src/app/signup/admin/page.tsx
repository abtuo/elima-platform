"use client";

import { useState } from "react";
import Link from "next/link";

export default function SignupAdminPage() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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
        role: "SCHOOL_ADMIN",
        schoolName,
        city,
        phone,
      }),
    });

    setLoading(false);
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { message?: string } | null;
      setError(body?.message ?? "Inscription impossible");
      return;
    }

    setSuccess("Inscription réussie ! Vous pouvez maintenant vous connecter.");
    setFirstName("");
    setLastName("");
    setEmail("");
    setPassword("");
    setSchoolName("");
    setCity("");
    setPhone("");
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl items-center px-4 py-10 md:px-8">
      <section className="elima-card mx-auto w-full max-w-2xl space-y-6">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase text-[var(--primary)]">Inscription</p>
          <h1 className="text-2xl font-bold text-[var(--accent)]">Administrateur d’école</h1>
          <p className="text-sm text-slate-600">Créez l’établissement et votre compte de pilotage.</p>
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
            <label className="block text-sm font-medium text-slate-700">Nom de l’établissement</label>
            <input
              value={schoolName}
              onChange={(event) => setSchoolName(event.target.value)}
              placeholder="Collège Moderne"
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Ville</label>
            <input
              value={city}
              onChange={(event) => setCity(event.target.value)}
              placeholder="Abidjan"
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