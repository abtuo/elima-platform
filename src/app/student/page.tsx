import { redirect } from "next/navigation";

export default function StudentIndexPage() {
  // Démo : on envoie vers un élève par défaut.
  redirect("/student/stu-001");
}
