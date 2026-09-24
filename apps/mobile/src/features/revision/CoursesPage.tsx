import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { BookOpen } from "lucide-react";
import { AppHeader } from "@/components/common/AppHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { PageContainer } from "@/components/layout/PageContainer";
import { CourseSheetCard, CourseSheetContent } from "@elima/revision-ui";
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
          <CourseSheetCard key={sheet.id} sheet={sheet} onOpen={(item) => navigate(`/student/reviser/fiches/${encodeURIComponent(item.id)}`)} />
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
  if (!sheet) return <PageContainer><AppHeader title="Fiche" backTo="/student/reviser?mode=fiches" accent="#7C3AED" /><EmptyState title="Fiche introuvable" /></PageContainer>;

  return (
    <PageContainer>
      <AppHeader title={sheet.title} subtitle={`${sheet.subject} · ${sheet.topic}`} backTo="/student/reviser?mode=fiches" accent="#7C3AED" />
      <CourseSheetContent sheet={sheet} />
    </PageContainer>
  );
}
