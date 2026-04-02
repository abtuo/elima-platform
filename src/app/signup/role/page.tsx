import Link from "next/link";

const roles = [
  {
    href: "/signup/admin",
    title: "Administrateur d’école",
    description: "Créer l’établissement et piloter la plateforme.",
  },
  {
    href: "/signup/teacher",
    title: "Enseignant",
    description: "Rejoindre une école déjà active sur Elima.",
  },
  {
    href: "/signup/parent",
    title: "Parent d’élève",
    description: "Accéder au suivi des enfants et aux messages.",
  },
];

export default function SignupRolePage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl items-center px-4 py-10 md:px-8">
      <section className="w-full space-y-6">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase text-[var(--primary)]">Inscription</p>
          <h1 className="text-2xl font-bold text-[var(--accent)]">Je suis…</h1>
          <p className="text-sm text-slate-600">Choisissez le rôle correspondant à votre profil.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {roles.map((role) => (
            <Link
              key={role.href}
              href={role.href}
              className="elima-card group flex h-full flex-col justify-between gap-4 border border-transparent transition hover:border-[var(--primary)]"
            >
              <div className="space-y-2">
                <h2 className="text-lg font-semibold text-[var(--accent)] group-hover:text-[var(--primary)]">
                  {role.title}
                </h2>
                <p className="text-sm text-slate-600">{role.description}</p>
              </div>
              <span className="text-sm font-semibold text-[var(--primary)]">Continuer →</span>
            </Link>
          ))}
        </div>

        <p className="text-sm text-slate-600">
          Déjà inscrit ?{" "}
          <Link href="/login" className="font-semibold text-[var(--primary)]">
            Se connecter
          </Link>
        </p>
      </section>
    </main>
  );
}