import { cn } from "@/lib/utils";
import { getRevisionSubject } from "@/lib/revisionSubjects";

export function SubjectIcon({ subject, className }: { subject: string; className?: string }) {
  const config = getRevisionSubject(subject);
  const Icon = config.icon;
  return <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", config.background, className)}><Icon className={cn("h-5 w-5", config.color)} /></span>;
}
