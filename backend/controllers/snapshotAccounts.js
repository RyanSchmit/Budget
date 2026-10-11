const db = require("../config/db");
const {
  requireString,
  requireNumber,
  optionalNumber,
  requireEnum,
  validate,
} = require("../utils/validation");

const VALID_ACCOUNT_TYPES = ["asset", "liability"];

exports.list = async (req, res, next) => {
  try {
    const data = await db.rows(
      `SELECT * FROM net_worth_snapshot_accounts
        WHERE snapshot_id = $1 AND user_id = $2
        ORDER BY sort_order ASC`,
      [req.params.snapshotId, req.user.id],
    );
    res.json(data);
  } catch (err) {
    next(err);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const data = await db.one(
      `SELECT * FROM net_worth_snapshot_accounts
        WHERE id = $1 AND snapshot_id = $2 AND user_id = $3`,
      [req.params.id, req.params.snapshotId, req.user.id],
    );

    if (!data) {
      return res.status(404).json({ error: "Account entry not found" });
    }
    res.json(data);
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const { account_key, account_name, amount, account_type, sort_order } = req.body;
    if (validate(res, [
      requireString(account_key, "account_key", { maxLength: 200 }),
      requireString(account_name, "account_name", { maxLength: 200 }),
      requireNumber(amount, "amount"),
      requireEnum(account_type, "account_type", VALID_ACCOUNT_TYPES),
      optionalNumber(sort_order, "sort_order", { min: 0 }),
    ])) return;

    const data = await db.one(
      `INSERT INTO net_worth_snapshot_accounts
              (snapshot_id, user_id, account_key, account_name, amount, account_type, sort_order)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        req.params.snapshotId,
        req.user.id,
        account_key.trim(),
        account_name.trim(),
        amount,
        account_type,
        sort_order ?? 0,
      ],
    );

    res.status(201).json(data);
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const { account_key, account_name, amount, account_type, sort_order } = req.body;
    if (validate(res, [
      requireString(account_key, "account_key", { maxLength: 200 }),
      requireString(account_name, "account_name", { maxLength: 200 }),
      requireNumber(amount, "amount"),
      requireEnum(account_type, "account_type", VALID_ACCOUNT_TYPES),
      optionalNumber(sort_order, "sort_order", { min: 0 }),
    ])) return;

    const data = await db.one(
      `UPDATE net_worth_snapshot_accounts
          SET account_key = $1, account_name = $2, amount = $3, account_type = $4,
              sort_order = COALESCE($5, sort_order)
        WHERE id = $6 AND snapshot_id = $7 AND user_id = $8
      RETURNING *`,
      [
        account_key.trim(),
        account_name.trim(),
        amount,
        account_type,
        sort_order ?? null,
        req.params.id,
        req.params.snapshotId,
        req.user.id,
      ],
    );

    if (!data) {
      return res.status(404).json({ error: "Account entry not found" });
    }
    res.json(data);
  } catch (err) {
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const data = await db.one(
      `DELETE FROM net_worth_snapshot_accounts
             WHERE id = $1 AND snapshot_id = $2 AND user_id = $3
         RETURNING id`,
      [req.params.id, req.params.snapshotId, req.user.id],
    );

    if (!data) {
      return res.status(404).json({ error: "Account entry not found" });
    }
    res.status(204).end();
  } catch (err) {
    next(err);
  }
};
