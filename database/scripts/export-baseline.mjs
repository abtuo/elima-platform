import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import postgres from "postgres";

const outputFile = process.env.OUTPUT_FILE;
const targetRef = process.env.TARGET_REF;

if (!outputFile || !targetRef) {
  throw new Error("OUTPUT_FILE and TARGET_REF are required");
}

const connection = process.env.DATABASE_URL
  ? postgres(process.env.DATABASE_URL, { max: 1, ssl: "require" })
  : postgres({
      host: process.env.PGHOST,
      port: Number(process.env.PGPORT || 5432),
      database: process.env.PGDATABASE || "postgres",
      username: process.env.PGUSER,
      password: process.env.PGPASSWORD,
      max: 1,
      ssl: "require",
    });

const quoteIdentifier = (value) => `"${String(value).replaceAll('"', '""')}"`;
const quoteLiteral = (value) =>
  value === null || value === undefined
    ? "null"
    : `'${String(value).replaceAll("'", "''")}'`;
const qualified = (schema, name) => `${quoteIdentifier(schema)}.${quoteIdentifier(name)}`;

function policySql(policy) {
  const roles = policy.roles.map(quoteIdentifier).join(", ");
  const parts = [
    `create policy ${quoteIdentifier(policy.name)} on ${qualified(policy.schema, policy.table)}`,
    `  as ${policy.permissive ? "permissive" : "restrictive"}`,
    `  for ${policy.command.toLowerCase()}`,
    `  to ${roles}`,
  ];
  if (policy.using_expression) parts.push(`  using (${policy.using_expression})`);
  if (policy.check_expression) parts.push(`  with check (${policy.check_expression})`);
  return `${parts.join("\n")};`;
}

async function fetchBuckets() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return [];
  const response = await fetch(`${url.replace(/\/+$/, "")}/storage/v1/bucket`, {
    headers: { apikey: key, authorization: `Bearer ${key}` },
  });
  if (!response.ok) throw new Error(`Storage bucket inventory failed (${response.status})`);
  const buckets = await response.json();
  return buckets.map((bucket) => ({
    id: bucket.id,
    name: bucket.name,
    public: Boolean(bucket.public),
    file_size_limit: bucket.file_size_limit ?? null,
    allowed_mime_types: bucket.allowed_mime_types ?? null,
  }));
}

