// Antony Pallazo — full data backup (read-only). Run BEFORE any security change.
//
// Usage (from the project folder, Node 20.6+):
//   node --env-file=.env backup-supabase.mjs
//
// Uses SUPABASE_URL / SUPABASE_KEY if set, otherwise your existing
// VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY from .env. It only READS data.
//
// WARNING: the backup contains residents' passwords in plain text (that is how
// the app stores them today). Keep the folder private. This script creates
// backups/.gitignore so git ignores it, but never upload or email the files.

import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
if (!url || !key) {
  console.error("Missing Supabase URL/key. Run:  node --env-file=.env backup-supabase.mjs");
  process.exit(1);
}
const supabase = createClient(url, key);

// Every base table the app uses (views are derived, so they are not backed up).
// receipts / users are included in case they exist; they are skipped if not.
const TABLES = [
  "account_settings", "admin_group", "apartment_info", "bills", "corpus_payments",
  "eb_details", "employee_details", "expenses", "fixed_deposits", "flats",
  "maintenance_slabs", "notices", "notifications", "other_income",
  "payment_submissions", "payments", "receipts", "registration_requests",
  "resident_users", "salary_payments", "super_admin_credentials", "users",
];

const PAGE = 1000; // Supabase returns at most 1000 rows per request
const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
const outDir = path.join("backups", `backup-${stamp}`);
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join("backups", ".gitignore"), "*\n"); // keep backups out of git

async function fetchPage(table, from, ordered) {
  let q = supabase.from(table).select("*");
  if (ordered) q = q.order("id", { ascending: true });
  return q.range(from, from + PAGE - 1);
}

async function dumpTable(table) {
  const rows = [];
  let ordered = true;
  for (let from = 0; ; from += PAGE) {
    let { data, error } = await fetchPage(table, from, ordered);
    if (error && ordered && (error.code === "42703" || /does not exist/i.test(error.message || ""))) {
      ordered = false; // this table has no "id" column — fetch unordered
      ({ data, error } = await fetchPage(table, from, ordered));
    }
    if (error) return { error };
    rows.push(...data);
    if (data.length < PAGE) break;
  }
  return { rows };
}

const manifest = { createdAt: new Date().toISOString(), project: url, tables: {} };
let failed = 0;
console.log(`Backing up to ${outDir}\n`);
for (const table of TABLES) {
  const { rows, error } = await dumpTable(table);
  if (error) {
    const missing = error.code === "PGRST205" || error.code === "42P01" || /could not find the table|does not exist/i.test(error.message || "");
    manifest.tables[table] = missing ? { status: "not found (skipped)" } : { status: "ERROR", message: error.message, code: error.code };
    if (missing) console.log(`  -   ${table.padEnd(26)} not found (skipped)`);
    else { failed++; console.log(`  ✗   ${table.padEnd(26)} ERROR: ${error.message}`); }
    continue;
  }
  fs.writeFileSync(path.join(outDir, `${table}.json`), JSON.stringify(rows, null, 2));
  manifest.tables[table] = { status: "ok", rows: rows.length };
  console.log(`  ✓   ${table.padEnd(26)} ${String(rows.length).padStart(6)} rows`);
}
fs.writeFileSync(path.join(outDir, "_manifest.json"), JSON.stringify(manifest, null, 2));

console.log(failed
  ? `\n${failed} table(s) failed — see above. Do NOT proceed until the backup is complete.`
  : `\nBackup complete. Compare the row counts above with the Supabase Table Editor, then keep this folder private.`);
process.exit(failed ? 1 : 0);
