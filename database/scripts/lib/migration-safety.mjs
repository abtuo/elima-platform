import { createHash } from "node:crypto";

export const PROJECTS = Object.freeze({
  identity: {
    manifestTarget: "core",
    projectRef: "nnsgvnjzfrcmbxfwlyow",
    databaseUrlVariables: ["IDENTITY_SUPABASE_DB_URL", "CORE_SUPABASE_DB_URL"],
  },
  revision: {
    manifestTarget: "revision",
    projectRef: "rydnrvvmwixrkmnvpajf",
    databaseUrlVariables: ["REVISION_SUPABASE_DB_URL"],
  },
});

export function projectRefFromDatabaseUrl(databaseUrl) {
  const parsed = new URL(databaseUrl);
  return parsed.hostname.match(/^db\.([a-z0-9]+)\.supabase\.co$/i)?.[1]
    ?? decodeURIComponent(parsed.username).match(/^postgres\.([a-z0-9]+)$/i)?.[1]
    ?? null;
}

export function resolveDatabaseUrl(target, environment = process.env) {
  const project = PROJECTS[target];
  if (!project) throw new Error("Cible obligatoire : --target=revision ou --target=identity.");
  const candidates = [...project.databaseUrlVariables, "SUPABASE_DB_URL", "DATABASE_URL"];
  for (const variable of candidates) {
    const value = environment[variable]?.trim();
    if (!value) continue;
    const actualRef = projectRefFromDatabaseUrl(value);
    if (actualRef !== project.projectRef) {
      if (project.databaseUrlVariables.includes(variable)) {
        throw new Error(`${variable} ne correspond pas au projet ${target} attendu.`);
      }
      continue;
    }
    return { databaseUrl: value, variable, project };
  }
  throw new Error(
    `Accès PostgreSQL ${target} absent. Configure ${project.databaseUrlVariables.join(" ou ")} avec une URL PostgreSQL du projet ${project.projectRef}; une clé API/service_role ne convient pas.`,
  );
}

export function sha256(contents) {
  return createHash("sha256").update(contents).digest("hex");
}

function executableSql(sql) {
  return sql
    .replace(/\$([A-Za-z_][A-Za-z0-9_]*)?\$[\s\S]*?\$\1\$/g, " $$FUNCTION_BODY$$ ")
    .replace(/--[^\r\n]*/g, " ")
    .replace(/\/\*[\s\S]*?\*\//g, " ");
}

export function analyzeMigrationSafety(sql) {
  const executable = executableSql(sql);
  const findings = [];
  const add = (id, severity, detail) => findings.push({ id, severity, detail });
  if (/\bdrop\s+table\b/i.test(executable)) add("drop-table", "critical", "Suppression de table");
  if (/\btruncate\b/i.test(executable)) add("truncate", "critical", "Troncature de données");
  if (/\bdrop\s+column\b/i.test(executable)) add("drop-column", "critical", "Suppression de colonne");
  if (/\balter\s+column\b[\s\S]*?\btype\b/i.test(executable)) add("alter-column-type", "critical", "Modification de type");
  if (/\bdrop\s+policy\b/i.test(executable)) add("drop-policy", "critical", "Suppression de politique RLS");
  if (/\bgrant\s+all\b|\bgrant\b[\s\S]*?\bto\s+(public|anon)\b/i.test(executable)) add("sensitive-grant", "critical", "Ouverture de permissions publiques");
  if (/\bdrop\s+constraint\b/i.test(executable)) add("drop-constraint", "review", "Remplacement d'une contrainte");
  if (/\balter\s+table\b/i.test(executable)) add("access-exclusive-lock", "review", "ALTER TABLE peut prendre un verrou exclusif bref");
  for (const statement of executable.split(";")) {
    if (/^\s*update\b/i.test(statement)) add(/\bwhere\b/i.test(statement) ? "bounded-update" : "unbounded-update", /\bwhere\b/i.test(statement) ? "review" : "critical", "Mise à jour de données");
    if (/^\s*delete\s+from\b/i.test(statement)) add(/\bwhere\b/i.test(statement) ? "bounded-delete" : "unbounded-delete", /\bwhere\b/i.test(statement) ? "review" : "critical", "Suppression de données");
  }
  if (/\bsecurity\s+definer\b/i.test(sql)) add("security-definer-function", "review", "Fonction SECURITY DEFINER");
  return findings;
}

export function assertAuthorizedFindings(findings, authorized = []) {
  const allowed = new Set(authorized);
  const blocked = findings.filter((finding) => finding.severity === "critical" || !allowed.has(finding.id));
  if (blocked.length) {
    throw new Error(`Migration bloquée par l'analyse de sécurité : ${blocked.map((finding) => finding.id).join(", ")}.`);
  }
}
