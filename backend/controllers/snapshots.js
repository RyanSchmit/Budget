const db = require("../config/db");

// The old client embedded child rows as `net_worth_snapshot_accounts`.
// Rebuild that exact shape with a correlated subquery so response
// payloads are unchanged: always an array, ordered by sort_order.
const WITH_ACCOUNTS = `
  SELECT s.*,
         COALESCE((
           SELECT json_agg(a ORDER BY a.sort_order, a.created_at)
             FROM net_worth_snapshot_accounts a
            WHERE a.snapshot_id = s.id
         ), '[]'::json) AS net_worth_snapshot_accounts
    FROM net_worth_snapshots s
`;

exports.list = async (req, res, next) => {
  try {
    const data = await db.rows(
      `${WITH_ACCOUNTS} WHERE s.user_id = $1 ORDER BY s.snapshot_date DESC`,
      [req.user.id],
    );
    res.json(data);
  } catch (err) {
    next(err);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const data = await db.one(
      `${WITH_ACCOUNTS} WHERE s.id = $1 AND s.user_id = $2`,
      [req.params.id, req.user.id],
    );

    if (!data) {
      return res.status(404).json({ error: "Snapshot not found" });
    }
    res.json(data);
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const { snapshot_date, accounts } = req.body;
    if (!snapshot_date || !Array.isArray(accounts) || accounts.length === 0) {
      return res.status(400).json({ error: "snapshot_date and a non-empty accounts array are required" });
    }

    // The snapshot upsert, the wipe of its old accounts, and the insert of
    // the new ones have to be one unit — a failure partway through used to
    // leave a snapshot with no accounts at all.
    const result = await db.transaction(async (client) => {
      // Upsert the snapshot row — if one already exists for this user+date, update it
      const { rows: snapRows } = await client.query(
        `INSERT INTO net_worth_snapshots (user_id, snapshot_date)
              VALUES ($1, $2)
         ON CONFLICT (user_id, snapshot_date)
           DO UPDATE SET updated_at = now()
           RETURNING *`,
        [req.user.id, snapshot_date],
      );
      const snapshot = snapRows[0];

      // Replace all accounts for this snapshot
      await client.query(
        `DELETE FROM net_worth_snapshot_accounts WHERE snapshot_id = $1 AND user_id = $2`,
        [snapshot.id, req.user.id],
      );

      const params = [];
      const tuples = accounts.map((a, i) => {
        params.push(
          snapshot.id,
          req.user.id,
          a.account_key,
          a.account_name,
          a.amount,
          a.account_type,
          a.sort_order ?? 0,
        );
        const p = i * 7;
        return `($${p + 1}, $${p + 2}, $${p + 3}, $${p + 4}, $${p + 5}, $${p + 6}, $${p + 7})`;
      });

      const { rows: insertedAccounts } = await client.query(
        `INSERT INTO net_worth_snapshot_accounts
                (snapshot_id, user_id, account_key, account_name, amount, account_type, sort_order)
          VALUES ${tuples.join(", ")}
        RETURNING *`,
        params,
      );

      return { ...snapshot, net_worth_snapshot_accounts: insertedAccounts };
    });

    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const { snapshot_date } = req.body;

    const updated = await db.one(
      `UPDATE net_worth_snapshots
          SET snapshot_date = $1
        WHERE id = $2 AND user_id = $3
      RETURNING id`,
      [snapshot_date, req.params.id, req.user.id],
    );

    if (!updated) {
      return res.status(404).json({ error: "Snapshot not found" });
    }

    // Re-read so the response keeps its embedded accounts array
    const data = await db.one(`${WITH_ACCOUNTS} WHERE s.id = $1`, [updated.id]);
    res.json(data);
  } catch (err) {
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    // Child accounts go with it via ON DELETE CASCADE
    const data = await db.one(
      `DELETE FROM net_worth_snapshots WHERE id = $1 AND user_id = $2 RETURNING id`,
      [req.params.id, req.user.id],
    );

    if (!data) {
      return res.status(404).json({ error: "Snapshot not found" });
    }
    res.status(204).end();
  } catch (err) {
    next(err);
  }
};
