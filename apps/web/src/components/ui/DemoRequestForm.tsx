"use client";

import { useState } from "react";

export function DemoRequestForm({ ctaLabel = "Demander une démo" }: { ctaLabel?: string }) {
  const [name, setName] = useState("");
  const [school, setSchool] = useState("");
  const [city, setCity] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function submit() {
    setLoading(true);
    setError(null);
    setSuccess(null);

    const res = await fetch("/api/demo-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, school, city, email, phone, message }),
    });

    setLoading(false);
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { message?: string } | null;
      setError(body?.message ?? "Envoi impossible");
      return;
    }

    setSuccess("Merci ! Nous revenons vers vous rapidement.");
    setName("");
    setSchool("");
    setCity("");
    setEmail("");
    setPhone("");
    setMessage("");
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-slate-700">Nom</label>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Votre nom"
            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Établissement</label>
          <input
            value={school}
            onChange={(event) => setSchool(event.target.value)}
            placeholder="Nom de l’école"
            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Ville</label>
          <input
            value={city}
            onChange={(event) => setCity(event.target.value)}
            placeholder="Ville"
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
          <label className="block text-sm font-medium text-slate-700">Téléphone</label>
          <input
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="+225 01 23 45 67 89"
            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">Message</label>
        <textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Vos besoins, nombre d’élèves, etc."
          rows={4}
          className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
        />
      </div>

      {error ? <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
      {success ? <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{success}</p> : null}

      <button
        onClick={submit}
        disabled={loading}
        className="w-full rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
      >
        {loading ? "Envoi…" : ctaLabel}
      </button>
    </div>
  );
}