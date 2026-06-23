import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getPortalContext } from "@/lib/portal/queries";
import { getRoleHomePath } from "@/lib/auth";

export default async function ParentLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getPortalContext();
  if (!ctx) redirect("/login");
  if (ctx.role !== "PARENT") redirect(getRoleHomePath(ctx.role ?? "STUDENT"));

  return (
    <div className="min-h-screen bg-[var(--background)] text-foreground">
      <div className="mx-auto w-full max-w-3xl px-4 py-5 md:py-8">
        <header className="mb-5 flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white px-4 py-3 shadow-sm">
          <Link href="/parent" className="flex items-center gap-2">
            <Image src="/logo.png" alt="Logo Elima" width={32} height={32} className="rounded-full" />
            <div>
              <p className="text-sm font-bold text-[var(--accent)]">Espace Parent</p>
              <p className="text-xs text-slate-500">{ctx.fullName ?? "Bienvenue"}</p>
            </div>
          </Link>
          <form action="/api/auth/logout" method="POST">
            <button className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100">
              Déconnexion
            </button>
          </form>
        </header>
        <main>{children}</main>
      </div>
    </div>
  );
}
