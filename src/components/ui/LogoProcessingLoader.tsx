"use client";

import Image from "next/image";

type LogoProcessingLoaderProps = {
  label?: string;
};

export function LogoProcessingLoader({ label = "Traitement en cours..." }: LogoProcessingLoaderProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-white p-5">
      <div className="relative h-24 w-24">
        <div className="absolute inset-0 animate-spin rounded-full border-4 border-[var(--primary)]/20 border-t-[var(--primary)]" />
        <div className="absolute inset-2 rounded-full bg-white p-2 shadow-sm">
          <Image
            src="/logo_e-lima-with-text_wo_bg.png"
            alt="Logo Elima"
            fill
            className="object-contain"
            sizes="80px"
            priority
          />
        </div>
      </div>
      <p className="text-sm font-medium text-slate-600">{label}</p>
    </div>
  );
}