async function main() {
  const [
    extensions,
    enums,
    domains,
    tables,
    columns,
    constraints,
    indexes,
    views,
    functions,
    triggers,
    policies,
    migrationTable,
    buckets,
  ] = await Promise.all([
    connection`
      select e.extname as name, e.extversion as version, n.nspname as schema
      from pg_extension e join pg_namespace n on n.oid = e.extnamespace
      where e.extname <> 'plpgsql'
      order by e.extname
    `,
    connection`
      select n.nspname as schema, t.typname as name,
             array_agg(e.enumlabel order by e.enumsortorder) as labels
      from pg_type t join pg_namespace n on n.oid = t.typnamespace
      join pg_enum e on e.enumtypid = t.oid
      where n.nspname = 'public'
      group by n.nspname, t.typname order by t.typname
    `,
    connection`
      select n.nspname as schema, t.typname as name,
             pg_catalog.format_type(t.typbasetype, t.typtypmod) as base_type,
             t.typnotnull as not_null,
             pg_get_expr(t.typdefaultbin, 0) as default_expression,
             c.conname as constraint_name,
             pg_get_constraintdef(c.oid, true) as constraint_definition
      from pg_type t join pg_namespace n on n.oid = t.typnamespace
      left join pg_constraint c on c.contypid = t.oid
      where n.nspname = 'public' and t.typtype = 'd'
      order by t.typname, c.conname
    `,
    connection`
      select n.nspname as schema, c.relname as name,
             c.relrowsecurity as rls_enabled, c.relforcerowsecurity as rls_forced
      from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind in ('r', 'p')
      order by c.relname
    `,
    connection`
      select n.nspname as schema, c.relname as table_name, a.attnum as position,
             a.attname as name, pg_catalog.format_type(a.atttypid, a.atttypmod) as data_type,
             a.attnotnull as not_null, a.attidentity as identity_kind,
             a.attgenerated as generated_kind,
             pg_get_expr(d.adbin, d.adrelid) as default_expression,
             coll.collname as collation
      from pg_attribute a
      join pg_class c on c.oid = a.attrelid
      join pg_namespace n on n.oid = c.relnamespace
      left join pg_attrdef d on d.adrelid = a.attrelid and d.adnum = a.attnum
      left join pg_collation coll on coll.oid = a.attcollation
        and a.attcollation <> (select typcollation from pg_type where oid = a.atttypid)
      where n.nspname = 'public' and c.relkind in ('r', 'p')
        and a.attnum > 0 and not a.attisdropped
      order by c.relname, a.attnum
    `,
    connection`
      select ns.nspname as schema, cls.relname as table_name, con.conname as name,
             con.contype as type, pg_get_constraintdef(con.oid, true) as definition
      from pg_constraint con
      join pg_class cls on cls.oid = con.conrelid
      join pg_namespace ns on ns.oid = cls.relnamespace
      where ns.nspname = 'public'
      order by cls.relname,
        case con.contype when 'p' then 1 when 'u' then 2 when 'c' then 3 when 'f' then 4 else 5 end,
        con.conname
    `,
    connection`
      select ns.nspname as schema, tbl.relname as table_name, idx.relname as name,
             pg_get_indexdef(i.indexrelid) as definition
      from pg_index i
      join pg_class idx on idx.oid = i.indexrelid
      join pg_class tbl on tbl.oid = i.indrelid
      join pg_namespace ns on ns.oid = tbl.relnamespace
      where ns.nspname = 'public'
        and not exists (select 1 from pg_constraint c where c.conindid = i.indexrelid)
      order by tbl.relname, idx.relname
    `,
    connection`
      select n.nspname as schema, c.relname as name, c.relkind as kind,
             pg_get_viewdef(c.oid, true) as definition
      from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind in ('v', 'm')
      order by c.relname
    `,
    connection`
      select n.nspname as schema, p.proname as name,
             pg_get_function_identity_arguments(p.oid) as arguments,
             pg_get_functiondef(p.oid) as definition
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
      order by p.proname, pg_get_function_identity_arguments(p.oid)
    `,
    connection`
      select ns.nspname as schema, cls.relname as table_name, trg.tgname as name,
             pg_get_triggerdef(trg.oid, true) as definition
      from pg_trigger trg
      join pg_class cls on cls.oid = trg.tgrelid
      join pg_namespace ns on ns.oid = cls.relnamespace
      where not trg.tgisinternal and ns.nspname = 'public'
      order by cls.relname, trg.tgname
    `,
    connection`
      select ns.nspname as schema, cls.relname as table, pol.polname as name,
             pol.polpermissive as permissive,
             case pol.polcmd when 'r' then 'select' when 'a' then 'insert'
               when 'w' then 'update' when 'd' then 'delete' else 'all' end as command,
             case when 0 = any(pol.polroles) then array['public']::text[]
               else array(select rolname from pg_roles where oid = any(pol.polroles) order by rolname) end as roles,
             pg_get_expr(pol.polqual, pol.polrelid) as using_expression,
             pg_get_expr(pol.polwithcheck, pol.polrelid) as check_expression
      from pg_policy pol
      join pg_class cls on cls.oid = pol.polrelid
      join pg_namespace ns on ns.oid = cls.relnamespace
      where ns.nspname in ('public', 'storage')
      order by ns.nspname, cls.relname, pol.polname
    `,
    connection`select to_regclass('supabase_migrations.schema_migrations') is not null as exists`,
    fetchBuckets(),
  ]);

  const migrations = migrationTable[0]?.exists
    ? await connection`
        select version, name from supabase_migrations.schema_migrations order by version
      `
    : [];

  const lines = [
    `-- Elima Supabase structural baseline`,
    `-- Project ref: ${targetRef}`,
    `-- Generated: ${new Date().toISOString()}`,
    `-- Structure only: no application rows, Auth users, Storage objects or secrets.`,
    `-- Reference snapshot; do not apply blindly to a managed Supabase project.`,
    ``,
    `-- Supabase CLI migration history table: ${migrationTable[0]?.exists ? "present" : "absent"}`,
  ];
  for (const migration of migrations) {
    lines.push(`-- Applied migration: ${migration.version}${migration.name ? ` ${migration.name}` : ""}`);
  }

  lines.push("", "-- Extensions");
  for (const extension of extensions) {
    lines.push(
      `create extension if not exists ${quoteIdentifier(extension.name)} with schema ${quoteIdentifier(extension.schema)};`,
    );
  }

  lines.push("", "-- Application types");
  for (const entry of enums) {
    lines.push(
      `create type ${qualified(entry.schema, entry.name)} as enum (${entry.labels.map(quoteLiteral).join(", ")});`,
    );
  }
  for (const domain of domains) {
    const clauses = [`create domain ${qualified(domain.schema, domain.name)} as ${domain.base_type}`];
    if (domain.default_expression) clauses.push(`  default ${domain.default_expression}`);
    if (domain.not_null) clauses.push("  not null");
    if (domain.constraint_definition) {
      clauses.push(`  constraint ${quoteIdentifier(domain.constraint_name)} ${domain.constraint_definition}`);
    }
    lines.push(`${clauses.join("\n")};`);
  }

  lines.push("", "-- Application tables");
  for (const table of tables) {
    const tableColumns = columns.filter((column) => column.table_name === table.name);
    const definitions = tableColumns.map((column) => {
      const parts = [`  ${quoteIdentifier(column.name)} ${column.data_type}`];
      if (column.collation) parts.push(`collate ${quoteIdentifier(column.collation)}`);
      if (column.identity_kind === "a") parts.push("generated always as identity");
      if (column.identity_kind === "d") parts.push("generated by default as identity");
      if (column.generated_kind === "s") {
        parts.push(`generated always as (${column.default_expression}) stored`);
      } else if (column.default_expression && !column.identity_kind) {
        parts.push(`default ${column.default_expression}`);
      }
      if (column.not_null) parts.push("not null");
      return parts.join(" ");
    });
    lines.push(`create table ${qualified(table.schema, table.name)} (\n${definitions.join(",\n")}\n);`);
  }

  lines.push("", "-- Constraints");
  for (const constraint of constraints) {
    lines.push(
      `alter table only ${qualified(constraint.schema, constraint.table_name)} add constraint ${quoteIdentifier(constraint.name)} ${constraint.definition};`,
    );
  }

  lines.push("", "-- Indexes");
  for (const index of indexes) lines.push(`${index.definition};`);

  lines.push("", "-- Views");
  for (const view of views) {
    const materialized = view.kind === "m" ? "materialized " : "";
    lines.push(`create ${materialized}view ${qualified(view.schema, view.name)} as\n${view.definition};`);
  }

  lines.push("", "-- Functions and RPC");
  for (const fn of functions) lines.push(`${fn.definition.trim()}\n`);

  lines.push("", "-- Triggers");
  for (const trigger of triggers) lines.push(`${trigger.definition};`);

  lines.push("", "-- Row-level security");
  for (const table of tables) {
    if (table.rls_enabled) lines.push(`alter table ${qualified(table.schema, table.name)} enable row level security;`);
    if (table.rls_forced) lines.push(`alter table ${qualified(table.schema, table.name)} force row level security;`);
  }
  for (const policy of policies) lines.push(policySql(policy));

  lines.push("", "-- Storage buckets (configuration only; objects are intentionally excluded)");
  for (const bucket of buckets) {
    const mimeTypes = bucket.allowed_mime_types
      ? `array[${bucket.allowed_mime_types.map(quoteLiteral).join(", ")}]::text[]`
      : "null";
    lines.push(
      `insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values (${quoteLiteral(bucket.id)}, ${quoteLiteral(bucket.name)}, ${bucket.public}, ${bucket.file_size_limit ?? "null"}, ${mimeTypes}) on conflict (id) do nothing;`,
    );
  }

  lines.push("");
  const destination = resolve(outputFile);
  await mkdir(dirname(destination), { recursive: true });
  await writeFile(destination, `${lines.join("\n")}\n`, "utf8");
  process.stdout.write(
    `${JSON.stringify({ targetRef, outputFile: destination, tables: tables.length, functions: functions.length, policies: policies.length, buckets: buckets.length, migrations: migrations.length })}\n`,
  );
}

try {
  await main();
} finally {
  await connection.end({ timeout: 5 });
}
