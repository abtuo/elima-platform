import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AppHeader } from "@/components/common/AppHeader";
import { PageContainer } from "@/components/layout/PageContainer";
import { MarkdownContent } from "@/components/revision/MarkdownContent";
import { EmptyState } from "@/components/common/EmptyState";
import { getCourseSheets } from "@/services/revisionDataService";
import { useAuth } from "@/features/auth/AuthProvider";
import type { CourseSheet } from "@/types/revision";
import { BookOpen } from "lucide-react";

export function CoursesPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [sheets, setSheets] = useState<CourseSheet[]>([]);

  useEffect(() => { getCourseSheets(profile.id).then(setSheets); }, [profile.id]);

  return (
    <PageContainer>
      <AppHeader title="Fiches de révision" subtitle="Bibliothèque personnelle" backTo="/student/reviser" accent="#7C3AED" />
      <div className="space-y-3">
        {sheets.length ? sheets.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => navigate(`/student/reviser/fiches/${s.id}`)}
            className="card tap w-full p-5 text-left"
          >
            <p className="text-xs text-gray-500">{s.subject}</p>
            <h3 className="font-title text-base font-semibold text-accent">{s.title}</h3>
            <p className="mt-1 text-xs text-gray-400">{s.createdAt}</p>
          </button>
        )) : (
          <EmptyState title="Aucune fiche" description="Vos fiches de révision apparaîtront ici." icon={BookOpen} />
        )}
      </div>
    </PageContainer>
  );
}

export function CourseSheetDetailPage() {
  const { id } = useParams();
  const { profile } = useAuth();
  const [sheet, setSheet] = useState<CourseSheet | null>(null);

  useEffect(() => {
    getCourseSheets(profile.id).then((sheets) => {
      setSheet(sheets.find((s) => s.id === id) ?? null);
    });
  }, [profile.id, id]);

  if (!sheet) return <PageContainer><EmptyState title="Fiche introuvable" /></PageContainer>;

  return (
    <PageContainer>
      <AppHeader title={sheet.title} subtitle={`${sheet.subject} · ${sheet.topic}`} backTo="/student/reviser/fiches" accent="#7C3AED" />
      <div className="card p-6">
        <MarkdownContent content={sheet.content} variant="sheet" />
      </div>
    </PageContainer>
  );
}
