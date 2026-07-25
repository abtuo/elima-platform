import { ProgressHeader } from "@/components/ui/ProgressHeader";
import { ActionCard } from "@/components/ui/ActionCard";
import { BookOpen, FileText, Link as LinkIcon } from "lucide-react";

export default function TeacherResourcesPage() {
  return (
    <div className="space-y-6">
      <ProgressHeader
        title="Ressources"
        subtitle="Supports de cours, documents, liens (démo UI — à brancher ensuite à Supabase)."
      />

      <section className="grid gap-4 md:grid-cols-2">
        <ActionCard
          title="Fiches d’exercices"
          description="Télécharger et partager des fiches par classe/matière."
          icon={<FileText size={18} />}
        />
        <ActionCard
          title="Liens utiles"
          description="Bibliothèque de liens pédagogiques."
          icon={<LinkIcon size={18} />}
        />
        <ActionCard
          title="Manuels"
          description="Accès rapide aux chapitres / programmes."
          icon={<BookOpen size={18} />}
        />
      </section>
    </div>
  );
}
