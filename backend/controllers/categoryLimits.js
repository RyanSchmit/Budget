const db = require("../config/db");
const { requireString, requireNumber, validate } = require("../utils/validation");

function toLimit(row) {
  return {
    id: row.id,
    categoryName: row.category_name,
    monthlyLimit: Number(row.monthly_limit),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

exports.list = async (req, res, next) => {
  try {
    const rows = await db.rows(
      `SELECT * FROM category_limits WHERE user_id = $1 ORDER BY category_name ASC`,
      [req.user.id],
    );
    res.json(rows.map(toLimit));
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const { categoryName, monthlyLimit } = req.body;
    if (validate(res, [
      requireString(categoryName, "categoryName", { maxLength: 100 }),
      requireNumber(monthlyLimit, "monthlyLimit", { min: 0 }),
    ])) return;

    const row = await db.one(
      `INSERT INTO category_limits (user_id, category_name, monthly_limit)
            VALUES ($1, $2, $3)
         RETURNING *`,
      [req.user.id, categoryName.trim(), monthlyLimit],
    );

    res.status(201).json(toLimit(row));
  } catch (err) {
    // UNIQUE (user_id, category_name)
    if (err.code === "23505") {
      return res.status(409).json({ error: "A limit for that category already exists" });
    }
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const { monthlyLimit } = req.body;
    if (validate(res, [
      requireNumber(monthlyLimit, "monthlyLimit", { min: 0 }),
    ])) return;

    const row = await db.one(
      `UPDATE category_limits
          SET monthly_limit = $1
        WHERE id = $2 AND user_id = $3
      RETURNING *`,
      [monthlyLimit, req.params.id, req.user.id],
    );

    if (!row) {
      return res.status(404).json({ error: "Category limit not found" });
    }
    res.json(toLimit(row));
  } catch (err) {
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const row = await db.one(
      `DELETE FROM category_limits WHERE id = $1 AND user_id = $2 RETURNING id`,
      [req.params.id, req.user.id],
    );

    if (!row) {
      return res.status(404).json({ error: "Category limit not found" });
    }
    res.status(204).end();
  } catch (err) {
    next(err);
  }
};
