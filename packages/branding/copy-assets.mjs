import { copyFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

// Build artifacts only: the two applications share a single tracked source.
const destination = resolve(process.cwd(), 'public');
await mkdir(destination, { recursive: true });
for (const file of ['logo.png', 'logo_wo_bg.png']) {
  await copyFile(new URL(`./public/${file}`, import.meta.url), resolve(destination, file));
}
