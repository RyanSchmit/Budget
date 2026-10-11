#!/usr/bin/env node
/**
 * One-shot data migration: hosted Supabase -> local PostgreSQL.
 *
 *   node scripts/migrate-from-supabase.js [--truncate]
 *
 * Reads rows over the REST API (the direct Postgres password was never
 * part of the app config, only the service-role key) and inserts them
 * into the database named by DATABASE_URL.
 *
 * Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the
 * environment. Both can be dropped once this has run successfully.
 *
 * Safe to re-run: every insert is ON CONFLICT DO NOTHING, so rows
 * already migrated are skipped rather than duplicated.
 */
require("dotenv").config({ quiet: true });

const db = require("../config/db");

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Ordered so a table's foreign-key targets are always inserted first.
// `jsonb` lists the columns that must be serialised explicitly — node-postgres
// renders a JS array as a Postgres array literal, not as JSON.
const TABLES = [
  { name: "transactions", pk: "transact_id" },
  { name: "goals", pk: "id" },
  { name: "category_limits", pk: "id" },
  { name: "keyword_rules", pk: "user_id", jsonb: ["rules"] },
  { name: "user_ai_preferences", pk: "id" },
  { name: "net_worth_snapshots", pk: "id" },
  { name: "net_worth_snapshot_accounts", pk: "id" },
  { name: "advisor_conversations", pk: "id" },
  { name: "advisor_messages", pk: "id", jsonb: ["metadata"] },
  { name: "advisor_conversation_context", pk: "id" },
];

const PAGE_SIZE = 1000; // PostgREST caps a single response at 1000 rows

async function fetchAll(table) {
  const all = [];

  for (let offset = 0; ; offset += PAGE_SIZE) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*`, {
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        Range: `${offset}-${offset + PAGE_SIZE - 1}`,
      },
    });

    if (!res.ok) {
      throw new Error(`GET ${table} failed: ${res.status} ${await res.text()}`);
    }

    const page = await res.json();
    all.push(...page);

    if (page.length < PAGE_SIZE) return all;
  }
}

async function insertRows(table, rows, jsonbCols = [], pk) {
  if (rows.length === 0) return 0;

  // Every row from PostgREST has the same key set
  const columns = Object.keys(rows[0]);
  const jsonb = new Set(jsonbCols);

  let inserted = 0;

  // Chunked so a large table stays well under the 65535 bound parameter limit
  const perChunk = Math.max(1, Math.floor(60000 / columns.length));

  for (let i = 0; i < rows.length; i += perChunk) {
    const chunk = rows.slice(i, i + perChunk);
    const params = [];
    const tuples = chunk.map((row) => {
      const placeholders = columns.map((col) => {
        const value = row[col];
        params.push(jsonb.has(col) && value !== null ? JSON.stringify(value) : value);
        return `$${params.length}`;
      });
      return `(${placeholders.join(", ")})`;
    });

    const result = await db.query(
      `INSERT INTO ${table} (${columns.join(", ")})
            VALUES ${tuples.join(", ")}
       ON CONFLICT (${pk}) DO NOTHING`,
      params,
    );

    inserted += result.rowCount;
  }

  return inserted;
}

async function main() {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set to run this migration");
  }
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL must be set to run this migration");
  }

  if (process.argv.includes("--truncate")) {
    const names = TABLES.map((t) => t.name).join(", ");
    console.log(`Truncating ${TABLES.length} tables...`);
    await db.query(`TRUNCATE ${names} CASCADE`);
  }

  console.log(`Source: ${SUPABASE_URL}`);
  console.log(`Target: ${process.env.DATABASE_URL}\n`);

  let total = 0;

  for (const { name, pk, jsonb } of TABLES) {
    const rows = await fetchAll(name);
    const inserted = await insertRows(name, rows, jsonb, pk);
    total += inserted;

    const skipped = rows.length - inserted;
    console.log(
      `${name.padEnd(30)} fetched ${String(rows.length).padStart(5)}  ` +
        `inserted ${String(inserted).padStart(5)}` +
        (skipped > 0 ? `  skipped ${skipped} (already present)` : ""),
    );
  }

  console.log(`\nDone — ${total} row(s) inserted.`);
}

main()
  .catch((err) => {
    console.error(`\nMigration failed: ${err.message}`);
    process.exitCode = 1;
  })
  .finally(() => db.pool.end());
