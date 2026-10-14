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

    try {
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
    } catch { setError("Connexion impossible. Réessayez ou contactez contact@elima.africa."); }
    finally { setLoading(false); }
  }

  return (
    <form className="space-y-3" onSubmit={event => { event.preventDefault(); void submit(); }}>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-slate-700">Nom</label>
          <input
            id="name" name="name" required autoComplete="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Votre nom"
            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label htmlFor="school" className="block text-sm font-medium text-slate-700">Établissement</label>
          <input
            id="school" name="school" required autoComplete="organization"
            value={school}
            onChange={(event) => setSchool(event.target.value)}
            placeholder="Nom de l’école"
            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label htmlFor="city" className="block text-sm font-medium text-slate-700">Ville</label>
          <input
            id="city" name="city"
            value={city}
            onChange={(event) => setCity(event.target.value)}
            placeholder="Ville"
            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-slate-700">Email</label>
          <input
            type="email"
            id="email" name="email" required autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="nom@ecole.ci"
            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-slate-700">Téléphone</label>
          <input
            id="phone" name="phone"  type="tel" autoComplete="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="+225 01 23 45 67 89"
            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
          />
        </div>
      </div>
      <div>
        <label htmlFor="message" className="block text-sm font-medium text-slate-700">Message</label>
        <textarea
          id="message" name="message"
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
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
      >
        {loading ? "Envoi…" : ctaLabel}
      </button>
    </form>
  );
}
