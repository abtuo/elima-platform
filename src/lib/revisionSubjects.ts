import type { LucideIcon } from "lucide-react";
import { Atom, BookOpenText, Calculator, Cpu, Dna, Globe2, Languages, Landmark, Palette, Scale, Trophy } from "lucide-react";

export type RevisionSubject = {
  id: string;
  label: string;
  icon: LucideIcon;
  color: string;
  background: string;
};

export const REVISION_SUBJECT_OPTIONS: RevisionSubject[] = [
  { id: "maths", label: "Mathématiques", icon: Calculator, color: "text-blue-700", background: "bg-blue-100" },
  { id: "francais", label: "Français", icon: BookOpenText, color: "text-rose-700", background: "bg-rose-100" },
  { id: "anglais", label: "Anglais", icon: Languages, color: "text-indigo-700", background: "bg-indigo-100" },
  { id: "espagnol", label: "Espagnol", icon: Languages, color: "text-orange-700", background: "bg-orange-100" },
  { id: "svt", label: "SVT", icon: Dna, color: "text-emerald-700", background: "bg-emerald-100" },
  { id: "physique-chimie", label: "Physique-Chimie", icon: Atom, color: "text-cyan-700", background: "bg-cyan-100" },
  { id: "histoire-geographie", label: "Histoire-Géographie", icon: Landmark, color: "text-amber-700", background: "bg-amber-100" },
  { id: "philosophie", label: "Philosophie", icon: Scale, color: "text-violet-700", background: "bg-violet-100" },
  { id: "ses", label: "Sciences économiques et sociales", icon: Globe2, color: "text-teal-700", background: "bg-teal-100" },
  { id: "informatique", label: "Informatique / NSI", icon: Cpu, color: "text-slate-700", background: "bg-slate-200" },
  { id: "eps", label: "EPS", icon: Trophy, color: "text-lime-700", background: "bg-lime-100" },
  { id: "arts", label: "Arts", icon: Palette, color: "text-fuchsia-700", background: "bg-fuchsia-100" },
];

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("fr").replace(/[^a-z0-9]+/g, " ").trim();
}

export function getRevisionSubject(subject: string): RevisionSubject {
  const value = normalize(subject);
  return REVISION_SUBJECT_OPTIONS.find((item) => {
    const label = normalize(item.label);
    if (label === value || label.includes(value) || value.includes(label)) return true;
    if (item.id === "maths" && value.startsWith("math")) return true;
    if (item.id === "francais" && value.startsWith("franc")) return true;
    if (item.id === "physique-chimie" && (value.includes("physique") || value.includes("chimie"))) return true;
    if (item.id === "histoire-geographie" && (value.includes("histoire") || value.includes("geographie"))) return true;
    if (item.id === "informatique" && (value.includes("informatique") || value === "nsi")) return true;
    if (item.id === "ses" && (value === "ses" || value.includes("economique"))) return true;
    return false;
  }) ?? { id: "autre", label: subject || "Matière", icon: BookOpenText, color: "text-purple-700", background: "bg-purple-100" };
}

export function subjectIdFromLabel(subject: string) {
  return getRevisionSubject(subject).id;
}
