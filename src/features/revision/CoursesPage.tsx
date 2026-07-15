import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { BookOpen, ChevronRight } from "lucide-react";
import { AppHeader } from "@/components/common/AppHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { PageContainer } from "@/components/layout/PageContainer";
import { MarkdownContent } from "@/components/revision/MarkdownContent";
import { SubjectIcon } from "@/components/revision/SubjectIcon";
import { getCourseSheets } from "@/services/revisionDataService";
import { useAuth } from "@/features/auth/AuthProvider";
import type { CourseSheet } from "@/types/revision";

export function CoursesPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [sheets, setSheets] = useState<CourseSheet[]>([]);

  useEffect(() => { getCourseSheets(profile.id).then(setSheets); }, [profile.id]);

  return (
    <PageContainer>
      <AppHeader title="Fiches de révision" subtitle="Bibliothèque personnelle" backTo="/student/reviser" accent="#7C3AED" />
      <div className="space-y-3">
        {sheets.length ? sheets.map((sheet) => (
          <button key={sheet.id} type="button" onClick={() => navigate(`/student/reviser/fiches/${encodeURIComponent(sheet.id)}`)} className="card tap flex w-full items-center gap-3 p-4 text-left">
            <SubjectIcon subject={sheet.subject} />
            <span className="min-w-0 flex-1"><span className="block truncate text-xs text-gray-500">{sheet.subject}</span><span className="block font-title text-base font-semibold text-accent">{sheet.title}</span><span className="mt-1 block text-xs text-gray-400">{sheet.createdAt}</span></span>
            <ChevronRight className="h-5 w-5 shrink-0 text-gray-300" />
          </button>
        )) : <EmptyState title="Aucune fiche" description="Génère une fiche depuis l’écran Réviser pour la retrouver ici." icon={BookOpen} />}
      </div>
    </PageContainer>
  );
}

export function CourseSheetDetailPage() {
  const { id } = useParams();
  const { profile } = useAuth();
  const [sheet, setSheet] = useState<CourseSheet | null | undefined>(undefined);

  useEffect(() => {
    getCourseSheets(profile.id).then((items) => setSheet(items.find((item) => item.id === id) ?? null));
  }, [profile.id, id]);

  if (sheet === undefined) return null;
  if (!sheet) return <PageContainer><AppHeader title="Fiche" backTo="/student/reviser/fiches" accent="#7C3AED" /><EmptyState title="Fiche introuvable" /></PageContainer>;

  return (
    <PageContainer>
      <AppHeader title={sheet.title} subtitle={`${sheet.subject} · ${sheet.topic}`} backTo="/student/reviser/fiches" accent="#7C3AED" />
      <div className="card overflow-hidden p-5 sm:p-6"><MarkdownContent content={sheet.content} variant="sheet" /></div>
    </PageContainer>
  );
}
