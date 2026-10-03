import { App } from "@capacitor/app";
import { Camera, type MediaResult } from "@capacitor/camera";
import { isNativeRuntime } from "./nativeRuntime";
import { createCameraInbox } from "./cameraInbox";

const inbox = createCameraInbox<{ photo?: MediaResult; error?: string }>();
export const hasRecoveredPhoto = inbox.has;
export const subscribeRecoveredPhoto = inbox.subscribe;
export const takeRecoveredPhoto = inbox.take;
let initialized = false;

export function initializeCameraRecovery() {
  if (!isNativeRuntime() || initialized) return;
  initialized = true;
  // Register before React/router/auth restoration. Android retains undelivered results.
  void App.addListener("appRestoredResult", result => {
    if (result.pluginId !== "Camera" || result.methodName !== "takePhoto") return;
    inbox.put(result.success && result.data?.webPath
      ? { photo: result.data as MediaResult }
      : { error: "La photo n’a pas pu être récupérée. Tu peux en prendre une nouvelle." });
  }).catch(() => { initialized = false; });
}

export async function photoToFile(photo: MediaResult) {
  if (!photo.webPath) throw new Error("Photo indisponible. Réessaie la prise de vue.");
  const response = await fetch(photo.webPath);
  if (!response.ok) throw new Error("Impossible de récupérer la photo.");
  const blob = await response.blob();
  const mime = blob.type || "image/jpeg";
  if (!["image/jpeg", "image/png"].includes(mime)) throw new Error("Format photo non pris en charge. Importe un JPEG ou PNG.");
  return new File([blob], `photo-${Date.now()}.${mime === "image/png" ? "png" : "jpg"}`, { type: mime });
}

export async function takeNativePhoto() {
  try {
    const photo = await Camera.takePhoto({ quality: 85, targetWidth: 2000, targetHeight: 2000, saveToGallery: false, editable: "no" });
    return await photoToFile(photo);
  } catch (error) {
    const message = error instanceof Error ? error.message : String((error as { message?: string })?.message ?? "");
    if ((error as { code?: string })?.code === "OS-PLUG-CAMR-0006" || /cancel|annul/i.test(message)) return null;
    throw new Error("Impossible d’ouvrir la caméra. Vérifie son autorisation ou importe une image.");
  }
}
