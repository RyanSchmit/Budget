const supabase = require("../config/supabase");
const {
  requireString,
  requireNumber,
  requireDate,
  parsePagination,
  validate,
} = require("../utils/validation");

exports.list = async (req, res, next) => {
  try {
    const { limit, page } = parsePagination(req.query, { defaultLimit: 1000, maxLimit: 1000 });
    const from  = page * limit;
    const to    = from + limit - 1;

    const { data, count, error } = await supabase
      .from("transactions")
      .select("*", { count: "exact" })
      .eq("user_id", req.user.id)
      .order("date", { ascending: false })
      .range(from, to);

    if (error) throw error;
    res.json({ data, count });
  } catch (err) {
    next(err);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .eq("transact_id", req.params.id)
      .eq("user_id", req.user.id)
      .single();

    if (error && error.code === "PGRST116") {
      return res.status(404).json({ error: "Transaction not found" });
    }
    if (error) throw error;
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

    const { data, error } = await supabase
      .from("transactions")
      .insert({ user_id: req.user.id, date, description: description.trim(), category: category.trim(), amount })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
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

    const { data, error } = await supabase
      .from("transactions")
      .update({ date, description: description.trim(), category: category.trim(), amount, updated_at: new Date().toISOString() })
      .eq("transact_id", req.params.id)
      .eq("user_id", req.user.id)
      .select()
      .single();

    if (error && error.code === "PGRST116") {
      return res.status(404).json({ error: "Transaction not found" });
    }
    if (error) throw error;
    res.json(data);
  } catch (err) {
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from("transactions")
      .delete()
      .eq("transact_id", req.params.id)
      .eq("user_id", req.user.id)
      .select()
      .single();

    if (error && error.code === "PGRST116") {
      return res.status(404).json({ error: "Transaction not found" });
    }
    if (error) throw error;
    res.status(204).end();
  } catch (err) {
    next(err);
  }
};
