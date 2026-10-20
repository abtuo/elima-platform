"use client";

import { useId, useState } from "react";
import { ChevronDown } from "lucide-react";
import { formatPhoneNational, normalizeCountryPhone, type PhoneCountryCode } from "@/lib/phone";

const countries = {
  CI: { flag: "🇨🇮", dial: "+225", label: "Côte d’Ivoire" },
  FR: { flag: "🇫🇷", dial: "+33", label: "France" },
} as const;

type Props = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  error?: string;
};

export function PhoneNumberInput({ value, onChange, disabled, error }: Props) {
  const id = useId();
  const [country, setCountry] = useState<PhoneCountryCode>(value.startsWith("+33") ? "FR" : "CI");
  const [national, setNational] = useState(() => formatPhoneNational(value.startsWith("+33") ? "FR" : "CI", value));

  function updateCountry(next: PhoneCountryCode) {
    setCountry(next);
    const formatted = formatPhoneNational(next, national);
    setNational(formatted);
    onChange(normalizeCountryPhone(next, formatted) ?? "");
  }

  function updateNational(raw: string) {
    const formatted = formatPhoneNational(country, raw);
    setNational(formatted);
    onChange(normalizeCountryPhone(country, formatted) ?? "");
  }

  return <div>
    <label htmlFor={id} className="text-sm font-bold text-slate-800">Numéro de téléphone</label>
    <div className={`mt-2 flex h-12 overflow-hidden rounded-xl border bg-white transition focus-within:border-[#2e8b57] focus-within:ring-2 focus-within:ring-[#2e8b57]/15 ${error ? "border-red-400" : "border-slate-300"}`}>
      <label className="relative flex shrink-0 items-center border-r border-slate-200 bg-slate-50 px-3">
        <span className="sr-only">Pays</span>
        <span aria-hidden="true" className="text-lg">{countries[country].flag}</span>
        <span className="ml-2 text-sm font-semibold text-slate-700">{countries[country].dial}</span>
        <ChevronDown size={14} className="ml-1 text-slate-400" aria-hidden="true" />
        <select value={country} onChange={(event) => updateCountry(event.target.value as PhoneCountryCode)} disabled={disabled} className="absolute inset-0 cursor-pointer opacity-0" aria-label="Pays et indicatif">
          {(Object.keys(countries) as PhoneCountryCode[]).map((code) => <option key={code} value={code}>{countries[code].label} ({countries[code].dial})</option>)}
        </select>
      </label>
      <input id={id} value={national} onChange={(event) => updateNational(event.target.value)} inputMode="tel" autoComplete="tel-national" placeholder="Numéro de téléphone" disabled={disabled} required className="min-w-0 flex-1 bg-transparent px-3 text-base outline-none placeholder:text-slate-400" aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} />
    </div>
    {error && <p id={`${id}-error`} role="alert" className="mt-1.5 text-xs text-red-600">{error}</p>}
  </div>;
}
