/**
 * Supabase Auth doesn't reliably support phone+password in all client SDK versions.
 * For the MVP we map a phone number to a deterministic email-like identifier.
 *
 * Example: +2250102030405 -> +2250102030405@phone.elima
 */
export function phoneToEmail(phone: string) {
  const normalized = phone.trim();
  return `${normalized}@phone.elima`;
}
