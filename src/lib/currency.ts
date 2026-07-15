const currencyAliases: Record<string, string> = {
  FCFA: "XOF",
  "F CFA": "XOF",
};

export function normalizeCurrencyCode(currency?: string | null) {
  const value = String(currency ?? "XOF").trim().toUpperCase();
  return currencyAliases[value] ?? (/^[A-Z]{3}$/.test(value) ? value : "XOF");
}

export function formatMoney(value: number, currency?: string | null) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: normalizeCurrencyCode(currency),
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);
}
