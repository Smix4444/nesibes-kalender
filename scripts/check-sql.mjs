/**
 * Syntaxcontrole van alle migrations met de echte Postgres-parser (libpg_query
 * via wasm), zodat een typefout niet pas bij `supabase db push` opvalt.
 *
 *   npm run db:check
 *
 * Let op: dit controleert de SQL-syntax op het hoogste niveau. De inhoud van
 * plpgsql-functies ($$ ... $$) is voor de parser één string, en semantiek
 * (bestaat die kolom wel?) wordt pas bij het pushen gecontroleerd.
 *
 * Elke migration krijgt een eigen proces: de wasm-parser houdt heap-state bij
 * en crasht als je er meerdere grote bestanden achter elkaar door duwt.
 */
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const DIR = "supabase/migrations";
const self = fileURLToPath(import.meta.url);

async function checkOne(file) {
  const { default: PgQuery } = await import("pg-query-emscripten");
  const sql = readFileSync(path.join(DIR, file), "utf8");
  const pg = await PgQuery();
  const res = pg.parse(sql);

  if (res.error) {
    console.error(`FAIL  ${file}`);
    console.error(`      ${res.error.message} (positie ${res.error.cursorpos})`);
    const start = Math.max(0, res.error.cursorpos - 250);
    console.error("      ..." + sql.slice(start, res.error.cursorpos + 60) + " <<< HIER");
    process.exit(1);
  }
  console.log(`ok    ${file} — ${res.parse_tree?.stmts?.length ?? 0} statements`);
}

if (process.argv[2]) {
  await checkOne(process.argv[2]);
} else {
  const files = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();
  let failed = 0;
  for (const file of files) {
    const run = spawnSync(process.execPath, [self, file], { stdio: "inherit" });
    if (run.status !== 0) failed++;
  }
  if (failed) {
    console.error(`\n${failed} migration(s) met een syntaxfout.`);
    process.exit(1);
  }
  console.log(`\nAlle ${files.length} migrations zijn syntactisch in orde.`);
}
