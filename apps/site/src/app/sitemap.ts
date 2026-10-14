import type { MetadataRoute } from 'next';
import { FEATURE_MODULES } from '@/lib/feature-modules';
export default function sitemap(): MetadataRoute.Sitemap {
  return ['/', '/a-propos', '/contact', '/tarifs', '/cgv', ...FEATURE_MODULES.map(f => f.href)].map(path => ({ url: `https://elima.ci${path}` }));
}
