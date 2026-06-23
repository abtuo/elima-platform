import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { resolveFinanceActor } from "@/lib/finance/server";
import { getAllUnpaidStudents } from "@/lib/finance/queries";

/** Export the outstanding-balance list as CSV or Excel (?format=csv|xlsx). */
export async function GET(request: Request) {
  try {
    const actor = await resolveFinanceActor();
    if ("error" in actor) return actor.error;

    const format = new URL(request.url).searchParams.get("format") === "csv" ? "csv" : "xlsx";
    const rows = await getAllUnpaidStudents(actor.schoolId);

    const data = rows.map((r) => ({
      Élève: r.fullName,
      Classe: r.className,
      "Téléphone parent": r.parentPhone ?? "",
      "Montant attendu": r.expected,
      "Montant payé": r.paid,
      "Reste à payer": r.remaining,
      Statut: r.status === "partial" ? "Partiel" : "Impayé",
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Impayés");

    if (format === "csv") {
      const csv = XLSX.utils.sheet_to_csv(worksheet);
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="impayes-${Date.now()}.csv"`,
        },
      });
    }

    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
    const bytes = new Uint8Array(buffer);
    return new NextResponse(new Blob([bytes]), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="impayes-${Date.now()}.xlsx"`,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur serveur";
    return NextResponse.json({ message }, { status: 500 });
  }
}
