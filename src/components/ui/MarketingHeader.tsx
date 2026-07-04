"use client";

/* eslint-disable react/no-unescaped-entities */

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";

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
  const [role] = useState<string | null>(() => {
    const cookieValue = getCookieValue("elima_role");
    return cookieValue ? decodeURIComponent(cookieValue) : null;
  });

  const homePath = useMemo(() => {
    if (!role) return "/";
    return roleHomeMap[role] ?? "/";
  }, [role]);

  return (
    <nav className="sticky top-4 z-20 rounded-2xl border border-slate-200/60 bg-white/70 px-4 py-3 shadow-sm backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/logo.png"
            alt="Logo Elima"
            width={190}
            height={56}
            className="h-14 w-auto"
            priority
          />
        </Link>

        <div className="order-3 flex w-full items-center gap-1 text-sm sm:w-auto md:order-none">
          <Link href="/#produit" className="rounded-lg px-3 py-2 hover:bg-slate-100">
            Produit
          </Link>
          <Link href="/#impact" className="rounded-lg px-3 py-2 hover:bg-slate-100">
            Impact
          </Link>
          <Link href="/#tarifs" className="rounded-lg px-3 py-2 hover:bg-slate-100">
            Offres
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
                href="/contact"
                className="rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
              >
                Demander une démo
              </Link>
              <Link
                href="/login"
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                Se connecter
              </Link>
              <Link
                href="/signup"
                className="hidden rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 sm:inline-flex"
              >
                S'inscrire
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
