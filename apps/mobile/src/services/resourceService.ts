import type { ResourceItem } from "../types/school";
import { getResources } from "./mainDataService";
import { env } from "./env";
import { isDemoModeActive } from "./env";
import { getBearerToken } from "./authService";

export type TeacherResourceUpload = {
  classId: string;
  subjectId: string;
  title: string;
  description?: string;
  type: ResourceItem["type"];
  file: File;
  visibleToParents?: boolean;
};

export async function listPublishedResources(classId?: string): Promise<ResourceItem[]> {
  const resources = await getResources(classId);
  if (!isDemoModeActive()) return resources;
  const local = JSON.parse(localStorage.getItem("elima_teacher_resources") ?? "[]") as ResourceItem[];
  return [...local, ...resources];
}

export async function publishTeacherResource(input: TeacherResourceUpload): Promise<{ success: boolean; message: string }> {
  if (isDemoModeActive()) {
    const resources = JSON.parse(localStorage.getItem("elima_teacher_resources") ?? "[]") as ResourceItem[];
    resources.unshift({
      id: crypto.randomUUID(),
      title: input.title,
      description: input.description,
      subject: input.subjectId,
      className: input.classId,
      type: input.type,
      publishedAt: new Date().toISOString().slice(0, 10),
    });
    localStorage.setItem("elima_teacher_resources", JSON.stringify(resources));
    return { success: true, message: "Document publié avec succès." };
  }

  if (!env.mainApiBaseUrl) {
    return {
      success: false,
      message: "La publication sera disponible une fois l'établissement connecté.",
    };
  }

  const token = await getBearerToken();
  if (!token) {
    return { success: false, message: "Session expirée. Reconnectez-vous." };
  }

  const formData = new FormData();
  formData.append("classId", input.classId);
  formData.append("subjectId", input.subjectId);
  formData.append("title", input.title);
  formData.append("description", input.description ?? "");
  formData.append("visibleToParents", String(input.visibleToParents ?? false));
  formData.append("file", input.file);

  try {
    const response = await fetch(`${env.mainApiBaseUrl}/api/teacher/homework/upload`, {
      method: "POST",
      headers: { Authorization: token },
      body: formData,
    });

    if (!response.ok) {
      return { success: false, message: "La publication n'a pas pu aboutir. Réessayez plus tard." };
    }

    return { success: true, message: "Document publié avec succès." };
  } catch {
    return { success: false, message: "Connexion indisponible. Vérifiez votre réseau." };
  }
}
