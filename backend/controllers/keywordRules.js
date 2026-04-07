const supabase = require("../config/supabase");

exports.get = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from("keyword_rules")
      .select("rules")
      .eq("user_id", req.user.id)
      .maybeSingle();

    if (error) throw error;
    // Return null when no row exists — frontend will use defaults
    res.json({ rules: data?.rules ?? null });
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

    const { error } = await supabase
      .from("keyword_rules")
      .upsert(
        { user_id: req.user.id, rules },
        { onConflict: "user_id" },
      );

    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};
