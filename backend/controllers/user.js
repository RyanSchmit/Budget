const db = require("../config/db");

const PREFERENCE_FIELDS = [
  "allow_ai_data_access",
  "allow_ai_categorization",
  "enable_ai_advisor",
];

const RETURNED = `${PREFERENCE_FIELDS.join(", ")}, updated_at`;

// ------------------------------------------------------------------
// Helper: fetch preferences, inserting defaults if no row exists yet
// ------------------------------------------------------------------
async function getOrCreatePreferences(userId) {
  const existing = await db.one(
    `SELECT ${RETURNED} FROM user_ai_preferences WHERE user_id = $1`,
    [userId],
  );

  if (existing) return existing;

  // Column defaults are the opt-out defaults (all TRUE). DO UPDATE rather
  // than DO NOTHING so a concurrent insert still returns a row.
  return db.one(
    `INSERT INTO user_ai_preferences (user_id)
          VALUES ($1)
     ON CONFLICT (user_id) DO UPDATE SET user_id = EXCLUDED.user_id
       RETURNING ${RETURNED}`,
    [userId],
  );
}

// ------------------------------------------------------------------
// GET /api/user/profile
// Returns the current user's basic info and AI preferences.
// ------------------------------------------------------------------
async function getProfile(req, res, next) {
  try {
    const preferences = await getOrCreatePreferences(req.user.id);

    res.json({
      user: {
        id: req.user.id,
        email: req.user.email,
      },
      preferences,
    });
  } catch (err) {
    next(err);
  }
}

// ------------------------------------------------------------------
// PATCH /api/user/preferences
// Accepts a partial or full preferences payload and upserts.
// ------------------------------------------------------------------
async function updatePreferences(req, res, next) {
  try {
    const provided = [];

    for (const field of PREFERENCE_FIELDS) {
      if (req.body[field] !== undefined) {
        if (typeof req.body[field] !== "boolean") {
          return res.status(400).json({ error: `${field} must be a boolean` });
        }
        provided.push(field);
      }
    }

    if (provided.length === 0) {
      return res.status(400).json({ error: "No valid preference fields provided" });
    }

    // Only the supplied fields are written. Fields left out keep their
    // stored value on update, and fall back to the column default on insert.
    const columns = provided.join(", ");
    const placeholders = provided.map((_, i) => `$${i + 2}`).join(", ");
    const assignments = provided.map((f) => `${f} = EXCLUDED.${f}`).join(", ");

    const preferences = await db.one(
      `INSERT INTO user_ai_preferences (user_id, ${columns})
            VALUES ($1, ${placeholders})
       ON CONFLICT (user_id) DO UPDATE SET ${assignments}
         RETURNING ${RETURNED}`,
      [req.user.id, ...provided.map((f) => req.body[f])],
    );

    res.json({ preferences });
  } catch (err) {
    next(err);
  }
}

module.exports = { getProfile, updatePreferences };
