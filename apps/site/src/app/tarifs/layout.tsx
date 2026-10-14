import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Tarifs écoles', alternates: { canonical: '/tarifs' }, openGraph: { url: 'https://elima.ci/tarifs', title: 'Tarifs écoles' } };
export default function Layout({ children }: { children: React.ReactNode }) { return children; }
