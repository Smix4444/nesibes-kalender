/**
 * Genereert src/lib/database.types.ts uit de migrations, zolang het Supabase-
 * project nog niet gelinkt is. Zodra dat wel zo is:
 *   npm run db:types     (supabase gen types typescript --linked)
 */
import { readFileSync, writeFileSync } from "node:fs";
import PgQuery from "pg-query-emscripten";

// De wasm-parser houdt heap-state bij en crasht op een tweede groot bestand,
// dus elke migration krijgt een verse instantie.
const parse = async (f) => {
  const pg = await PgQuery();
  return pg.parse(readFileSync(`supabase/migrations/${f}`, "utf8")).parse_tree.stmts;
};

const schema = await parse("20261122000001_schema.sql");
const funcs = [...(await parse("20261122000003_functions.sql")), ...(await parse("20261122000002_rls.sql"))];

const enums = {};
const tables = {};

const typeName = (t) => t.names.map((n) => n.String.sval).filter((n) => n !== "pg_catalog").join(".");

function tsType(pgType, isArray) {
  const base = {
    text: "string", varchar: "string", bpchar: "string", uuid: "string", name: "string",
    date: "string", timestamptz: "string", timestamp: "string", time: "string", timetz: "string",
    int2: "number", int4: "number", int8: "number", numeric: "number", float4: "number", float8: "number",
    bool: "boolean", json: "Json", jsonb: "Json", void: "undefined", record: "Json",
  }[pgType] ?? (enums[pgType] ? `Database["public"]["Enums"]["${pgType}"]` : "string");
  return isArray ? `${base}[]` : base;
}

for (const { stmt } of schema) {
  if (stmt.CreateEnumStmt) {
    const name = stmt.CreateEnumStmt.typeName.map((n) => n.String.sval).pop();
    enums[name] = stmt.CreateEnumStmt.vals.map((v) => v.String.sval);
  }
}

for (const { stmt } of schema) {
  const c = stmt.CreateStmt;
  if (!c || (c.relation.schemaname ?? "public") !== "public") continue;

  const cols = [];
  const pkCols = new Set();

  for (const el of c.tableElts ?? []) {
    if (el.Constraint?.contype === "CONSTR_PRIMARY") {
      for (const k of el.Constraint.keys ?? []) pkCols.add(k.String.sval);
    }
  }

  for (const el of c.tableElts ?? []) {
    const d = el.ColumnDef;
    if (!d) continue;
    const cons = (d.constraints ?? []).map((x) => x.Constraint.contype);
    const pg = typeName(d.typeName);
    cols.push({
      name: d.colname,
      ts: tsType(pg, (d.typeName.arrayBounds ?? []).length > 0),
      notNull: cons.includes("CONSTR_NOTNULL") || cons.includes("CONSTR_PRIMARY") || pkCols.has(d.colname),
      hasDefault: cons.includes("CONSTR_DEFAULT") || cons.includes("CONSTR_IDENTITY"),
      identity: cons.includes("CONSTR_IDENTITY"),
    });
  }
  tables[c.relation.relname] = cols;
}

// ---------- functies ----------
const functions = [];
for (const { stmt } of funcs) {
  const f = stmt.CreateFunctionStmt;
  if (!f) continue;
  const names = f.funcname.map((n) => n.String.sval);
  if (names.length === 2 && names[0] !== "public") continue;
  const name = names.pop();
  if (functions.some((x) => x.name === name)) continue;

  const args = [];
  const tableCols = [];
  for (const p of f.parameters ?? []) {
    const fp = p.FunctionParameter;
    const t = tsType(typeName(fp.argType), (fp.argType.arrayBounds ?? []).length > 0);
    if (fp.mode === "FUNC_PARAM_TABLE") tableCols.push({ name: fp.name, ts: t });
    else args.push({ name: fp.name, ts: t, optional: Boolean(fp.defexpr) });
  }

  let returns;
  if (tableCols.length) returns = `{ ${tableCols.map((c) => `${c.name}: ${c.ts}`).join("; ")} }[]`;
  else {
    returns = tsType(typeName(f.returnType), (f.returnType.arrayBounds ?? []).length > 0);
    if (f.returnType.setof) returns += "[]";
  }
  functions.push({ name, args, returns });
}

// ---------- uitschrijven ----------
const q = (s) => (/^[A-Za-z_][A-Za-z0-9_]*$/.test(s) ? s : JSON.stringify(s));
let out = `// AUTOMATISCH GEGENEREERD uit supabase/migrations — niet met de hand aanpassen.
// Opnieuw genereren:  npm run db:types:local
// Zodra het Supabase-project gelinkt is, gebruik je de echte generator:
//                     npm run db:types

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
`;

for (const [name, cols] of Object.entries(tables)) {
  const row = cols.map((c) => `          ${q(c.name)}: ${c.ts}${c.notNull ? "" : " | null"};`).join("\n");
  const ins = cols
    .map((c) => {
      const opt = !c.notNull || c.hasDefault;
      return `          ${q(c.name)}${opt ? "?" : ""}: ${c.ts}${c.notNull ? "" : " | null"};`;
    })
    .join("\n");
  const upd = cols
    .map((c) => `          ${q(c.name)}?: ${c.ts}${c.notNull ? "" : " | null"};`)
    .join("\n");
  out += `      ${q(name)}: {
        Row: {
${row}
        };
        Insert: {
${ins}
        };
        Update: {
${upd}
        };
        Relationships: [];
      };
`;
}

out += `    };
    Views: {
      coin_balances: {
        Row: { user_id: string | null; balance: number | null };
        Relationships: [];
      };
    };
    Functions: {
`;
for (const f of functions.sort((a, b) => a.name.localeCompare(b.name))) {
  const args = f.args.length
    ? `{ ${f.args.map((a) => `${q(a.name)}${a.optional ? "?" : ""}: ${a.ts}`).join("; ")} }`
    : "Record<string, never>";
  out += `      ${q(f.name)}: { Args: ${args}; Returns: ${f.returns} };\n`;
}

out += `    };
    Enums: {
`;
for (const [name, vals] of Object.entries(enums)) {
  out += `      ${q(name)}: ${vals.map((v) => JSON.stringify(v)).join(" | ")};\n`;
}
out += `    };
    CompositeTypes: Record<string, never>;
  };
};

type PublicSchema = Database["public"];

export type Tables<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Row"];
export type TablesInsert<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Update"];
export type Enums<T extends keyof PublicSchema["Enums"]> = PublicSchema["Enums"][T];
`;

writeFileSync("src/lib/database.types.ts", out);
console.log(
  `database.types.ts: ${Object.keys(tables).length} tabellen, ` +
    `${Object.keys(enums).length} enums, ${functions.length} functies`,
);
