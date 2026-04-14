import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { createSupabaseAdminServerClient, createSupabaseServerClient } from "@/lib/supabase/server";
import { requireServerEnv } from "@/lib/env";

type ParsedStudent = {
  fullName: string;
  registrationNumber?: string | null;
  birthDate?: string | null;
};

function normalizeName(name: string) {
  return name.trim().replace(/\s+/g, " ");
}

function extractTextFromWorkbook(buffer: Buffer) {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const parts: string[] = [];
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<(string | number | null)[]>(sheet, {
      header: 1,
      blankrows: false,
      raw: false,
    });
    if (rows.length === 0) continue;
    const text = rows
      .map((row) => row.map((cell) => String(cell ?? "").trim()).filter(Boolean).join(" | "))
      .filter(Boolean)
      .join("\n");
    if (text) parts.push(`## ${sheetName}\n${text}`);
  }
  return parts.join("\n\n");
}

async function extractRawText(fileName: string, fileType: string, buffer: Buffer) {
  const lowerName = fileName.toLowerCase();
  if (fileType === "application/pdf" || lowerName.endsWith(".pdf")) {
    const PDFParserModule = await import("pdf2json");
    const PDFParser = PDFParserModule.default;
    const parsedText = await new Promise<string>((resolve, reject) => {
      const parser = new PDFParser();
      parser.on("pdfParser_dataError", (errData: Error | { parserError: Error }) => {
        if (errData instanceof Error) {
          reject(errData);
          return;
        }
        reject(errData.parserError ?? new Error("Erreur de lecture PDF."));
      });
      parser.on(
        "pdfParser_dataReady",
        (pdfData: { Pages?: Array<{ Texts?: Array<{ R?: Array<{ T?: string }> }> }> }) => {
          const lines =
            pdfData.Pages?.flatMap((page) =>
              (page.Texts ?? []).map((textItem) =>
                (textItem.R ?? [])
                  .map((r) => decodeURIComponent(r.T ?? ""))
                  .join(" "),
              ),
            ) ?? [];
          resolve(lines.join("\n"));
        },
      );
      parser.parseBuffer(buffer);
    });
    return parsedText;
  }
  if (
    fileType.includes("spreadsheetml") ||
    fileType.includes("ms-excel") ||
    lowerName.endsWith(".xls") ||
    lowerName.endsWith(".xlsx")
  ) {
    return extractTextFromWorkbook(buffer);
  }
  if (
    fileType.includes("csv") ||
    fileType.includes("text/plain") ||
    lowerName.endsWith(".csv") ||
    lowerName.endsWith(".txt")
  ) {
    return buffer.toString("utf8");
  }
  throw new Error("Format non pris en charge. Utilisez PDF, CSV, XLS ou XLSX.");
}

async function extractStudentsWithOpenAI(rawText: string) {
  const apiKey = requireServerEnv("OPENAI_API_KEY");
  const prompt = [
    "Extrait uniquement la liste des eleves depuis le texte ci-dessous.",
    "Retourne un JSON strict valide selon ce schema: {\"students\":[{\"fullName\":\"...\",\"registrationNumber\":\"...|null\",\"birthDate\":\"YYYY-MM-DD|null\"}]}",
    "Regles:",
    "- fullName obligatoire",
    "- registrationNumber et birthDate optionnels, sinon null",
    "- n'invente aucun eleve",
    "- retire les doublons evidents",
  ].join("\n");

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4.1-mini",
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "Tu extrais des donnees structurees de listes scolaires." },
        { role: "user", content: `${prompt}\n\n---\n${rawText.slice(0, 120000)}` },
      ],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenAI error: ${errText}`);
  }

  const json = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = json.choices?.[0]?.message?.content;
  if (!content) return [];

  let parsed: { students?: ParsedStudent[] } | null = null;
  try {
    parsed = JSON.parse(content) as { students?: ParsedStudent[] };
  } catch {
    parsed = null;
  }

  const seen = new Set<string>();
  const students = (parsed?.students ?? [])
    .map((item) => ({
      fullName: normalizeName(String(item.fullName ?? "")),
      registrationNumber: item.registrationNumber ? String(item.registrationNumber).trim() : null,
      birthDate: item.birthDate ? String(item.birthDate).trim() : null,
    }))
    .filter((item) => item.fullName.length >= 2)
    .filter((item) => {
      const key = item.fullName.toLocaleLowerCase("fr");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  return students;
}

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const admin = await createSupabaseAdminServerClient();

    const { data: authData, error: authErr } = await supabase.auth.getUser();
    if (authErr) return NextResponse.json({ message: authErr.message }, { status: 401 });
    const userId = authData.user?.id;
    if (!userId) return NextResponse.json({ message: "Utilisateur non authentifie" }, { status: 401 });

    const { data: userRow, error: userErr } = await admin
      .from("users")
      .select("school_id")
      .eq("id", userId)
      .maybeSingle();
    if (userErr) return NextResponse.json({ message: userErr.message }, { status: 400 });
    if (!userRow?.school_id) return NextResponse.json({ message: "Aucune ecole associee" }, { status: 400 });
    const schoolId = String(userRow.school_id);

    const formData = await request.formData();
    const classId = String(formData.get("classId") ?? "").trim();
    const file = formData.get("file");
    if (!classId) return NextResponse.json({ message: "classId manquant" }, { status: 400 });
    if (!(file instanceof File)) return NextResponse.json({ message: "Fichier manquant" }, { status: 400 });

    const { data: classRow, error: classErr } = await admin
      .from("classes")
      .select("id, name")
      .eq("id", classId)
      .eq("school_id", schoolId)
      .maybeSingle();
    if (classErr) return NextResponse.json({ message: classErr.message }, { status: 400 });
    if (!classRow) return NextResponse.json({ message: "Classe introuvable pour cette ecole" }, { status: 404 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const rawText = await extractRawText(file.name, file.type, buffer);
    if (!rawText.trim()) {
      return NextResponse.json({ message: "Aucun texte exploitable dans le fichier." }, { status: 400 });
    }

    const extracted = await extractStudentsWithOpenAI(rawText);
    if (extracted.length === 0) {
      return NextResponse.json({ message: "Aucun eleve detecte par l'extraction LLM." }, { status: 400 });
    }

    const { data: existingRows, error: existingErr } = await admin
      .from("students")
      .select("full_name")
      .eq("school_id", schoolId)
      .eq("class_id", classId);
    if (existingErr) return NextResponse.json({ message: existingErr.message }, { status: 400 });

    const existingNames = new Set(
      (existingRows ?? []).map((row) => String((row as { full_name: string }).full_name).toLocaleLowerCase("fr")),
    );

    const toInsert = extracted
      .filter((student) => !existingNames.has(student.fullName.toLocaleLowerCase("fr")))
      .map((student) => ({
        school_id: schoolId,
        class_id: classId,
        full_name: student.fullName,
        registration_number: student.registrationNumber || null,
        birth_date: student.birthDate || null,
      }));

    if (toInsert.length > 0) {
      const { error: insertErr } = await admin.from("students").insert(toInsert);
      if (insertErr) return NextResponse.json({ message: insertErr.message }, { status: 400 });
    }

    return NextResponse.json({
      inserted: toInsert.length,
      skipped: extracted.length - toInsert.length,
      extracted: extracted.length,
      className: String(classRow.name),
      students: extracted.slice(0, 100),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur serveur";
    return NextResponse.json({ message }, { status: 500 });
  }
}
