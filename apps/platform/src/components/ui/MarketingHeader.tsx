"use client";

/* eslint-disable react/no-unescaped-entities */

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Menu, X } from "lucide-react";
import clsx from "clsx";

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
  const [menuOpen, setMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileVisible, setIsMobileVisible] = useState(true);
  const [role] = useState<string | null>(() => {
    const cookieValue = getCookieValue("elima_role");
    return cookieValue ? decodeURIComponent(cookieValue) : null;
  });

  const homePath = useMemo(() => {
    if (!role) return "/";
    return roleHomeMap[role] ?? "/";
  }, [role]);

  const navLinks = [
    { href: "/#produit", label: "Produit" },
    { href: "/#tarifs", label: "Offres" },
    { href: "/a-propos", label: "À propos" },
    { href: "/contact", label: "Contact" },
  ];

  const closeMenu = () => setMenuOpen(false);

  useEffect(() => {
    let scrolled = false;
    let lastY = window.scrollY;

    const onScroll = () => {
      const y = window.scrollY;
      const isMobile = window.matchMedia("(max-width: 767px)").matches;

      const nextScrolled = scrolled ? y > 8 : y > 32;
      if (nextScrolled !== scrolled) {
        scrolled = nextScrolled;
        setIsScrolled(nextScrolled);
        if (nextScrolled) setMenuOpen(false);
      }

      if (isMobile) {
        if (y <= 8) {
          setIsMobileVisible(true);
        } else if (y > lastY + 6) {
          setIsMobileVisible(false);
          setMenuOpen(false);
        } else if (y < lastY - 6) {
          setIsMobileVisible(true);
        }
      } else {
        setIsMobileVisible(true);
      }

      lastY = y;
    };

    const onResize = () => {
      if (!window.matchMedia("(max-width: 767px)").matches) {
        setIsMobileVisible(true);
      }
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <>
      <div className="h-[4.5rem] shrink-0" aria-hidden />
      <nav
        className={clsx(
          "fixed inset-x-0 top-0 z-20 transition-[padding,transform] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] md:translate-y-0",
          isScrolled ? "px-4 pt-4 md:px-8" : "px-0 pt-0",
          isMobileVisible ? "translate-y-0" : "-translate-y-[calc(100%+1rem)] md:translate-y-0",
        )}
      >
        <div
          className={clsx(
            "mx-auto w-full border border-slate-200/60 bg-white/80 backdrop-blur transition-[max-width,border-radius,box-shadow,border-color] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
            isScrolled
              ? "max-w-6xl rounded-2xl shadow-sm"
              : "max-w-none rounded-none border-x-transparent border-t-transparent shadow-none",
          )}
        >
          <div className="mx-auto w-full max-w-6xl px-4 py-3 md:px-8">
            <div className="flex items-center justify-between gap-3">
              <Link href="/" className="flex items-center gap-2" onClick={closeMenu}>
                <Image
                  src="/logo.png"
                  alt="Logo Elima"
                  width={190}
                  height={56}
                  className="h-14 w-auto"
                  priority
                />
              </Link>

              <div className="hidden items-center gap-1 text-sm md:flex">
                {navLinks.map((link) => (
                  <Link key={link.href} href={link.href} className="rounded-lg px-3 py-2 hover:bg-slate-100">
                    {link.label}
                  </Link>
                ))}
              </div>

              <div className="hidden items-center gap-2 md:flex">
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
                      className="rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
                    >
                      S'inscrire
                    </Link>
                    <Link
                      href="/login"
                      className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                    >
                      Se connecter
                    </Link>
                  </>
                )}
              </div>

              <button
                type="button"
                className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/60 md:hidden"
                aria-label={menuOpen ? "Fermer le menu" : "Ouvrir le menu"}
                aria-expanded={menuOpen}
                aria-controls="marketing-mobile-menu"
                onClick={() => setMenuOpen((open) => !open)}
              >
                {menuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>

            <div
              id="marketing-mobile-menu"
              className={clsx(
                "overflow-hidden transition-all duration-300 ease-out md:hidden",
                menuOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0",
              )}
            >
              <div className="mt-3 space-y-3 border-t border-slate-200/70 pt-3">
                <div className="grid gap-1 text-sm">
                  {navLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="rounded-xl px-3 py-2 font-medium text-slate-700 hover:bg-slate-100"
                      onClick={closeMenu}
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>

                <div className="grid gap-2">
                  {role ? (
                    <>
                      <Link
                        href={homePath}
                        className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-center text-sm font-semibold text-slate-700 hover:bg-slate-100"
                        onClick={closeMenu}
                      >
                        Mon espace
                      </Link>
                      <form action="/api/auth/logout" method="post">
                        <button
                          type="submit"
                          className="w-full rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
                        >
                          Se déconnecter
                        </button>
                      </form>
                    </>
                  ) : (
                    <>
                      <Link
                        href="/signup"
                        className="rounded-xl bg-[var(--primary)] px-4 py-2 text-center text-sm font-semibold text-white hover:opacity-90"
                        onClick={closeMenu}
                      >
                        S'inscrire
                      </Link>
                      <Link
                        href="/login"
                        className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-center text-sm font-semibold text-slate-700 hover:bg-slate-100"
                        onClick={closeMenu}
                      >
                        Se connecter
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </nav>
    </>
  );
}
