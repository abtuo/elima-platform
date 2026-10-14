import type { NextConfig } from 'next';
import path from 'node:path';

const config: NextConfig = {
  turbopack: { root: path.resolve(process.cwd(), '../..') },
  outputFileTracingIncludes: { '/cgv': ['./src/content/cgv.md'] },
  async redirects() {
    return [
      { source: '/fonctionnalites', destination: '/#produit', permanent: true },
      { source: '/ecoles', destination: '/#roles', permanent: true },
      { source: '/revision', destination: '/#revision', permanent: true },
    ];
  },
};
export default config;
