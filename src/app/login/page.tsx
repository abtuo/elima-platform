import Link from "next/link";

const roles = [
  { value: "SCHOOL_ADMIN", label: "Directeur / Admin école" },
  { value: "TEACHER", label: "Enseignant" },
  { value: "PARENT", label: "Parent" },
  { value: "STUDENT", label: "Élève" },
];

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl items-center px-4 py-8 md:px-8">
      <section className="elima-card mx-auto w-full max-w-lg space-y-5">
        <h1 className="text-2xl font-bold">Se connecter à Elima</h1>
        <p className="text-sm text-slate-600">Choisissez votre profil pour accéder à votre espace dédié.</p>

        <form action="/api/auth/login" method="POST" className="space-y-4">
          <label className="block text-sm font-medium text-slate-700" htmlFor="role">
            Profil
          </label>
          <select
            id="role"
            name="role"
            defaultValue="SCHOOL_ADMIN"
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            {roles.map((role) => (
              <option key={role.value} value={role.value}>
                {role.label}
              </option>
            ))}
          </select>

          <button className="w-full rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white" type="submit">
            Continuer
          </button>
        </form>

        <p className="text-xs text-slate-500">
          Démo MVP sans mot de passe (connexion par rôle). Retour à l’accueil :{" "}
          <Link href="/" className="font-semibold text-[var(--primary)]">
            Accueil
          </Link>
        </p>
      </section>
    </main>
  );
}
