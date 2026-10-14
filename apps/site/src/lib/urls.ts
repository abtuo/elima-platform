export function publicOrigin(value: string | undefined, fallback: string) {
  const url = new URL(value || fallback);
  const local = process.env.NODE_ENV !== 'production' && ['localhost', '127.0.0.1'].includes(url.hostname);
  if ((url.protocol !== 'https:' && !(local && url.protocol === 'http:')) || url.username || url.password || url.search || url.hash || url.pathname !== '/') throw new Error('Origine publique invalide');
  return url.origin;
}

export function playStoreUrl(value?: string) {
  if (!value?.trim()) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname === 'play.google.com' && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}

export const platformUrl = publicOrigin(process.env.NEXT_PUBLIC_PLATFORM_URL, 'https://app.elima.ci');
export const mobileUrl = publicOrigin(process.env.NEXT_PUBLIC_MOBILE_URL, 'https://m.elima.ci');
export const revisionUrl = publicOrigin(process.env.NEXT_PUBLIC_REVISION_URL, 'https://revision.elima.ci');
export const revisionPlayStoreUrl = playStoreUrl(process.env.NEXT_PUBLIC_REVISION_PLAY_STORE_URL);
export const platformLoginUrl = `${platformUrl}/login`;
