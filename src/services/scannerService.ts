import type { ScanRecord } from "../types/revision";
import { isDemoModeActive } from "./env";
import { revisionDbClient } from "./revisionDbClient";

const SCANS_KEY = "elima-mobile-scans";

function readLocalScans(): ScanRecord[] {
  try {
    const raw = localStorage.getItem(SCANS_KEY);
    if (raw) return JSON.parse(raw) as ScanRecord[];
  } catch { /* ignore */ }
  return [];
}

function writeLocalScans(scans: ScanRecord[]) {
  localStorage.setItem(SCANS_KEY, JSON.stringify(scans));
}

export type ScanInput = {
  userId: string;
  fileName: string;
  subject: string;
  topic: string;
  documentType: string;
};

export async function registerScannedDocument(input: ScanInput): Promise<ScanRecord> {
  const record: ScanRecord = {
    id: `scan-${Date.now()}`,
    fileName: input.fileName,
    subject: input.subject,
    topic: input.topic,
    documentType: input.documentType,
    status: "received",
    createdAt: new Date().toISOString().slice(0, 10),
  };

  if (revisionDbClient && !isDemoModeActive()) {
    const storagePath = `scanned-exams/${input.userId}/${Date.now()}-${input.fileName}`;
    const { data, error } = await revisionDbClient
      .from("scanned_exams")
      .insert({ user_id: input.userId, file_path: storagePath, status: "pending" })
      .select("id")
      .single();

    if (!error && data) {
      record.id = String(data.id);
      record.status = "analyzing";
    }
  }

  const scans = readLocalScans();
  scans.unshift(record);
  writeLocalScans(scans);
  return record;
}

export async function getScanHistory(): Promise<ScanRecord[]> {
  return readLocalScans();
}

export async function requestSheetFromScan(scanId: string): Promise<{ ready: boolean; message: string }> {
  const scans = readLocalScans();
  const scan = scans.find((s) => s.id === scanId);
  if (!scan) return { ready: false, message: "Document introuvable." };
  return { ready: false, message: "L'analyse du document sera disponible bientôt." };
}

export async function requestQuizFromScan(scanId: string): Promise<{ ready: boolean; message: string }> {
  const scans = readLocalScans();
  const scan = scans.find((s) => s.id === scanId);
  if (!scan) return { ready: false, message: "Document introuvable." };
  return { ready: false, message: "La génération de quiz sera disponible bientôt." };
}
