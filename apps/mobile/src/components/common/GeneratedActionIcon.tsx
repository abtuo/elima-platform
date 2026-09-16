import { cn } from "@/lib/utils";

const actionIcons = {
  randomQuiz: "/icons/generated/actions/action-random-quiz.png",
  generateQuiz: "/icons/generated/actions/action-generate-quiz.png",
  generateSheet: "/icons/generated/actions/action-generate-sheet.png",
  hint: "/icons/generated/actions/action-hint.png",
  scanCamera: "/icons/generated/actions/action-scan-camera.png",
  upload: "/icons/generated/actions/action-upload.png",
  attendance: "/icons/generated/actions/action-attendance.png",
  reminder: "/icons/generated/actions/action-reminder.png",
} as const;

export function GeneratedActionIcon({ name, className }: { name: keyof typeof actionIcons; className?: string }) {
  return <img src={actionIcons[name]} alt="" aria-hidden="true" className={cn("shrink-0 object-contain", className)} />;
}
