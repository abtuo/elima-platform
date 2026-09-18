"use client";

import { useMemo, useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/Toast";

type UploadDocumentProps = {
  classId?: string;
  className?: string;
  onUploaded?: () => void;
};

const acceptedTypes = ["application/pdf", "image/png", "image/jpeg"];

export function UploadDocument({ classId, className, onUploaded }: UploadDocumentProps) {
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isReady = Boolean(classId);

  const fileLabel = useMemo(() => {
    if (!selectedFile) return "Aucun fichier sélectionné";
    return `${selectedFile.name} · ${(selectedFile.size / 1024 / 1024).toFixed(2)} Mo`;
  }, [selectedFile]);

  function resetState() {
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
  }

  function handleFileChange(file: File | null) {
    setStatus(null);
    setError(null);

    if (!file) {
      resetState();
      return;
    }

    if (!acceptedTypes.includes(file.type)) {
      setError("Formats acceptés : PDF, PNG, JPG.");
      resetState();
      return;
    }

    resetState();
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  async function upload() {
    if (!selectedFile || !classId) return;
    setLoading(true);
    setStatus(null);
    setError(null);

    try {
      const supabase = createSupabaseBrowserClient();
      const { data: userRes, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userRes.user?.id) {
        throw new Error("Utilisateur non authentifié.");
      }

      const userId = userRes.user.id;
      const extension = selectedFile.name.split(".").pop() || "file";
      const filePath = `${userId}/${classId}/${Date.now()}-${crypto.randomUUID()}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(filePath, selectedFile, { upsert: false, contentType: selectedFile.type });

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      const { data: urlData } = supabase.storage.from("documents").getPublicUrl(filePath);
      const fileUrl = urlData.publicUrl;

      const { error: insertError } = await supabase.from("documents").insert({
        user_id: userId,
        class_id: classId,
        file_url: fileUrl,
        file_type: selectedFile.type,
      });

      if (insertError) {
        throw new Error(insertError.message);
      }

      setStatus("Document enregistré avec succès.");
      toast.success("Upload terminé", "Le document est stocké et prêt pour le traitement.");
      resetState();
      onUploaded?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur pendant l'upload.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="elima-card space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-[var(--accent)]">Importer une liste d’élèves</h3>
        <p className="text-sm text-slate-600">
          Sélectionnez une classe puis ajoutez le PDF ou la photo contenant la liste.
        </p>
      </div>

      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-4">
        <p className="text-sm font-medium text-slate-700">Classe sélectionnée</p>
        <p className="text-sm text-slate-500">
          {className ? className : "Aucune classe sélectionnée"}
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <button
          type="button"
          disabled={!isReady}
          onClick={() => fileInputRef.current?.click()}
          className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Uploader un fichier
        </button>
        <button
          type="button"
          disabled={!isReady}
          onClick={() => cameraInputRef.current?.click()}
          className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Scanner avec caméra
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,image/png,image/jpeg"
        className="hidden"
        onChange={(event) => handleFileChange(event.target.files?.[0] ?? null)}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(event) => handleFileChange(event.target.files?.[0] ?? null)}
      />

      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
        <p className="text-sm text-slate-700">{fileLabel}</p>
      </div>

      {previewUrl ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          {selectedFile?.type === "application/pdf" ? (
            <iframe
              title="Preview PDF"
              src={previewUrl}
              className="h-72 w-full rounded-xl border border-slate-200"
            />
          ) : (
            // Blob previews cannot be optimized by next/image.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewUrl} alt="Prévisualisation" className="max-h-72 w-full rounded-xl object-contain" />
          )}
        </div>
      ) : null}

      {error ? <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
      {status ? <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{status}</p> : null}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={!selectedFile || loading || !isReady}
          onClick={upload}
          className="rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {loading ? "Upload en cours…" : "Envoyer"}
        </button>
        {selectedFile ? (
          <button
            type="button"
            onClick={resetState}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
          >
            Retirer
          </button>
        ) : null}
      </div>
    </div>
  );
}
