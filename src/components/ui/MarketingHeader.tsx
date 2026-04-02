"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

const roleHomeMap: Record<string, string> = {
  SUPER_ADMIN: "/dashboard",
  SCHOOL_ADMIN: "/dashboard",
  TEACHER: "/teacher",
};

function getCookieValue(name: string) {
  if (typeof document === "undefined") return null;
  return (
    document.cookie
      .split("; ")
      .find((row) => row.startsWith(`${name}=`))
      ?.split("=")[1] ?? null
  );
}

export function MarketingHeader() {
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    const cookieValue = getCookieValue("elima_role");
    setRole(cookieValue ? decodeURIComponent(cookieValue) : null);
  }, []);

  const homePath = useMemo(() => {
    if (!role) return "/";
    return roleHomeMap[role] ?? "/";
  }, [role]);

  return (
    <nav className="sticky top-4 z-20 rounded-2xl border border-slate-200/60 bg-white/70 px-4 py-3 shadow-sm backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/logo_e-lima-with-text_wo_bg.png"
            alt="Logo Elima"
            width={190}
            height={56}
            className="h-14 w-auto"
            priority
          />
        </Link>

        <div className="hidden items-center gap-1 text-sm md:flex">
          <Link href="/#produit" className="rounded-lg px-3 py-2 hover:bg-slate-100">
            Produit
          </Link>
          <Link href="/#tarifs" className="rounded-lg px-3 py-2 hover:bg-slate-100">
            Tarifs
          </Link>
          <Link href="/contact" className="rounded-lg px-3 py-2 hover:bg-slate-100">
            Contact
          </Link>
        </div>

        <div className="flex items-center gap-2">
          {role ? (
            <>
              <Link
                href={homePath}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                Mon espace
              </Link>
              <form action="/api/auth/logout" method="post">
                <button
                  type="submit"
                  className="rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
                >
                  Se déconnecter
                </button>
              </form>
            </>
          ) : (
            <>
              <Link
                href="/signup"
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                S’inscrire
              </Link>
              <Link
                href="/login"
                className="rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
              >
                Se connecter
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}