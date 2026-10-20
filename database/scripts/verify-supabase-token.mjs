import { PROJECTS } from "./lib/migration-safety.mjs";

const target = process.argv.find((argument) => argument.startsWith("--target="))?.split("=")[1];
if (!target || !PROJECTS[target]) throw new Error("Cible obligatoire : --target=revision ou --target=identity.");

const tokenVariables = target === "identity"
  ? ["IDENTITY_ACCESS_TOKEN", "SUPABASE_ACCESS_TOKEN"]
  : ["REVISION_ACCESS_TOKEN", "SUPABASE_ACCESS_TOKEN"];
const tokenVariable = tokenVariables.find((name) => process.env[name]?.trim());
if (!tokenVariable) throw new Error(`Token absent : configure ${tokenVariables.join(" ou ")}.`);

const token = process.env[tokenVariable].trim();
const projectRef = PROJECTS[target].projectRef;
const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

const projectsResponse = await fetch("https://api.supabase.com/v1/projects", { headers });
if (!projectsResponse.ok) throw new Error(`Authentification Supabase refusée (HTTP ${projectsResponse.status}).`);
const projects = await projectsResponse.json();
const visibleRefs = new Set(projects.map((project) => project.ref ?? project.id));
if (!visibleRefs.has(projectRef)) throw new Error(`Le token ${tokenVariable} ne donne pas accès au projet ${target} ${projectRef}.`);

const queryResponse = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query/read-only`, {
  method: "POST",
  headers,
  body: JSON.stringify({
    query: "select current_database() as database, current_setting('server_version') as server_version",
    parameters: [],
  }),
});
if (!queryResponse.ok) {
  const error = await queryResponse.json().catch(() => ({}));
  throw new Error(`Accès SQL en lecture seule refusé (HTTP ${queryResponse.status}) : ${error.message ?? error.error ?? "permission database_read manquante"}.`);
}
const rows = await queryResponse.json();
console.log(JSON.stringify({ target, projectRef, tokenVariable, projectVisible: true, readOnlySqlAccess: true, rowCount: Array.isArray(rows) ? rows.length : null }, null, 2));
