type Entry = { count: number; resetAt: number };
const buckets = new Map<string, Entry>();
export function consumeOtpRequest(key: string, now = Date.now()) {
  const current = buckets.get(key);
  if (!current || current.resetAt <= now) { buckets.set(key, { count: 1, resetAt: now + 10 * 60_000 }); return true; }
  if (current.count >= 3) return false;
  current.count += 1;
  return true;
}
