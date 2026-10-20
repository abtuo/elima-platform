import { createHash } from "node:crypto";
import { mkdtemp, mkdir, copyFile, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const repositoryRoot = resolve(import.meta.dirname, "../..");
const target = process.argv.find((argument) => argument.startsWith("--target="))?.split("=")[1];
const shouldDryRun = process.argv.includes("--dry-run");
const shouldApply = process.argv.includes("--apply");
const confirmation = process.argv.find((argument) => argument.startsWith("--confirm-ref="))?.split("=")[1];

if (!target || !["core", "revision"].includes(target)) {
  throw new Error("Use --target=core or --target=revision");
}
if (shouldDryRun && shouldApply) throw new Error("Choose either --dry-run or --apply");

const manifestPath = resolve(repositoryRoot, `database/${target}/migrations/manifest.json`);
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
if (manifest.project !== target) throw new Error("Manifest target mismatch");
if (shouldApply && confirmation !== manifest.projectRef) {
  throw new Error(`Refusing apply: pass --confirm-ref=${manifest.projectRef}`);
}

const versions = new Set();
const migrations = [];
for (const entry of manifest.deployable) {
  if (versions.has(entry.version)) throw new Error(`Duplicate migration version ${entry.version}`);
  for (const dependency of entry.dependsOn) {
    if (!versions.has(dependency)) throw new Error(`${entry.version} depends on missing or unordered ${dependency}`);
  }
  const source = resolve(repositoryRoot, entry.source);
  const contents = await readFile(source, "utf8");
  if (target === "core" && contents.includes("rydnrvvmwixrkmnvpajf")) {
    throw new Error(`${entry.source} references the Revision project`);
  }
  if (target === "revision" && contents.includes("nnsgvnjzfrcmbxfwlyow")) {
    throw new Error(`${entry.source} references the Core project`);
  }
  versions.add(entry.version);
  migrations.push({
    ...entry,
    source,
    contents,
    sha256: createHash("sha256").update(contents).digest("hex"),
  });
}

const plan = {
  target,
  projectRef: manifest.projectRef,
  mode: shouldApply ? "apply" : shouldDryRun ? "dry-run" : "plan",
  migrations: migrations.map(({ version, source, dependsOn, sha256 }) => ({
    version,
    source: source.slice(repositoryRoot.length + 1).replaceAll("\\", "/"),
    dependsOn,
    sha256,
  })),
};

if (!shouldDryRun && !shouldApply) {
  process.stdout.write(`${JSON.stringify(plan, null, 2)}\n`);
  process.exit(0);
}
if (!migrations.length) throw new Error(`No deployable migrations for ${target}`);

const workdir = await mkdtemp(join(tmpdir(), `elima-${target}-migrations-`));
const migrationsDir = join(workdir, "supabase", "migrations");
await mkdir(migrationsDir, { recursive: true });
await writeFile(
  join(workdir, "supabase", "config.toml"),
  `project_id = "elima-${target}-guarded"\n[db]\nmajor_version = 17\n[db.seed]\nenabled = false\n`,
  "utf8",
);
for (const migration of migrations) {
  await copyFile(migration.source, join(migrationsDir, basename(migration.source)));
}

process.stdout.write(`${JSON.stringify({ ...plan, workdir }, null, 2)}\n`);
const cliArguments = [
  "supabase@2.121.0",
  "db",
  "push",
  ...(shouldDryRun ? ["--dry-run"] : []),
  "--skip-vault",
  "--project-ref",
  manifest.projectRef,
  "--workdir",
  workdir,
];
const result = spawnSync("npx", cliArguments, { stdio: "inherit", shell: process.platform === "win32" });
if (result.error) throw result.error;
process.exit(result.status ?? 1);
