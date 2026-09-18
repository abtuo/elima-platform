import { EmptyState } from "@/components/dashboard/EmptyState";
import { StudentPortalView } from "@/components/portal/StudentPortalView";
import { getPortalContext } from "@/lib/portal/queries";

export default async function StudentHomePage() {
  const ctx = await getPortalContext();
  const me = ctx?.students?.[0];

  if (!me) {
    return (
      <EmptyState
        title="Profil élève introuvable"
        description="Votre compte n'est rattaché à aucun dossier élève. Contactez l'établissement."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="elima-card">
        <h1 className="text-2xl font-bold text-[var(--accent)]">Bonjour {me.fullName.split(" ")[0]}</h1>
        <p className="mt-1 text-sm text-slate-600">
          Classe {me.className} — voici un aperçu de ta scolarité.
        </p>
      </div>
      <StudentPortalView student={me} audience="student" />
    </div>
  );
}
