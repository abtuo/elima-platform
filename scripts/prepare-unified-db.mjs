import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const techRoot = path.join(root, "apps", "platform", "supabase");
const mobileMigrations = path.join(root, "supabase", "migrations");
const outputDir = path.join(root, "supabase", "generated");
const output = path.join(outputDir, "elima-unified-database.sql");

async function sqlFiles(directory) {
  return (await readdir(directory, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && entry.name.endsWith(".sql"))
    .map((entry) => path.join(directory, entry.name))
    .sort((a, b) => path.basename(a).localeCompare(path.basename(b)));
}

const sources = [
  path.join(techRoot, "schema.sql"),
  ...(await sqlFiles(path.join(techRoot, "migrations"))),
  ...(await sqlFiles(mobileMigrations)),
];

const sections = [
  "-- Elima unified database bundle",
  "-- Generated locally; never add secrets or data to this file.",
  "\\set ON_ERROR_STOP on",
];

for (const source of sources) {
  const relative = path.relative(root, source).replaceAll("\\", "/");
  sections.push(`\n-- ============================================================\n-- SOURCE: ${relative}\n-- ============================================================\n`);
  let contents = await readFile(source, "utf8");
  if (source === sources[0]) {
    // schools et terms ont une relation circulaire : créer d'abord les deux
    // tables, puis poser la FK current_term_id.
    contents = contents.replace(
      "current_term_id uuid references public.terms(id),",
      "current_term_id uuid,",
    );
    contents += `

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'schools_current_term_id_fkey'
      and conrelid = 'public.schools'::regclass
  ) then
    alter table public.schools
      add constraint schools_current_term_id_fkey
      foreign key (current_term_id) references public.terms(id);
  end if;
end$$;
`;
  }
  sections.push(contents);
}

await mkdir(outputDir, { recursive: true });
await writeFile(output, sections.join("\n"), "utf8");
console.log(`Bundle créé : ${path.relative(root, output)}`);
console.log(`Sources concaténées : ${sources.length}`);
