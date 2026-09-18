import { readFile } from "node:fs/promises";
import path from "node:path";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { SchoolIdentity } from "@/lib/types";
import { brandingStoragePathFromUrl } from "@/lib/school-branding";
import type { PdfLogo } from "@/lib/finance/pdf-shared";

export type SchoolRelation = {
  name?: string;
  city?: string;
  country?: string;
  phone?: string;
  address?: string;
  currency?: string;
  logo_url?: string | null;
};

export const SCHOOL_INVOICE_SELECT = "name, city, country, phone, address, currency, logo_url";

export function firstRelation<T>(value: T | T[] | null | undefined) {
  return Array.isArray(value) ? value[0] : (value ?? undefined);
}

export function schoolIdentityFromRow(row?: SchoolRelation): SchoolIdentity {
  return {
    name: String(row?.name ?? "\u00c9tablissement"),
    ...(row?.address ? { address: String(row.address) } : {}),
    ...(row?.city ? { city: String(row.city) } : {}),
    ...(row?.country ? { country: String(row.country) } : {}),
    ...(row?.phone ? { phone: String(row.phone) } : {}),
  };
}

export function currencyFromSchool(row?: SchoolRelation) {
  const raw = String(row?.currency ?? "XOF");
  return raw === "XOF" ? "FCFA" : raw;
}

export async function resolveSchoolForInvoice(
  admin: SupabaseClient,
  schoolId: string,
  nested?: SchoolRelation | null,
) {
  const fromNested = nested?.name ? nested : undefined;
  if (fromNested) return fromNested;

  const { data } = await admin
    .from("schools")
    .select(SCHOOL_INVOICE_SELECT)
    .eq("id", schoolId)
    .maybeSingle();

  return (data as SchoolRelation | null) ?? undefined;
}

export async function loadSchoolLogo(
  admin: SupabaseClient,
  schoolRow: SchoolRelation | undefined,
  requestUrl: string,
): Promise<PdfLogo | undefined> {
  let logo: PdfLogo | undefined;

  if (schoolRow?.logo_url) {
    try {
      const logoUrl = String(schoolRow.logo_url);
      const storagePath = brandingStoragePathFromUrl(logoUrl);
      if (storagePath) {
        const { data } = await admin.storage.from("documents").download(storagePath);
        const lower = storagePath.toLowerCase();
        const type = lower.endsWith(".png") ? "png" : lower.endsWith(".jpg") || lower.endsWith(".jpeg") ? "jpg" : null;
        if (data && type) logo = { bytes: new Uint8Array(await data.arrayBuffer()), type };
      } else {
        const res = await fetch(logoUrl.startsWith("/") ? new URL(logoUrl, requestUrl).toString() : logoUrl);
        if (res.ok) {
          const ct = (res.headers.get("content-type") ?? "").toLowerCase();
          const type = ct.includes("png") ? "png" : ct.includes("jpeg") || ct.includes("jpg") ? "jpg" : null;
          if (type) logo = { bytes: new Uint8Array(await res.arrayBuffer()), type };
        }
      }
    } catch {
      // ignore remote logo failures
    }
  }

  if (!logo) {
    try {
      const local = await readFile(path.join(process.cwd(), "public", "logo.png"));
      logo = { bytes: new Uint8Array(local), type: "png" };
    } catch {
      // no bundled logo
    }
  }

  return logo;
}
