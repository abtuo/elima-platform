import { cn } from "@/lib/utils";
import { getRevisionSubject } from "@/lib/revisionSubjects";

const generatedSubjectIcons: Partial<Record<string, string>> = {
  maths: "/icons/generated/subjects/subject-mathematics.png",
  francais: "/icons/generated/subjects/subject-french.png",
  anglais: "/icons/generated/subjects/subject-english.png",
  espagnol: "/icons/generated/subjects/subject-spanish.png",
  svt: "/icons/generated/subjects/subject-svt.png",
  "physique-chimie": "/icons/generated/subjects/subject-physics-chemistry.png",
  "histoire-geographie": "/icons/generated/subjects/subject-history-geography.png",
  philosophie: "/icons/generated/subjects/subject-philosophy.png",
  ses: "/icons/generated/subjects/subject-ses.png",
  informatique: "/icons/generated/subjects/subject-computer-science.png",
  eps: "/icons/generated/subjects/subject-eps.png",
  arts: "/icons/generated/subjects/subject-arts.png",
  autre: "/icons/generated/subjects/subject-other.png",
};

export function SubjectIcon({ subject, className }: { subject: string; className?: string }) {
  const config = getRevisionSubject(subject);
  const generatedIcon = generatedSubjectIcons[config.id];

  if (generatedIcon) {
    return (
      <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden", className)}>
        <img src={generatedIcon} alt="" aria-hidden="true" className="h-full w-full object-contain" />
      </span>
    );
  }

  const Icon = config.icon;
  return <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", config.background, className)}><Icon className={cn("h-5 w-5", config.color)} /></span>;
}
