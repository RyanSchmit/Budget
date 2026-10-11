const db = require("../config/db");
const {
  requireString,
  requireNumber,
  requireDate,
  parsePagination,
  validate,
} = require("../utils/validation");

const COLUMNS = "transact_id, user_id, date, description, category, amount, created_at, updated_at";

exports.list = async (req, res, next) => {
  try {
    const { limit, page } = parsePagination(req.query, { defaultLimit: 1000, maxLimit: 1000 });
    const offset = page * limit;

    // Secondary sort on the unique key so pagination is deterministic.
    // Ordering by `date` alone lets rows sharing a date shuffle between
    // pages, producing duplicate/missing rows across paged requests.
    const { rows } = await db.query(
      `SELECT ${COLUMNS}, count(*) OVER () AS total_count
         FROM transactions
        WHERE user_id = $1
        ORDER BY date DESC, transact_id ASC
        LIMIT $2 OFFSET $3`,
      [req.user.id, limit, offset],
    );

    // count(*) OVER () gives the unpaginated total on every row, so the
    // count comes back in the same round trip. No rows means no matches.
    const count = rows.length > 0 ? rows[0].total_count : 0;
    const data = rows.map(({ total_count, ...rest }) => rest);

    res.json({ data, count });
  } catch (err) {
    next(err);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const data = await db.one(
      `SELECT ${COLUMNS} FROM transactions WHERE transact_id = $1 AND user_id = $2`,
      [req.params.id, req.user.id],
    );

    if (!data) {
      return res.status(404).json({ error: "Transaction not found" });
    }
    res.json(data);
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const { date, description, category, amount } = req.body;
    if (validate(res, [
      requireDate(date, "date"),
      requireString(description, "description", { maxLength: 500 }),
      requireString(category, "category", { maxLength: 100 }),
      requireNumber(amount, "amount"),
    ])) return;

    const inserted = await db.one(
      `INSERT INTO transactions (user_id, date, description, category, amount)
            VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id, date, description, amount) DO NOTHING
         RETURNING ${COLUMNS}`,
      [req.user.id, date, description.trim(), category.trim(), amount],
    );

    // Duplicate of an existing transaction — nothing inserted. Return the existing row.
    if (!inserted) {
      const existing = await db.one(
        `SELECT ${COLUMNS}
           FROM transactions
          WHERE user_id = $1 AND date = $2 AND description = $3 AND amount = $4
          LIMIT 1`,
        [req.user.id, date, description.trim(), amount],
      );
      return res.status(200).json(existing);
    }

    res.status(201).json(inserted);
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const { date, description, category, amount } = req.body;
    if (validate(res, [
      requireDate(date, "date"),
      requireString(description, "description", { maxLength: 500 }),
      requireString(category, "category", { maxLength: 100 }),
      requireNumber(amount, "amount"),
    ])) return;

    const data = await db.one(
      `UPDATE transactions
          SET date = $1, description = $2, category = $3, amount = $4
        WHERE transact_id = $5 AND user_id = $6
      RETURNING ${COLUMNS}`,
      [date, description.trim(), category.trim(), amount, req.params.id, req.user.id],
    );

    if (!data) {
      return res.status(404).json({ error: "Transaction not found" });
    }
    res.json(data);
  } catch (err) {
    next(err);
  }
};

