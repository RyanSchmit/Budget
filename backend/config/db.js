const { Pool, types } = require("pg");

// ------------------------------------------------------------------
// Type parsers
//
// node-postgres defaults differ from what the API used to emit, and
// the frontend depends on the old shapes:
//   numeric -> string  ("85.42")        must stay a JSON number
//   date    -> Date    (tz-shifted!)    must stay a "YYYY-MM-DD" string
//   int8    -> string  ("1399")         must stay a JSON number
// Leaving `date` as a Date is the dangerous one: serialising it would
// apply the local timezone offset and move transactions by a day.
// ------------------------------------------------------------------
types.setTypeParser(types.builtins.NUMERIC, (v) => (v === null ? null : Number(v)));
types.setTypeParser(types.builtins.DATE, (v) => v);
types.setTypeParser(types.builtins.INT8, (v) => (v === null ? null : Number(v)));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: Number(process.env.PGPOOL_MAX) || 10,
});

pool.on("error", (err) => {
  console.error("Unexpected idle client error", err);
});

/** Run a query and return the full pg result. */
function query(text, params) {
  return pool.query(text, params);
}

/** Run a query and return all rows. */
async function rows(text, params) {
  const result = await pool.query(text, params);
  return result.rows;
}

/** Run a query and return the first row, or null when there are none. */
async function one(text, params) {
  const result = await pool.query(text, params);
  return result.rows[0] ?? null;
}

/**
 * Run `fn` inside a transaction, passing it a dedicated client.
 * Commits on success, rolls back on any thrown error.
 */
async function transaction(fn) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { pool, query, rows, one, transaction };
