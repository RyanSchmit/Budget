const supabase = require("../config/supabase");

const DEFAULT_PREFERENCES = {
  allow_ai_data_access: true,
  allow_ai_categorization: true,
  enable_ai_advisor: true,
};

// ------------------------------------------------------------------
// Helper: fetch preferences, inserting defaults if no row exists yet
// ------------------------------------------------------------------
async function getOrCreatePreferences(userId) {
  const { data, error } = await supabase
    .from("user_ai_preferences")
    .select("allow_ai_data_access, allow_ai_categorization, enable_ai_advisor, updated_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;

  if (data) return data;

  const { data: inserted, error: insertErr } = await supabase
    .from("user_ai_preferences")
    .insert({ user_id: userId, ...DEFAULT_PREFERENCES })
    .select("allow_ai_data_access, allow_ai_categorization, enable_ai_advisor, updated_at")
    .single();

  if (insertErr) throw insertErr;
  return inserted;
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
    const allowed = {};
    const fields = ["allow_ai_data_access", "allow_ai_categorization", "enable_ai_advisor"];

    for (const field of fields) {
      if (req.body[field] !== undefined) {
        if (typeof req.body[field] !== "boolean") {
          return res.status(400).json({ error: `${field} must be a boolean` });
        }
        allowed[field] = req.body[field];
      }
    }

    if (Object.keys(allowed).length === 0) {
      return res.status(400).json({ error: "No valid preference fields provided" });
    }

    const { data, error } = await supabase
      .from("user_ai_preferences")
      .upsert(
        { user_id: req.user.id, ...DEFAULT_PREFERENCES, ...allowed },
        { onConflict: "user_id" },
      )
      .select("allow_ai_data_access, allow_ai_categorization, enable_ai_advisor, updated_at")
      .single();

    if (error) throw error;

    res.json({ preferences: data });
  } catch (err) {
    next(err);
  }
}

module.exports = { getProfile, updatePreferences };
