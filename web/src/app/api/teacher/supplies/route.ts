import { NextResponse } from "next/server";
import { createSupabaseAdminServerClient } from "@/lib/supabase/server";
import { assertTeacherAssignment, resolveTeacher } from "@/lib/teacher/server";
import { getSupplyListForClass } from "@/lib/store/queries";
import { checkSchoolFeature } from "@/lib/plans-server";

const ACADEMIC_YEAR = "2025-2026";

/** Load or create draft supply list for a teacher class. */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const classId = url.searchParams.get("classId");
    if (!classId) return NextResponse.json({ list: null });

    const ctx = await resolveTeacher();
    if ("error" in ctx) return ctx.error;

    const planErr = await checkSchoolFeature(ctx.schoolId, "store");
    if (planErr) return planErr;

    const admin = await createSupabaseAdminServerClient();
    const assignmentError = await assertTeacherAssignment(admin, ctx, classId);
    if (assignmentError) return assignmentError;

    let list = await getSupplyListForClass(admin, ctx.schoolId, classId);
    if (!list) {
      const { data: cls } = await admin.from("classes").select("name, academic_year").eq("id", classId).maybeSingle();
      const className = String((cls as { name?: string } | null)?.name ?? "Classe");
      const { data: created, error } = await admin
        .from("supply_lists")
        .insert({
          school_id: ctx.schoolId,
          class_id: classId,
          title: `Liste de fournitures - ${className}`,
          academic_year: String((cls as { academic_year?: string } | null)?.academic_year ?? ACADEMIC_YEAR),
          status: "draft",
        } as never)
        .select("id")
        .single();
      if (error || !created) return NextResponse.json({ message: error?.message ?? "Création échouée" }, { status: 400 });
      list = await getSupplyListForClass(admin, ctx.schoolId, classId);
    }

    return NextResponse.json({ list });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur serveur";
    return NextResponse.json({ message }, { status: 500 });
  }
}

/** Add or remove a supply list item (teacher draft). */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      classId?: string;
      action?: "add" | "remove";
      name?: string;
      quantity?: number;
      notes?: string | null;
      itemId?: string;
    };

    const classId = body.classId?.trim();
    if (!classId) return NextResponse.json({ message: "classId requis" }, { status: 400 });

    const ctx = await resolveTeacher();
    if ("error" in ctx) return ctx.error;

    const planErr = await checkSchoolFeature(ctx.schoolId, "store");
    if (planErr) return planErr;

    const admin = await createSupabaseAdminServerClient();
    const assignmentError = await assertTeacherAssignment(admin, ctx, classId);
    if (assignmentError) return assignmentError;

    let list = await getSupplyListForClass(admin, ctx.schoolId, classId);
    if (!list) {
      const { data: cls } = await admin.from("classes").select("name, academic_year").eq("id", classId).maybeSingle();
      const className = String((cls as { name?: string } | null)?.name ?? "Classe");
      const { data: created, error } = await admin
        .from("supply_lists")
        .insert({
          school_id: ctx.schoolId,
          class_id: classId,
          title: `Liste de fournitures - ${className}`,
          academic_year: String((cls as { academic_year?: string } | null)?.academic_year ?? ACADEMIC_YEAR),
          status: "draft",
        } as never)
        .select("id")
        .single();
      if (error || !created) return NextResponse.json({ message: error?.message ?? "Création échouée" }, { status: 400 });
      list = await getSupplyListForClass(admin, ctx.schoolId, classId);
    }
    if (!list) return NextResponse.json({ message: "Liste introuvable" }, { status: 404 });

    if (list.status !== "draft") {
      return NextResponse.json(
        { message: "La liste est en cours de validation ou déjà publiée — modification impossible." },
        { status: 400 },
      );
    }

    if (body.action === "remove") {
      const itemId = body.itemId?.trim();
      if (!itemId) return NextResponse.json({ message: "itemId requis" }, { status: 400 });
      const { error } = await admin.from("supply_list_items").delete().eq("id", itemId).eq("supply_list_id", list.listId);
      if (error) return NextResponse.json({ message: error.message }, { status: 400 });
      list = await getSupplyListForClass(admin, ctx.schoolId, classId);
      return NextResponse.json({ ok: true, list });
    }

    const name = body.name?.trim();
    const quantity = Number(body.quantity ?? 1);
    if (!name || quantity <= 0) {
      return NextResponse.json({ message: "Nom et quantité valides requis." }, { status: 400 });
    }

    const { data: product } = await admin
      .from("store_products")
      .select("id")
      .eq("school_id", ctx.schoolId)
      .eq("name", name)
      .maybeSingle();

    const { error: insertErr } = await admin.from("supply_list_items").insert({
      supply_list_id: list.listId,
      name,
      quantity,
      notes: body.notes?.trim() || null,
      recommended_product_id: (product as { id?: string } | null)?.id ?? null,
    } as never);
    if (insertErr) return NextResponse.json({ message: insertErr.message }, { status: 400 });

    list = await getSupplyListForClass(admin, ctx.schoolId, classId);
    return NextResponse.json({ ok: true, list });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur serveur";
    return NextResponse.json({ message }, { status: 500 });
  }
}
