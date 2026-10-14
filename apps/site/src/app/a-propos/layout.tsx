import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Pour les écoles', alternates: { canonical: '/a-propos' }, openGraph: { url: 'https://elima.ci/a-propos', title: 'Pour les écoles' } };
export default function Layout({ children }: { children: React.ReactNode }) { return children; }
