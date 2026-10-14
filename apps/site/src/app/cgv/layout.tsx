import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Conditions générales de vente', alternates: { canonical: '/cgv' }, openGraph: { url: 'https://elima.ci/cgv', title: 'Conditions générales de vente' } };
export default function Layout({ children }: { children: React.ReactNode }) { return children; }
