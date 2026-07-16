import { cn } from "@/lib/utils";

const featureIcons = {
  home: "/icons/generated/features/feature-home.png",
  planning: "/icons/generated/features/feature-planning.png",
  revision: "/icons/generated/features/feature-revision.png",
  documents: "/icons/generated/features/feature-documents.png",
  profile: "/icons/generated/features/feature-profile.png",
  children: "/icons/generated/features/feature-children.png",
  directory: "/icons/generated/features/feature-directory.png",
  students: "/icons/generated/features/feature-students.png",
  teachers: "/icons/generated/features/feature-teachers.png",
  classes: "/icons/generated/features/feature-classes.png",
  assignments: "/icons/generated/features/feature-assignments.png",
  payments: "/icons/generated/features/feature-payments.png",
  results: "/icons/generated/features/feature-results.png",
  messages: "/icons/generated/features/feature-messages.png",
  alerts: "/icons/generated/features/feature-alerts.png",
  publish: "/icons/generated/features/feature-publish.png",
  supplies: "/icons/generated/features/feature-supplies.png",
  sync: "/icons/generated/features/feature-sync.png",
  adminDashboard: "/icons/generated/features/feature-admin-dashboard.png",
  scanner: "/icons/generated/features/feature-scanner.png",
} as const;

export function GeneratedFeatureIcon({
  name,
  className,
}: {
  name: keyof typeof featureIcons;
  className?: string;
}) {
  return <img src={featureIcons[name]} alt="" aria-hidden="true" className={cn("object-contain", className)} />;
}
