import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Contact et demande de démo', alternates: { canonical: '/contact' }, openGraph: { url: 'https://elima.ci/contact', title: 'Contact et demande de démo' } };
export default function Layout({ children }: { children: React.ReactNode }) { return children; }
