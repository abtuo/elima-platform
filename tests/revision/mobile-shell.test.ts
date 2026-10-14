import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = (file: string) => readFile(new URL(`../../apps/revision/src/${file}`, import.meta.url), "utf8");

test("les onglets partagent un viewport mobile et un seul conteneur scrollable", async () => {
  const shell = await source("RevisionShell.tsx");
  const css = await source("index.css");
  assert.match(shell, /revision-shell-scroll/);
  assert.match(shell, /<nav className="fixed inset-x-0 bottom-0/);
  assert.match(shell, /pb-\[calc\(5rem\+env\(safe-area-inset-bottom\)\)\]/);
  assert.match(css, /@media \(max-width: 1023px\)/);
  assert.match(css, /\.revision-shell \{[^}]*height: 100dvh;[^}]*min-height: 0;/s);
  assert.match(css, /\.revision-shell-scroll \{[^}]*min-height: 0;[^}]*overflow-y: auto;/s);
});

test("la grille Accueil et ses cartes peuvent retrecir sans largeur viewport fixe", async () => {
  const home = await source("features/home/StudentHomePage.tsx");
  const css = await source("index.css");
  assert.match(home, /grid min-w-0 grid-cols-1/);
  assert.match(home, /minmax\(0,1\.2fr\)_minmax\(0,\.8fr\)/);
  assert.match(css, /\.student-home :is\(section, article, button\) \{\s*min-width: 0;\s*max-width: 100%;/);
  assert.doesNotMatch(home, /100vw|w-screen|w-\[\d+px\]/);
});
