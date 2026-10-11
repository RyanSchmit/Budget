const db = require("../config/db");

exports.get = async (req, res, next) => {
  try {
    const row = await db.one(
      `SELECT rules FROM keyword_rules WHERE user_id = $1`,
      [req.user.id],
    );

    // Return null when no row exists — frontend will use defaults
    res.json({ rules: row?.rules ?? null });
  } catch (err) {
    next(err);
  }
};

exports.save = async (req, res, next) => {
  try {
    const { rules } = req.body;
    if (!Array.isArray(rules)) {
      return res.status(400).json({ error: "rules must be an array" });
    }

    await db.query(
      `INSERT INTO keyword_rules (user_id, rules)
            VALUES ($1, $2)
       ON CONFLICT (user_id)
         DO UPDATE SET rules = EXCLUDED.rules`,
      [req.user.id, JSON.stringify(rules)],
    );

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};