exports.bulkUpdate = async (req, res, next) => {
  try {
    const { transactions } = req.body;

    if (!Array.isArray(transactions) || transactions.length === 0) {
      return res.status(400).json({ error: "transactions must be a non-empty array" });
    }
    if (transactions.length > 200) {
      return res.status(400).json({ error: "Maximum 200 transactions per request" });
    }

    const errors = [];
    const validated = [];

    for (let i = 0; i < transactions.length; i++) {
      const { id, date, description, category, amount } = transactions[i];
      if (!id || typeof id !== "string") {
        errors.push({ index: i, errors: ["id is required"] });
        continue;
      }
      const itemErrors = [
        requireDate(date, "date"),
        requireString(description, "description", { maxLength: 500 }),
        requireString(category, "category", { maxLength: 100 }),
        requireNumber(amount, "amount"),
      ].filter(Boolean);

      if (itemErrors.length > 0) {
        errors.push({ index: i, errors: itemErrors });
      } else {
        validated.push({ id, date, description: description.trim(), category: category.trim(), amount });
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({ error: "Validation failed", details: errors });
    }

    const settled = await db.transaction((client) =>
      Promise.all(
        validated.map((t) =>
          client
            .query(
              `UPDATE transactions
                  SET date = $1, description = $2, category = $3, amount = $4
                WHERE transact_id = $5 AND user_id = $6
              RETURNING ${COLUMNS}`,
              [t.date, t.description, t.category, t.amount, t.id, req.user.id],
            )
            .then((r) => ({ data: r.rows[0] ?? null }))
            .catch((error) => ({ error })),
        ),
      ),
    );

    // A row that matched nothing is a failure too — it either does not
    // exist or belongs to someone else.
    const failed = settled
      .map((r, i) =>
        r.error || !r.data
          ? { index: i, id: validated[i].id, error: r.error?.message ?? "Transaction not found" }
          : null,
      )
      .filter(Boolean);

    if (failed.length > 0) {
      return res.status(207).json({
        data: settled.filter((r) => !r.error && r.data).map((r) => r.data),
        errors: failed,
      });
    }

    res.json({ data: settled.map((r) => r.data) });
  } catch (err) {
    next(err);
  }
};

exports.bulkCreate = async (req, res, next) => {
  try {
    const { transactions } = req.body;

    if (!Array.isArray(transactions) || transactions.length === 0) {
      return res.status(400).json({ error: "transactions must be a non-empty array" });
    }
    if (transactions.length > 200) {
      return res.status(400).json({ error: "Maximum 200 transactions per request" });
    }

    const errors = [];
    const rows = [];

    for (let i = 0; i < transactions.length; i++) {
      const { date, description, category, amount } = transactions[i];
      const itemErrors = [
        requireDate(date, "date"),
        requireString(description, "description", { maxLength: 500 }),
        requireString(category, "category", { maxLength: 100 }),
        requireNumber(amount, "amount"),
      ].filter(Boolean);

      if (itemErrors.length > 0) {
        errors.push({ index: i, errors: itemErrors });
      } else {
        rows.push([req.user.id, date, description.trim(), category.trim(), amount]);
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({ error: "Validation failed", details: errors });
    }

    // Build a single multi-row INSERT: ($1,$2,$3,$4,$5), ($6,$7,...), ...
    // The casts are required — inside a bare VALUES list Postgres has no
    // target column to infer parameter types from.
    const params = rows.flat();
    const tuples = rows
      .map(
        (_, i) =>
          `($${i * 5 + 1}::uuid, $${i * 5 + 2}::date, $${i * 5 + 3}::text, $${i * 5 + 4}::text, $${i * 5 + 5}::numeric)`,
      )
      .join(", ");

    // A payload can contain the same transaction twice, which would make
    // one statement hit the same conflict target rows more than once.
    // Dedupe within the statement before inserting.
    const data = await db.rows(
      `INSERT INTO transactions (user_id, date, description, category, amount)
       SELECT DISTINCT ON (user_id, date, description, amount) *
         FROM (VALUES ${tuples}) AS v(user_id, date, description, category, amount)
       ON CONFLICT (user_id, date, description, amount) DO NOTHING
         RETURNING ${COLUMNS}`,
      params,
    );

    res.status(201).json({ data });
  } catch (err) {
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const data = await db.one(
      `DELETE FROM transactions
             WHERE transact_id = $1 AND user_id = $2
         RETURNING transact_id`,
      [req.params.id, req.user.id],
    );

    if (!data) {
      return res.status(404).json({ error: "Transaction not found" });
    }
    res.status(204).end();
  } catch (err) {
    next(err);
  }
};
